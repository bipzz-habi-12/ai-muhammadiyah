import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import { loadConversationMessagesForGenerate } from "@/lib/ai/context";
import {
  createTaskList,
  listTaskLists,
  parseExtractedTasks,
  TASK_EXTRACTOR_SYSTEM_PROMPT,
  updateTaskList,
  type TaskItem,
} from "@/lib/tasks";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  estimateTokenUsage,
  getLimitErrorMessage,
  normalizeUsageSnapshot,
} from "@/lib/usage/limits";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const body = (await request.json()) as {
      workspaceId?: string;
      conversationId?: string;
    };

    if (!body.workspaceId || !body.conversationId) {
      return NextResponse.json(
        { error: "workspace_id dan conversation_id wajib diisi." },
        { status: 400 },
      );
    }

    const messages = await loadConversationMessagesForGenerate(
      supabase,
      body.conversationId,
    );

    if (!messages.length) {
      return NextResponse.json(
        { error: "Percakapan ini belum punya isi untuk digenerate." },
        { status: 400 },
      );
    }

    const estimatedInputTokens = estimateTokenUsage(
      messages.map((message) => message.text).join(" "),
    );
    const { data: limitCheck, error: limitError } = await supabase.rpc(
      "check_usage_limits",
      {
        p_action: "message",
        p_model_used: "auto",
        p_estimated_tokens: estimatedInputTokens,
      },
    );

    if (limitError) {
      console.error("Tasks generate usage limit check failed:", limitError);

      return NextResponse.json(
        { error: "Limit penggunaan belum bisa dicek." },
        { status: 500 },
      );
    }

    const canUse = Boolean(limitCheck?.allowed);
    const usageSnapshot = normalizeUsageSnapshot(limitCheck);

    if (!canUse) {
      return NextResponse.json(
        { error: getLimitErrorMessage(limitCheck?.reason) },
        { status: 429 },
      );
    }

    // remainingMessagesToday is the exact number of task-items we can afford
    // to create — quota is spent per task actually created, not per click.
    const availableSlots = usageSnapshot?.remainingMessagesToday ?? 0;

    const result = await generateChatReply(
      messages,
      "",
      "auto",
      TASK_EXTRACTOR_SYSTEM_PROMPT,
      usageSnapshot
        ? { tier: usageSnapshot.tier, allowedModels: usageSnapshot.allowedModels }
        : undefined,
    );

    const extracted = parseExtractedTasks(result.reply);

    if (extracted === null) {
      console.error("Tasks generate: failed to parse AI output:", result.reply);

      return NextResponse.json(
        { error: "Gagal memproses hasil AI, coba lagi." },
        { status: 500 },
      );
    }

    const itemsToCreate: TaskItem[] = extracted
      .slice(0, availableSlots)
      .map((item) => ({
        id: crypto.randomUUID(),
        title: item.title,
        description: item.description,
        status: "todo",
      }));
    const skipped = extracted.length - itemsToCreate.length;

    // Single-list-per-workspace model (v1): reuse the workspace's existing
    // list if one exists, appending generated items, rather than spawning a
    // new list row on every generate click.
    const existingLists = await listTaskLists(supabase, body.workspaceId);
    const existingList = existingLists[0];

    let list;

    if (itemsToCreate.length === 0) {
      list = existingList ?? null;
    } else if (existingList) {
      list = await updateTaskList(supabase, existingList.id, {
        items: [...existingList.items, ...itemsToCreate],
      });
    } else {
      list = await createTaskList(supabase, {
        workspaceId: body.workspaceId,
        title: "To-do",
        items: itemsToCreate,
        sourceRef: body.conversationId,
      });
    }

    for (let index = 0; index < itemsToCreate.length; index += 1) {
      const { error: usageError } = await supabase.rpc("increment_usage", {
        p_action: "message",
        p_model_used: "auto",
        p_document_count: 0,
        p_estimated_tokens: estimateTokenUsage(itemsToCreate[index].title),
        p_metadata: {
          source: "tasks_generate",
          conversation_id: body.conversationId,
          provider_used: result.provider,
          model_used: result.model,
        },
        p_user_id: user.id,
      });

      if (usageError) {
        console.error("Tasks generate usage increment failed:", usageError);
      }
    }

    return NextResponse.json(
      { list, createdCount: itemsToCreate.length, skipped },
      { status: 201 },
    );
  } catch (error) {
    console.error("Tasks generate failed:", error);

    return NextResponse.json(
      { error: "Tasks belum bisa digenerate." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import {
  createDoc,
  DOC_AUTHOR_SYSTEM_PROMPT,
  loadConversationMessagesForGenerate,
} from "@/lib/docs";
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
      console.error("Docs generate usage limit check failed:", limitError);

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

    const result = await generateChatReply(
      messages,
      "",
      "auto",
      DOC_AUTHOR_SYSTEM_PROMPT,
      usageSnapshot
        ? { tier: usageSnapshot.tier, allowedModels: usageSnapshot.allowedModels }
        : undefined,
    );

    const estimatedTotalTokens = estimateTokenUsage(
      messages.map((message) => message.text).join(" "),
      result.reply,
    );
    const { error: usageError } = await supabase.rpc("increment_usage", {
      p_action: "message",
      p_model_used: "auto",
      p_document_count: 0,
      p_estimated_tokens: estimatedTotalTokens,
      p_metadata: {
        source: "docs_generate",
        conversation_id: body.conversationId,
        provider_used: result.provider,
        model_used: result.model,
      },
      p_user_id: user.id,
    });

    if (usageError) {
      console.error("Docs generate usage increment failed:", usageError);
    }

    const firstHeadingMatch = result.reply.match(/^#\s+(.+)$/m);
    const title = firstHeadingMatch?.[1]?.trim() || "Dokumen dari chat";

    const doc = await createDoc(supabase, {
      workspaceId: body.workspaceId,
      title,
      content: result.reply,
      sourceRef: body.conversationId,
    });

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error) {
    console.error("Doc generate failed:", error);

    return NextResponse.json(
      { error: "Dokumen belum bisa digenerate." },
      { status: 500 },
    );
  }
}

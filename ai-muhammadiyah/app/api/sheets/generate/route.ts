import { NextResponse } from "next/server";
import { generateChatReply } from "@/lib/ai/chat";
import { loadConversationMessagesForGenerate } from "@/lib/ai/context";
import {
  createSheet,
  parseGeneratedSheet,
  SHEET_EXTRACTOR_SYSTEM_PROMPT,
} from "@/lib/sheets";
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
      console.error("Sheets generate usage limit check failed:", limitError);

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
      SHEET_EXTRACTOR_SYSTEM_PROMPT,
      usageSnapshot
        ? { tier: usageSnapshot.tier, allowedModels: usageSnapshot.allowedModels }
        : undefined,
    );

    const generated = parseGeneratedSheet(result.reply);

    if (generated === null) {
      console.error("Sheets generate: failed to parse AI output:", result.reply);

      return NextResponse.json(
        { error: "Gagal memproses hasil AI, coba lagi." },
        { status: 500 },
      );
    }

    // Flat quota consumption — one generate click = one sheet artifact,
    // unlike Tasks which spends quota per extracted item.
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
        source: "sheets_generate",
        conversation_id: body.conversationId,
        provider_used: result.provider,
        model_used: result.model,
      },
      p_user_id: user.id,
    });

    if (usageError) {
      console.error("Sheets generate usage increment failed:", usageError);
    }

    const sheet = await createSheet(supabase, {
      workspaceId: body.workspaceId,
      title: generated.title,
      columns: generated.columns,
      rows: generated.rows,
      sourceRef: body.conversationId,
    });

    return NextResponse.json(
      { sheet, truncated: generated.truncated },
      { status: 201 },
    );
  } catch (error) {
    console.error("Sheet generate failed:", error);

    return NextResponse.json(
      { error: "Sheet belum bisa digenerate." },
      { status: 500 },
    );
  }
}

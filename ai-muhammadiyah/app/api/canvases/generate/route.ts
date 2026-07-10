import { NextResponse } from "next/server";
import { generateChatReply, isAiUnavailableFallback } from "@/lib/ai/chat";
import { loadConversationMessagesForGenerate } from "@/lib/ai/context";
import {
  CANVAS_EXTRACTOR_SYSTEM_PROMPT,
  createCanvas,
  parseGeneratedCanvas,
  type CanvasEdge,
  type CanvasNode,
} from "@/lib/canvas";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  estimateTokenUsage,
  getLimitErrorMessage,
  normalizeUsageSnapshot,
} from "@/lib/usage/limits";

const gridColumns = 5;
const gridSpacingX = 200;
const gridSpacingY = 120;

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
      console.error("Canvas generate usage limit check failed:", limitError);

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

    // "smart" (not "auto") so this deterministically tries OpenAI GPT first
    // (for tiers with premium smart access) then Gemini, never landing on
    // the free/less-reliable OpenRouter route by heuristic accident — same
    // reasoning as Sheets' generate route (see app/api/sheets/generate).
    const result = await generateChatReply(
      messages,
      "",
      "smart",
      CANVAS_EXTRACTOR_SYSTEM_PROMPT,
      usageSnapshot
        ? { tier: usageSnapshot.tier, allowedModels: usageSnapshot.allowedModels }
        : undefined,
    );

    // generateChatReply() can "succeed" (no throw) with a canned apology
    // instead of real content when every AI provider is rate-limited/down,
    // and Canvas generation needs Gemini/GPT specifically — same checks as
    // Sheets' generate route, see the comment there for the full story.
    if (isAiUnavailableFallback(result.reply) || result.provider === "openrouter") {
      console.error("Canvas generate: AI provider unavailable or non-Gemini/GPT:", {
        provider: result.provider,
        reply: result.reply,
      });

      return NextResponse.json(
        { error: "Model AI (Gemini/GPT) sedang penuh atau tidak tersedia, coba lagi sebentar lagi." },
        { status: 503 },
      );
    }

    const generated = parseGeneratedCanvas(result.reply);

    if (generated === null) {
      console.error("Canvas generate: failed to parse AI output:", result.reply);

      return NextResponse.json(
        { error: "Gagal memproses hasil AI, coba lagi." },
        { status: 500 },
      );
    }

    // AI output is index-based ({sourceIndex, targetIndex}) since it can't
    // know the real ids that will be generated — assign real ids + a
    // deterministic grid layout (no auto-layout algorithm, per product
    // decision) now that we're creating the actual rows.
    const nodes: CanvasNode[] = generated.nodes.map((node, index) => ({
      id: crypto.randomUUID(),
      position: {
        x: (index % gridColumns) * gridSpacingX,
        y: Math.floor(index / gridColumns) * gridSpacingY,
      },
      label: node.label,
      shape: node.shape,
    }));

    const edges: CanvasEdge[] = generated.edges.map((edge) => ({
      id: crypto.randomUUID(),
      source: nodes[edge.sourceIndex].id,
      target: nodes[edge.targetIndex].id,
      label: edge.label,
    }));

    // Flat quota consumption — one generate click = one canvas artifact,
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
        source: "canvas_generate",
        conversation_id: body.conversationId,
        provider_used: result.provider,
        model_used: result.model,
      },
      p_user_id: user.id,
    });

    if (usageError) {
      console.error("Canvas generate usage increment failed:", usageError);
    }

    const canvas = await createCanvas(supabase, {
      workspaceId: body.workspaceId,
      title: generated.title,
      nodes,
      edges,
      sourceRef: body.conversationId,
    });

    return NextResponse.json(
      { canvas, truncated: generated.truncated },
      { status: 201 },
    );
  } catch (error) {
    console.error("Canvas generate failed:", error);

    return NextResponse.json(
      { error: "Canvas belum bisa digenerate." },
      { status: 500 },
    );
  }
}

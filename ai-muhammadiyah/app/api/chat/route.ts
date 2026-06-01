import { NextResponse } from "next/server";
import { streamChatReply, type ChatMessage } from "@/lib/ai/chat";
import {
  createKnowledgePromptContext,
  retrieveKnowledgeChunks,
} from "@/lib/knowledge";
import { loadUserMemory } from "@/lib/memory/user-memory";
import {
  canUseStudyMode,
  normalizeStudyMode,
} from "@/lib/study-modes";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  estimateTokenUsage,
  getLimitErrorMessage,
  normalizeUsageSnapshot,
} from "@/lib/usage/limits";

type ChatRequestBody = {
  history?: ChatMessage[];
  messages?: ChatMessage[];
  pdfContext?: string;
  selectedModel?: string;
  selectedStudyMode?: string;
};

const maxRecentChatMessages = 10;
const maxMessageTextLength = 2000;

function isChatMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as ChatMessage;

  return (
    (candidate.role === "user" || candidate.role === "ai") &&
    typeof candidate.text === "string"
  );
}

function truncateMessageText(text: string) {
  const trimmedText = text.trim();

  if (trimmedText.length <= maxMessageTextLength) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, maxMessageTextLength)}\n[Pesan dipotong agar memori chat tetap ringan.]`;
}

function createSafeHistory(history: ChatMessage[]) {
  // The browser already limits memory, but the API repeats the limit for safety.
  return history
    .filter((message) => message.text.trim())
    .slice(-maxRecentChatMessages)
    .map((message) => ({
      role: message.role,
      text: truncateMessageText(message.text),
    }));
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const body = (await request.json()) as ChatRequestBody;
    const rawHistory = body.history ?? body.messages ?? [];
    const pdfContext = body.pdfContext ?? "";
    const selectedModel = body.selectedModel ?? "auto";
    const selectedStudyMode = body.selectedStudyMode ?? "";

    if (!Array.isArray(rawHistory) || !rawHistory.every(isChatMessage)) {
      return NextResponse.json(
        { error: "Format riwayat chat tidak valid." },
        { status: 400 },
      );
    }

    if (typeof pdfContext !== "string") {
      return NextResponse.json(
        { error: "Konteks dokumen tidak valid." },
        { status: 400 },
      );
    }

    if (typeof selectedModel !== "string") {
      return NextResponse.json(
        { error: "Pilihan model tidak valid." },
        { status: 400 },
      );
    }

    if (typeof selectedStudyMode !== "string") {
      return NextResponse.json(
        { error: "Pilihan study mode tidak valid." },
        { status: 400 },
      );
    }

    const safeHistory = createSafeHistory(rawHistory);
    const latestUserMessage =
      safeHistory.findLast((message) => message.role === "user")?.text ?? "";
    const estimatedInputTokens = estimateTokenUsage(
      latestUserMessage,
      pdfContext,
    );
    const { data: limitCheck, error: limitError } = await supabase.rpc(
      "check_usage_limits",
      {
        p_action: "message",
        p_model_used: selectedModel,
        p_estimated_tokens: estimatedInputTokens,
      },
    );

    if (limitError) {
      console.error("Usage limit check failed:", limitError);

      return NextResponse.json(
        { error: "Limit penggunaan belum bisa dicek." },
        { status: 500 },
      );
    }

    const canUse = Boolean(limitCheck?.allowed);
    const usageSnapshot = normalizeUsageSnapshot(limitCheck);
    const normalizedStudyMode = normalizeStudyMode(selectedStudyMode);

    if (!canUse) {
      return NextResponse.json(
        { error: getLimitErrorMessage(limitCheck?.reason) },
        { status: 429 },
      );
    }

    if (!canUseStudyMode(normalizedStudyMode, usageSnapshot?.tier)) {
      return NextResponse.json(
        {
          error:
            "Study mode ini memerlukan paket Premium. Paket Free dapat memakai Quick Explain dan Cambridge Tutor Basic.",
        },
        { status: 403 },
      );
    }

    const userMemory = await loadUserMemory(supabase, user.id).catch((error) => {
      console.error("User memory load failed:", error);
      return null;
    });
    const knowledgeChunks = await retrieveKnowledgeChunks(
      supabase,
      latestUserMessage,
    ).catch((error) => {
      console.error("Knowledge retrieval failed:", error);
      return [];
    });
    const knowledgeContext = createKnowledgePromptContext(knowledgeChunks);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let streamedReply = "";

        try {
          const chatResult = await streamChatReply(
            safeHistory,
            pdfContext,
            selectedModel,
            normalizedStudyMode,
            (chunk) => {
              streamedReply += chunk;
              controller.enqueue(encoder.encode(chunk));
            },
            usageSnapshot
              ? {
                  tier: usageSnapshot.tier,
                  allowedModels: usageSnapshot.allowedModels,
                }
              : undefined,
            userMemory ?? undefined,
            {
              knowledgeContext,
            },
          );

          const finalReply = chatResult.reply || streamedReply;
          const estimatedTotalTokens = estimateTokenUsage(
            latestUserMessage,
            pdfContext,
            finalReply,
          );
          const { data: usageData, error: usageError } = await supabase.rpc(
            "increment_usage",
            {
              p_action: "message",
              p_model_used: selectedModel,
              p_document_count: 0,
              p_estimated_tokens: estimatedTotalTokens,
              p_metadata: {
                has_document_context: Boolean(pdfContext.trim()),
                has_knowledge_context: Boolean(knowledgeContext),
                knowledge_sources: knowledgeChunks.map((chunk) => ({
                  source_id: chunk.sourceId,
                  title: chunk.sourceTitle,
                  chunk: chunk.chunkOrder + 1,
                })),
                has_user_memory: Boolean(userMemory),
                provider_used: chatResult.provider,
                model_used: chatResult.model,
                study_mode: normalizedStudyMode,
                fallback_event: chatResult.fallbackEvent ?? null,
                finish_reason: chatResult.finishReason ?? null,
                needs_continuation: Boolean(chatResult.needsContinuation),
                streamed_reply_length: finalReply.length,
              },
              p_user_id: user.id,
            },
          );

          if (usageError) {
            console.error("Chat usage increment failed:", {
              userId: user.id,
              selectedModel,
              providerUsed: chatResult.provider,
              modelUsed: chatResult.model,
              fallbackEvent: chatResult.fallbackEvent,
              finishReason: chatResult.finishReason,
              needsContinuation: chatResult.needsContinuation,
              estimatedTotalTokens,
              error: usageError,
            });
          } else {
            console.info("Chat usage increment succeeded:", {
              userId: user.id,
              selectedModel,
              providerUsed: chatResult.provider,
              modelUsed: chatResult.model,
              fallbackEvent: chatResult.fallbackEvent,
              finishReason: chatResult.finishReason,
              needsContinuation: chatResult.needsContinuation,
              estimatedTotalTokens,
              usage: usageData,
            });
          }
        } catch (error) {
          console.error("AI chat stream failed:", error);
          controller.enqueue(
            encoder.encode(
              "Maaf, chat AI sedang bermasalah. Silakan coba lagi.",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI chat sedang bermasalah. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

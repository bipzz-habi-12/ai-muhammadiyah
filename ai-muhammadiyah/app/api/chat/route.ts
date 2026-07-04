import { NextResponse } from "next/server";
import {
  streamChatReply,
  type ChatMessage,
  type DocumentContext,
  type ImageContext,
} from "@/lib/ai/chat";
import {
  createKnowledgePromptContext,
  retrieveKnowledgeChunks,
} from "@/lib/knowledge";
import { loadUserMemory } from "@/lib/memory/user-memory";
import {
  canAccessTier,
  fetchSkills,
  getSkillSystemPrompt,
  resolveAllowedSkill,
} from "@/lib/skills";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  estimateTokenUsage,
  getLimitErrorMessage,
  normalizeUsageSnapshot,
} from "@/lib/usage/limits";

type ChatRequestBody = {
  history?: ChatMessage[];
  messages?: ChatMessage[];
  internalInstruction?: string;
  pdfContext?: string;
  documentContexts?: DocumentContext[];
  imageContexts?: ImageContext[];
  selectedModel?: string;
  skillId?: string;
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

function isDocumentContext(context: unknown): context is DocumentContext {
  if (!context || typeof context !== "object") {
    return false;
  }

  const candidate = context as DocumentContext;

  return (
    typeof candidate.fileName === "string" &&
    typeof candidate.fileType === "string" &&
    typeof candidate.text === "string"
  );
}

function isImageContext(context: unknown): context is ImageContext {
  if (!context || typeof context !== "object") {
    return false;
  }

  const candidate = context as ImageContext;

  return (
    typeof candidate.fileName === "string" &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.data === "string" &&
    candidate.data.length <= 18_000_000
  );
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
    const internalInstruction = body.internalInstruction ?? "";
    const pdfContext = body.pdfContext ?? "";
    const documentContexts = body.documentContexts ?? [];
    const imageContexts = body.imageContexts ?? [];
    const selectedModel = body.selectedModel ?? "auto";
    const skillId = body.skillId ?? "";

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

    if (typeof internalInstruction !== "string") {
      return NextResponse.json(
        { error: "Instruksi internal tidak valid." },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(documentContexts) ||
      !documentContexts.every(isDocumentContext)
    ) {
      return NextResponse.json(
        { error: "Konteks multi-dokumen tidak valid." },
        { status: 400 },
      );
    }

    if (!Array.isArray(imageContexts) || !imageContexts.every(isImageContext)) {
      return NextResponse.json(
        { error: "Konteks gambar tidak valid." },
        { status: 400 },
      );
    }

    if (typeof selectedModel !== "string") {
      return NextResponse.json(
        { error: "Pilihan model tidak valid." },
        { status: 400 },
      );
    }

    if (typeof skillId !== "string") {
      return NextResponse.json(
        { error: "Pilihan skill tidak valid." },
        { status: 400 },
      );
    }

    const safeHistory = createSafeHistory(
      internalInstruction.trim()
        ? [
            ...rawHistory,
            {
              role: "user",
              text: internalInstruction.trim(),
            },
          ]
        : rawHistory,
    );
    const latestUserMessage =
      safeHistory.findLast((message) => message.role === "user")?.text ?? "";
    const combinedDocumentContext = [
      pdfContext,
      ...documentContexts.map(
        (document) =>
          `${document.fileName} (${document.fileType})\n${document.text}`,
      ),
    ].filter((context) => context.trim()).join("\n\n---\n\n");
    const estimatedInputTokens = estimateTokenUsage(
      latestUserMessage,
      combinedDocumentContext,
      imageContexts.map((image) => image.fileName).join(" "),
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

    if (!canUse) {
      return NextResponse.json(
        { error: getLimitErrorMessage(limitCheck?.reason) },
        { status: 429 },
      );
    }

    const skills = await fetchSkills(supabase, user.id).catch((error) => {
      console.error("Skills load failed:", error);
      return [];
    });
    const requestedSkill = skillId
      ? skills.find((skill) => skill.id === skillId)
      : undefined;

    if (skillId && !requestedSkill) {
      return NextResponse.json(
        { error: "Skill tidak ditemukan." },
        { status: 400 },
      );
    }

    if (
      requestedSkill &&
      !canAccessTier(usageSnapshot?.tier, requestedSkill.minTier)
    ) {
      return NextResponse.json(
        { error: "Skill ini memerlukan paket Premium." },
        { status: 403 },
      );
    }

    const activeSkill =
      requestedSkill ?? resolveAllowedSkill(null, usageSnapshot?.tier, skills);

    if (!activeSkill) {
      return NextResponse.json(
        { error: "Skill belum tersedia. Coba lagi sebentar." },
        { status: 503 },
      );
    }

    const systemPrompt = getSkillSystemPrompt(activeSkill, usageSnapshot?.tier);

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
        let isClosed = false;
        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch {
              // The browser may already have cancelled the stream.
            }
          }
        };
        const abortStream = () => {
          closeStream();
        };
        const enqueueText = (text: string) => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(text));
          }
        };

        request.signal.addEventListener("abort", abortStream, { once: true });

        try {
          const chatResult = await streamChatReply(
            safeHistory,
            pdfContext,
            selectedModel,
            systemPrompt,
            (chunk) => {
              if (request.signal.aborted) {
                return;
              }

              streamedReply += chunk;
              enqueueText(chunk);
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
              documentContexts,
              imageContexts,
            },
          );

          const finalReply = chatResult.reply || streamedReply;
          const estimatedTotalTokens = estimateTokenUsage(
            latestUserMessage,
            combinedDocumentContext,
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
                has_document_context: Boolean(combinedDocumentContext.trim()),
                document_count: documentContexts.length,
                image_count: imageContexts.length,
                has_image_context: imageContexts.length > 0,
                uploaded_documents: documentContexts.map((document) => ({
                  file_name: document.fileName,
                  file_type: document.fileType,
                  text_length: document.text.length,
                })),
                uploaded_images: imageContexts.map((image) => ({
                  file_name: image.fileName,
                  mime_type: image.mimeType,
                  data_length: image.data.length,
                })),
                has_knowledge_context: Boolean(knowledgeContext),
                knowledge_sources: knowledgeChunks.map((chunk) => ({
                  source_id: chunk.sourceId,
                  title: chunk.sourceTitle,
                  chunk: chunk.chunkOrder + 1,
                })),
                has_user_memory: Boolean(userMemory),
                provider_used: chatResult.provider,
                model_used: chatResult.model,
                skill_id: activeSkill.id,
                skill_name: activeSkill.name,
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
          } else if (process.env.AI_MU_VERBOSE_LOGS === "true") {
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
          enqueueText("Maaf, chat AI sedang bermasalah. Silakan coba lagi.");
        } finally {
          request.signal.removeEventListener("abort", abortStream);
          closeStream();
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

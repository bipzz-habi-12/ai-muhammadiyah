import {
  createUserMemorySystemPrompt,
  type UserMemory,
} from "@/lib/memory/user-memory";
import {
  createStudyModeSystemPrompt,
  defaultStudyMode,
  normalizeStudyMode,
  type StudyModeId,
} from "@/lib/study-modes";
import type { SubscriptionTier } from "@/lib/usage/limits";

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: AiProvider;
  model: string;
  fallbackEvent?: string;
  finishReason?: string;
  needsContinuation?: boolean;
};

type StreamChunkHandler = (chunk: string) => void | Promise<void>;
type StreamProviderResult = {
  reply: string;
  finishReason?: string;
  needsContinuation?: boolean;
};
type OpenAiErrorDetails = {
  status?: number;
  errorBody?: string;
  error?: unknown;
};
type OpenAiReplyResult = {
  reply: string | null;
  error?: OpenAiErrorDetails;
};
type OpenAiStreamResult = StreamProviderResult & {
  error?: OpenAiErrorDetails;
};
type OpenAiResponsesPayload = {
  model: string;
  instructions: string;
  input: ReturnType<typeof createOpenAiInput>;
  max_output_tokens: number;
  stream?: boolean;
  temperature?: number;
};
type SelectedModel = "auto" | "fast" | "smart" | "document";
type AiRoute = Exclude<SelectedModel, "auto">;
type AiProvider = "mock" | "openrouter" | "openai" | "gemini";
type RoutingAccess = {
  tier?: SubscriptionTier;
  allowedModels?: string[];
};

export const islamicAiIdentitySystemPrompt = [
  "You are AI Muhammadiyah, a modern Islamic education AI platform for Muhammadiyah learning communities.",
  "Present yourself as AI Muhammadiyah, not as GPT, OpenAI, Gemini, a generic chatbot, or an API wrapper.",
  "Your core role is a premium learning assistant for Islamic education, Cambridge-style academic learning, OSN/STEM preparation, coding, study strategy, writing, and productive school support.",
  "Speak politely, professionally, warmly, and naturally. Use Islamic greetings such as Assalamualaikum only when appropriate, usually once at the beginning of a fresh conversation.",
  "Keep greetings concise, friendly, and polished. Do not repeat long introductions or identity paragraphs.",
  "Focus on education, akhlak, useful knowledge, helpfulness, motivation, productivity, and adab reminders.",
  "Support Islamic study help and school learning with a balanced Muhammadiyah educational tone: thoughtful, evidence-aware, practical, and respectful.",
  "Avoid generic model disclaimers such as knowledge cutoff statements, 'as an AI language model', or 'I cannot access the internet' unless the user specifically asks about your limitations, live web access, or current events.",
  "If current or live information is required and no browsing tool is available, answer from stable knowledge when safe and clearly suggest checking an official/current source without turning it into a boilerplate disclaimer.",
  "Avoid extreme, sectarian, unsafe, or unsupported religious claims. Do not present uncertain Islamic rulings as absolute.",
  "When a question depends on detailed fiqh, local fatwa, or a sensitive Islamic ruling and you are unsure, encourage the user to consult qualified scholars or trusted Muhammadiyah authorities.",
  "Keep answers concise unless the user asks for detailed explanations.",
  "Answer in the user's language when possible, and use simple Indonesian by default.",
].join("\n");

const answerCompletionSystemPrompt = [
  "ANSWER COMPLETION RULES:",
  "- Finish the answer completely and do not stop mid-sentence.",
  "- If the answer is long, give a short summary first, then continue in structured sections.",
  "- Prefer a complete but concise answer over an unfinished long answer.",
].join("\n");

const responseStyleSystemPrompt = [
  "RESPONSE STYLE:",
  "- Use clean, modern Markdown with helpful headings, spacing, and readable paragraphs.",
  "- Use bullet points for lists and numbered steps for tutorials or procedures.",
  "- Use tables only when they make comparison or data easier to understand.",
  "- Keep the tone premium, concise, confident, and friendly.",
  "- Avoid repetitive self-disclaimer paragraphs and generic assistant caveats.",
  "- Use light emojis sparingly when they clarify the answer, not as decoration.",
  "- Avoid messy excessive bolding.",
  "- Use Indonesian by default unless the user asks for English or another language.",
].join("\n");

const contextPrioritySystemPrompt = [
  "CONTEXT PRIORITY RULES:",
  "1. If the user asks about personal information, names, preferences, or previous conversation, answer from the conversation memory first.",
  "2. If the user asks about the uploaded document, answer from the document context.",
  "3. If both conversation memory and document context are relevant, combine both clearly.",
  "4. Do not use the uploaded document for every question just because it exists.",
  "5. For questions like 'siapa nama saya?', use the chat history and do not search the document.",
  "6. For document requests like 'ringkas dokumen ini', prioritize the uploaded document text.",
].join("\n");

const openRouterDefaultModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
const geminiFlashModel =
  process.env.GEMINI_FLASH_MODEL ??
  process.env.GEMINI_MODEL ??
  "gemini-2.5-flash";
const geminiProModel = process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro";
const openAiDefaultModel = process.env.OPENAI_MODEL ?? "gpt-5-mini";
const gptTestMode = process.env.GPT_TEST_MODE === "true";

const openRouterFallbackModelMap: Record<AiRoute, string> = {
  fast: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  smart: "moonshotai/kimi-k2.6:free",
  document: "qwen/qwen3-coder:free",
};

const aiRouteConfig: Record<
  AiRoute,
  {
    fallbackOpenRouterModel: string;
    futureProvider: AiProvider;
    purpose: string;
  }
> = {
  fast: {
    fallbackOpenRouterModel: openRouterFallbackModelMap.fast,
    futureProvider: "openrouter",
    purpose: "Cheap, fast model for normal chat.",
  },
  smart: {
    fallbackOpenRouterModel: openRouterFallbackModelMap.smart,
    futureProvider: "openai",
    purpose: "Connect this to an OpenAI GPT reasoning model later.",
  },
  document: {
    fallbackOpenRouterModel: openRouterFallbackModelMap.document,
    futureProvider: "gemini",
    purpose: "Connect this to a Gemini long-context document model later.",
  },
};

const maxRecentChatMessages = 10;
const maxMessageTextLength = 2000;
const maxDocumentContextLength = 12000;
const minUsefulDocumentContextLength = 120;
const openRouterMaxTokens = 1200;
const openAiMaxOutputTokens = 1800;
const geminiMaxOutputTokens = 1800;
const continuationMarker = "\n\n[[AI_MU_CONTINUE_SUGGESTED]]";

function normalizeSelectedModel(selectedModel?: string): SelectedModel {
  if (
    selectedModel === "fast" ||
    selectedModel === "smart" ||
    selectedModel === "document"
  ) {
    return selectedModel;
  }

  return "auto";
}

function resolveOpenRouterModel(route: AiRoute) {
  return aiRouteConfig[route]?.fallbackOpenRouterModel ?? openRouterDefaultModel;
}

function hasPremiumSmartAccess(tier: SubscriptionTier) {
  return tier !== "free";
}

function hasGeminiProAccess(tier: SubscriptionTier) {
  return (
    tier === "muallim_pro" ||
    tier === "dakwah_digital" ||
    tier === "sinergi_ranting"
  );
}

function resolveOpenAiModel() {
  return openAiDefaultModel;
}

function isGpt5MiniModel(model: string) {
  return model.toLowerCase() === "gpt-5-mini";
}

function createOpenAiResponsesPayload({
  model,
  messages,
  pdfContext,
  studyMode,
  tier,
  memory,
  stream,
}: {
  model: string;
  messages: ChatMessage[];
  pdfContext: string;
  studyMode?: StudyModeId;
  tier?: SubscriptionTier;
  memory?: UserMemory;
  stream?: boolean;
}): OpenAiResponsesPayload {
  const payload: OpenAiResponsesPayload = {
    model,
    instructions: createOpenAiInstructions(memory, studyMode, tier),
    input: createOpenAiInput(messages, pdfContext, memory),
    max_output_tokens: openAiMaxOutputTokens,
  };

  if (stream) {
    payload.stream = true;
  }

  if (!isGpt5MiniModel(model)) {
    payload.temperature = 0.4;
  }

  return payload;
}

function resolveGeminiModel(route: AiRoute = "fast", tier: SubscriptionTier = "free") {
  const model =
    (route === "document" || route === "smart") && hasGeminiProAccess(tier)
      ? geminiProModel
      : geminiFlashModel;

  return model.replace(/^models\//, "");
}

function routeSelectedModel(
  selectedModel: SelectedModel,
  latestMessage: string,
  pdfContext: string,
  allowedModels: string[] = ["auto", "fast"],
): AiRoute {
  if (selectedModel !== "auto") {
    return selectedModel;
  }

  if (pdfContext && isDocumentQuestion(latestMessage)) {
    return allowedModels.includes("document") ? "document" : "fast";
  }

  if (isReasoningQuestion(latestMessage)) {
    return allowedModels.includes("smart") ? "smart" : "fast";
  }

  return "fast";
}

function normalizeRoutingAccess(access?: RoutingAccess) {
  return {
    tier: access?.tier ?? "free",
    allowedModels:
      access?.allowedModels && access.allowedModels.length
        ? access.allowedModels
        : ["auto", "fast"],
  };
}

function getLatestUserMessage(messages: ChatMessage[]) {
  return messages.findLast((message) => message.role === "user")?.text ?? "";
}

function truncateMessageText(text: string) {
  const trimmedText = text.trim();

  if (trimmedText.length <= maxMessageTextLength) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, maxMessageTextLength)}\n[Pesan dipotong agar memori chat tetap ringan.]`;
}

function prepareChatHistory(messages: ChatMessage[]) {
  // Keep only recent conversation memory so follow-up questions work without huge prompts.
  return messages
    .filter((message) => message.text.trim())
    .slice(-maxRecentChatMessages)
    .map((message) => ({
      role: message.role,
      text: truncateMessageText(message.text),
    }));
}

function preparePdfContext(pdfContext: string) {
  const trimmedContext = pdfContext.trim();

  if (!trimmedContext) {
    return "";
  }

  // Keep the prompt beginner-friendly and avoid sending a very large document at once.
  return trimmedContext.slice(0, maxDocumentContextLength);
}

function isDocumentQuestion(question: string) {
  const normalizedQuestion = question.toLowerCase();

  const documentWords = [
    "dokumen",
    "document",
    "pdf",
    "ppt",
    "pptx",
    "powerpoint",
    "presentasi",
    "slide",
    "slides",
    "excel",
    "xlsx",
    "spreadsheet",
    "worksheet",
    "sheet",
    "tabel",
    "table",
    "statistik",
    "data",
    "file",
    "berkas",
    "lampiran",
    "upload",
    "unggah",
    "teks ini",
    "dokumen ini",
    "pdf ini",
  ];

  const documentTaskWords = [
    "ringkas",
    "rangkum",
    "summary",
    "simpulkan",
    "analisis",
    "analisa",
    "jelaskan isi",
    "apa isi",
    "poin penting",
    "kesimpulan",
    "bab",
    "halaman",
    "kutip",
    "kutipan",
    "tren",
    "trend",
    "insight",
    "wawasan",
    "statistik",
    "rata-rata",
    "total",
    "bandingkan",
  ];

  const mentionsDocument = documentWords.some((word) =>
    normalizedQuestion.includes(word),
  );
  const asksDocumentTask = documentTaskWords.some((word) =>
    normalizedQuestion.includes(word),
  );

  return mentionsDocument || asksDocumentTask;
}

function isReasoningQuestion(question: string) {
  const normalizedQuestion = question.toLowerCase();

  const reasoningWords = [
    "analisis mendalam",
    "analisa mendalam",
    "reason",
    "reasoning",
    "logika",
    "langkah demi langkah",
    "step by step",
    "bandingkan",
    "compare",
    "evaluasi",
    "kritisi",
    "strategi",
    "rencana",
    "argumen",
    "mengapa",
    "kenapa",
    "buktikan",
    "hitung",
    "solve",
    "pecahkan",
  ];

  return reasoningWords.some((word) => normalizedQuestion.includes(word));
}

function isPdfContextTooShort(pdfContext: string) {
  return pdfContext.length > 0 && pdfContext.length < minUsefulDocumentContextLength;
}

function createShortPdfFallback(pdfContext: string) {
  const visibleText = pdfContext.trim().slice(0, minUsefulDocumentContextLength);

  return [
    "Teks dokumen berhasil diterima, tetapi hasil ekstraksinya terlalu pendek untuk dianalisis dengan yakin.",
    "",
    "Yang bisa saya baca:",
    `- ${visibleText || "Tidak ada teks bermakna yang terbaca."}`,
    "",
    "Kemungkinan dokumen berisi scan/gambar, teksnya tidak terseleksi, data tabelnya kosong, atau ekstraksinya belum lengkap. Silakan upload PDF, Word (.docx), PowerPoint (.pptx), atau Excel (.xlsx) dengan teks/data yang bisa dibaca agar analisisnya lebih akurat.",
  ].join("\n");
}

function createRateLimitFallback(pdfContext: string) {
  const hasPdfContext = Boolean(preparePdfContext(pdfContext));

  if (hasPdfContext) {
    return [
      "Maaf, model AI gratis dari OpenRouter sedang terkena batas penggunaan sementara.",
      "",
      "Dokumen sudah berhasil diupload dan teksnya sudah berhasil diekstrak, tetapi analisis AI perlu dicoba lagi beberapa saat lagi.",
      "",
      "Silakan kirim ulang pertanyaan yang sama nanti, atau gunakan model OpenRouter lain dengan limit yang lebih longgar.",
    ].join("\n");
  }

  return [
    "Maaf, model AI gratis dari OpenRouter sedang terkena batas penggunaan sementara.",
    "",
    "Chat tidak rusak, tetapi jawaban AI perlu dicoba lagi beberapa saat lagi.",
    "",
    "Silakan kirim ulang pertanyaan nanti, atau gunakan model OpenRouter lain dengan limit yang lebih longgar.",
  ].join("\n");
}

function createModelUnavailableFallback(pdfContext: string) {
  const hasPdfContext = Boolean(preparePdfContext(pdfContext));

  if (hasPdfContext) {
    return [
      "Maaf, model AI pilihan sedang penuh atau belum bisa menjawab saat ini.",
      "",
      "Dokumen sudah berhasil dibaca, jadi kamu bisa mencoba lagi sebentar lagi atau pilih Auto / Free Model.",
    ].join("\n");
  }

  return [
    "Maaf, model AI pilihan sedang penuh atau belum bisa menjawab saat ini.",
    "",
    "Silakan coba lagi sebentar lagi, atau pilih Auto / Free Model.",
  ].join("\n");
}

function createGenericAiFallback() {
  return "Maaf, chat AI sedang bermasalah. Silakan coba lagi.";
}

function createPdfAnalysisPrompt(pdfContext: string, question: string) {
  return [
    "DOCUMENT ANALYSIS INSTRUCTIONS:",
    "- The uploaded document text is already provided below inside this message.",
    "- Do not say that you cannot access, open, view, read, or receive the document.",
    "- Answer based only on the provided document text. Do not invent facts outside the document context.",
    "- If the document context is unclear, mention which part is unclear, then summarize or answer what can still be inferred from the provided text.",
    "- For summary requests, use clear bullet points and keep the structure easy to scan.",
    "- If the document is a spreadsheet, pay attention to worksheet names, table rows, trends, totals, averages, comparisons, and useful study insights.",
    "- If the user asks for information that is not present in the document text, say that it is not found in the provided document context.",
    "",
    "DOCUMENT TEXT:",
    pdfContext,
    "",
    "USER QUESTION:",
    question,
  ].join("\n");
}

function createMockReply(messages: ChatMessage[], pdfContext = "") {
  const latestMessage = getLatestUserMessage(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (!latestMessage) {
    return "Assalamualaikum. Silakan tulis pertanyaan terlebih dahulu.";
  }

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    return createShortPdfFallback(preparedPdfContext);
  }

  if (shouldUsePdfContext) {
    return `Assalamualaikum. Dokumen sudah terbaca, jadi AI bisa memakai isi dokumen sebagai konteks untuk menjawab: "${latestMessage}".`;
  }

  return `Assalamualaikum. Ini respon contoh untuk: "${latestMessage}". Nanti bagian ini bisa diganti dengan GPT atau Gemini saat API key sudah tersedia.`;
}

function createOpenRouterMessages(
  messages: ChatMessage[],
  pdfContext: string,
  studyMode?: StudyModeId,
  tier?: SubscriptionTier,
  memory?: UserMemory,
) {
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const memorySystemPrompt = memory ? createUserMemorySystemPrompt(memory) : "";
  const studyModeSystemPrompt = createStudyModeSystemPrompt(
    studyMode ?? defaultStudyMode,
    tier,
  );
  const latestUserIndex = recentMessages.findLastIndex(
    (message) => message.role === "user",
  );

  return [
    { role: "system", content: islamicAiIdentitySystemPrompt },
    { role: "system", content: contextPrioritySystemPrompt },
    { role: "system", content: answerCompletionSystemPrompt },
    { role: "system", content: responseStyleSystemPrompt },
    { role: "system", content: studyModeSystemPrompt },
    ...(memorySystemPrompt
      ? [{ role: "system", content: memorySystemPrompt }]
      : []),
    ...recentMessages.map((message, index) => {
      const role = message.role === "ai" ? "assistant" : "user";
      const shouldAttachPdfContext =
        Boolean(preparedPdfContext) &&
        index === latestUserIndex &&
        isDocumentQuestion(message.text);

      return {
        role,
        content: shouldAttachPdfContext
          ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
          : message.text,
      };
    }),
  ];
}

function createOpenAiInput(
  messages: ChatMessage[],
  pdfContext: string,
  memory?: UserMemory,
) {
  return createOpenRouterMessages(messages, pdfContext, undefined, undefined, memory)
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function createOpenAiInstructions(
  memory?: UserMemory,
  studyMode?: StudyModeId,
  tier?: SubscriptionTier,
) {
  return [
    islamicAiIdentitySystemPrompt,
    contextPrioritySystemPrompt,
    answerCompletionSystemPrompt,
    responseStyleSystemPrompt,
    createStudyModeSystemPrompt(studyMode ?? defaultStudyMode, tier),
    memory ? createUserMemorySystemPrompt(memory) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function createGeminiSystemInstruction(
  memory?: UserMemory,
  studyMode?: StudyModeId,
  tier?: SubscriptionTier,
) {
  return [
    islamicAiIdentitySystemPrompt,
    contextPrioritySystemPrompt,
    answerCompletionSystemPrompt,
    responseStyleSystemPrompt,
    createStudyModeSystemPrompt(studyMode ?? defaultStudyMode, tier),
    memory ? createUserMemorySystemPrompt(memory) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isMaxTokenFinishReason(finishReason?: string | null) {
  if (!finishReason) {
    return false;
  }

  const normalizedReason = finishReason.toLowerCase();

  return (
    normalizedReason === "length" ||
    normalizedReason === "max_tokens" ||
    normalizedReason === "max_output_tokens" ||
    normalizedReason === "max_tokens_exceeded" ||
    normalizedReason === "token_limit" ||
    normalizedReason === "max_token" ||
    normalizedReason === "max_output"
  );
}

function appendContinuationMarkerIfNeeded(result: StreamProviderResult) {
  if (!result.needsContinuation) {
    return result;
  }

  return {
    ...result,
    reply: `${result.reply}${continuationMarker}`,
  };
}

function createGeminiContents(messages: ChatMessage[], pdfContext: string) {
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const latestUserIndex = recentMessages.findLastIndex(
    (message) => message.role === "user",
  );

  return recentMessages.map((message, index) => {
    const shouldAttachPdfContext =
      Boolean(preparedPdfContext) &&
      index === latestUserIndex &&
      isDocumentQuestion(message.text);

    return {
      role: message.role === "ai" ? "model" : "user",
      parts: [
        {
          text: shouldAttachPdfContext
            ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
            : message.text,
        },
      ],
    };
  });
}

function getRateLimitInfo(response: Response) {
  return {
    limit: response.headers.get("x-ratelimit-limit"),
    remaining: response.headers.get("x-ratelimit-remaining"),
    reset: response.headers.get("x-ratelimit-reset"),
    retryAfter: response.headers.get("retry-after"),
  };
}

function logOpenAiError(
  context: string,
  details: {
    status?: number;
    errorBody?: string;
    model: string;
    error?: unknown;
  },
) {
  console.error(context, {
    provider: "openai",
    model: details.model,
    status: details.status ?? null,
    errorBody: details.errorBody ?? null,
    error: details.error,
  });
}

function logOpenAiRequestEvent(
  event: "request start" | "request success" | "request failure",
  details: {
    model: string;
    route?: AiRoute;
    status?: number;
    errorBody?: string;
    error?: unknown;
  },
) {
  const payload = {
    provider: "openai",
    model: details.model,
    route: details.route ?? null,
    status: details.status ?? null,
    errorBody: details.errorBody ?? null,
    error: details.error,
  };

  if (event === "request failure") {
    console.error(`OpenAI GPT ${event}:`, payload);
    return;
  }

  console.info(`OpenAI GPT ${event}:`, payload);
}

function createOpenAiFailureReply(error?: OpenAiErrorDetails) {
  const details = [
    "OpenAI GPT-5 mini test mode failed.",
    "",
    `Status: ${error?.status ?? "unknown"}`,
    "",
    "OpenAI error body:",
    error?.errorBody ?? formatUnknownError(error?.error),
  ];

  return details.join("\n");
}

function formatUnknownError(error: unknown) {
  if (!error) {
    return "No OpenAI error body was returned.";
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function generateOpenRouterReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute,
  tier: SubscriptionTier,
  studyMode: StudyModeId,
  memory?: UserMemory,
) {
  const messagesForOpenRouter = createOpenRouterMessages(
    messages,
    pdfContext,
    studyMode,
    tier,
    memory,
  );
  const openRouterModel = resolveOpenRouterModel(route);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Muhammadiyah",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: messagesForOpenRouter,
        max_tokens: openRouterMaxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const rateLimitInfo = getRateLimitInfo(response);

      console.error("OpenRouter error:", {
        status: response.status,
        model: openRouterModel,
        rateLimitInfo,
        errorText,
      });

      if (response.status === 429) {
        return createRateLimitFallback(pdfContext);
      }

      return createModelUnavailableFallback(pdfContext);
    }

    const data = await response.json();

    return (
      data.choices?.[0]?.message?.content ??
      createModelUnavailableFallback(pdfContext)
    );
  } catch (error) {
    console.error("OpenRouter request failed:", {
      model: openRouterModel,
      error,
    });

    return createModelUnavailableFallback(pdfContext);
  }
}

async function streamSseJson(
  response: Response,
  onData: (data: string) => void | Promise<void>,
) {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";

    for (const event of events) {
      const dataLines = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

      if (!dataLines.length) {
        continue;
      }

      await onData(dataLines.join("\n"));
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    const dataLines = buffer
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length) {
      await onData(dataLines.join("\n"));
    }
  }
}

async function streamOpenRouterReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute,
  onChunk: StreamChunkHandler,
  tier: SubscriptionTier,
  studyMode: StudyModeId,
  memory?: UserMemory,
): Promise<StreamProviderResult | null> {
  const messagesForOpenRouter = createOpenRouterMessages(
    messages,
    pdfContext,
    studyMode,
    tier,
    memory,
  );
  const openRouterModel = resolveOpenRouterModel(route);
  let streamedText = "";
  let streamedFinishReason: string | undefined;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Muhammadiyah",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: messagesForOpenRouter,
        max_tokens: openRouterMaxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const rateLimitInfo = getRateLimitInfo(response);

      console.error("OpenRouter stream error:", {
        status: response.status,
        model: openRouterModel,
        rateLimitInfo,
        errorText,
      });

      const fallback =
        response.status === 429
          ? createRateLimitFallback(pdfContext)
          : createModelUnavailableFallback(pdfContext);

      await streamText(fallback, onChunk);
      return { reply: fallback };
    }

    await streamSseJson(response, async (data) => {
      if (data === "[DONE]") {
        return;
      }

      try {
        const event = JSON.parse(data) as {
          choices?: {
            delta?: {
              content?: string;
            };
            finish_reason?: string | null;
          }[];
        };
        const finishReason = event.choices?.[0]?.finish_reason;
        const chunk = event.choices?.[0]?.delta?.content ?? "";

        if (chunk) {
          streamedText += chunk;
          await onChunk(chunk);
        }

        if (isMaxTokenFinishReason(finishReason)) {
          streamedFinishReason = finishReason ?? undefined;
        }
      } catch (error) {
        console.error("OpenRouter stream parse failed:", {
          model: openRouterModel,
          data,
          error,
        });
      }
    });

    if (streamedText) {
      return {
        reply: streamedText,
        finishReason: streamedFinishReason,
        needsContinuation: isMaxTokenFinishReason(streamedFinishReason),
      };
    }

    const fallback = createModelUnavailableFallback(pdfContext);
    await streamText(fallback, onChunk);
    return { reply: fallback };
  } catch (error) {
    console.error("OpenRouter stream request failed:", {
      model: openRouterModel,
      error,
    });

    const fallback = createModelUnavailableFallback(pdfContext);
    await streamText(fallback, onChunk);
    return { reply: fallback };
  }
}

function extractOpenAiOutputText(data: {
  output_text?: string;
  output?: {
    content?: {
      text?: string;
      type?: string;
    }[];
  }[];
}) {
  if (data.output_text?.trim()) {
    return data.output_text.trim();
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim() || null
  );
}

async function generateOpenAiGptReply(
  messages: ChatMessage[],
  pdfContext = "",
  studyMode: StudyModeId,
  tier: SubscriptionTier,
  memory?: UserMemory,
): Promise<OpenAiReplyResult> {
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const openAiModel = resolveOpenAiModel();

  if (!openAiApiKey) {
    const error = { errorBody: "OPENAI_API_KEY is missing" };
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      errorBody: error.errorBody,
    });
    return { reply: null, error };
  }

  try {
    logOpenAiRequestEvent("request start", {
      model: openAiModel,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(createOpenAiResponsesPayload({
        model: openAiModel,
        messages,
        pdfContext,
        studyMode,
        tier,
        memory,
      })),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = {
        status: response.status,
        errorBody: errorText,
      };

      logOpenAiError("OpenAI GPT request failed:", {
        status: response.status,
        model: openAiModel,
        errorBody: errorText,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        status: response.status,
        errorBody: errorText,
      });

      return { reply: null, error };
    }

    const data = await response.json();
    const reply = extractOpenAiOutputText(data);

    if (!reply) {
      const error = { errorBody: JSON.stringify(data) };
      logOpenAiError("OpenAI GPT returned an empty reply:", {
        model: openAiModel,
        errorBody: error.errorBody,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        errorBody: error.errorBody,
      });

      return { reply: null, error };
    }

    logOpenAiRequestEvent("request success", {
      model: openAiModel,
      status: response.status,
    });

    return { reply };
  } catch (error) {
    logOpenAiError("OpenAI GPT request failed:", {
      model: openAiModel,
      error,
    });
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      error,
    });

    return { reply: null, error: { error } };
  }
}

async function generateGeminiReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute = "fast",
  tier: SubscriptionTier = "free",
  studyMode: StudyModeId = defaultStudyMode,
  memory?: UserMemory,
  modelOverride?: string,
): Promise<string | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = modelOverride ?? resolveGeminiModel(route, tier);

  if (!geminiApiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        geminiModel,
      )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: createGeminiSystemInstruction(memory, studyMode, tier),
              },
            ],
          },
          contents: createGeminiContents(messages, pdfContext),
          generationConfig: {
            maxOutputTokens: geminiMaxOutputTokens,
            temperature: 0.4,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Gemini error:", {
        status: response.status,
        model: geminiModel,
        errorText,
      });

      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const reply = parts
      .map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      console.error("Gemini returned an empty reply:", {
        model: geminiModel,
        finishReason: data.candidates?.[0]?.finishReason,
      });

      return null;
    }

    return reply;
  } catch (error) {
    console.error("Gemini request failed:", {
      model: geminiModel,
      error,
    });

    return null;
  }
}

async function streamGeminiReply(
  messages: ChatMessage[],
  pdfContext = "",
  onChunk: StreamChunkHandler,
  route: AiRoute = "fast",
  tier: SubscriptionTier = "free",
  studyMode: StudyModeId = defaultStudyMode,
  memory?: UserMemory,
  modelOverride?: string,
): Promise<StreamProviderResult | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = modelOverride ?? resolveGeminiModel(route, tier);
  let streamedText = "";
  let streamedFinishReason: string | undefined;

  if (!geminiApiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        geminiModel,
      )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: createGeminiSystemInstruction(memory, studyMode, tier),
              },
            ],
          },
          contents: createGeminiContents(messages, pdfContext),
          generationConfig: {
            maxOutputTokens: geminiMaxOutputTokens,
            temperature: 0.4,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Gemini stream error:", {
        status: response.status,
        model: geminiModel,
        errorText,
      });

      return null;
    }

    await streamSseJson(response, async (data) => {
      try {
        const event = JSON.parse(data) as {
          candidates?: {
            finishReason?: string;
            content?: {
              parts?: {
                text?: string;
              }[];
            };
          }[];
        };
        const parts = event.candidates?.[0]?.content?.parts ?? [];
        const finishReason = event.candidates?.[0]?.finishReason;
        const chunk = parts.map((part) => part.text ?? "").join("");

        if (chunk) {
          streamedText += chunk;
          await onChunk(chunk);
        }

        if (isMaxTokenFinishReason(finishReason)) {
          streamedFinishReason = finishReason;
        }
      } catch (error) {
        console.error("Gemini stream parse failed:", {
          model: geminiModel,
          data,
          error,
        });
      }
    });

    return streamedText
      ? {
          reply: streamedText,
          finishReason: streamedFinishReason,
          needsContinuation: isMaxTokenFinishReason(streamedFinishReason),
        }
      : null;
  } catch (error) {
    console.error("Gemini stream request failed:", {
      model: geminiModel,
      error,
    });

    return null;
  }
}

function resolveGeminiFallbackModels(
  route: AiRoute,
  tier: SubscriptionTier,
): string[] {
  const flashModel = resolveGeminiModel("fast", "free");

  if (route === "smart") {
    return [flashModel];
  }

  const primaryModel = resolveGeminiModel(route, tier);

  return primaryModel === flashModel ? [primaryModel] : [primaryModel, flashModel];
}

async function generateGeminiReplyWithFallback(
  messages: ChatMessage[],
  pdfContext: string,
  route: AiRoute,
  tier: SubscriptionTier,
  studyMode: StudyModeId,
  memory?: UserMemory,
) {
  const models = resolveGeminiFallbackModels(route, tier);

  for (const [index, model] of models.entries()) {
    const reply = await generateGeminiReply(
      messages,
      pdfContext,
      route,
      tier,
      studyMode,
      memory,
      model,
    );

    if (reply) {
      return { reply, model, fallbackEvent: index > 0 ? "gemini_pro_to_flash" : undefined };
    }

    if (index === 0 && models.length > 1) {
      console.warn("AI Muhammadiyah falling back from Gemini Pro to Gemini Flash:", {
        route,
        provider: "gemini",
        failedModel: model,
        fallbackModel: models[1],
        tier,
      });
    }
  }

  return null;
}

async function streamGeminiReplyWithFallback(
  messages: ChatMessage[],
  pdfContext: string,
  onChunk: StreamChunkHandler,
  route: AiRoute,
  tier: SubscriptionTier,
  studyMode: StudyModeId,
  memory?: UserMemory,
) {
  const models = resolveGeminiFallbackModels(route, tier);

  for (const [index, model] of models.entries()) {
    const result = await streamGeminiReply(
      messages,
      pdfContext,
      onChunk,
      route,
      tier,
      studyMode,
      memory,
      model,
    );

    if (result) {
      return {
        ...result,
        model,
        fallbackEvent: index > 0 ? "gemini_pro_to_flash" : undefined,
      };
    }

    if (index === 0 && models.length > 1) {
      console.warn(
        "AI Muhammadiyah streaming fallback from Gemini Pro to Gemini Flash:",
        {
          route,
          provider: "gemini",
          failedModel: model,
          fallbackModel: models[1],
          tier,
        },
      );
    }
  }

  return null;
}

async function streamOpenAiGptReply(
  messages: ChatMessage[],
  pdfContext = "",
  onChunk: StreamChunkHandler,
  studyMode: StudyModeId,
  tier: SubscriptionTier,
  memory?: UserMemory,
): Promise<OpenAiStreamResult | null> {
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const openAiModel = resolveOpenAiModel();
  let streamedText = "";
  let streamedFinishReason: string | undefined;
  let streamedError: OpenAiErrorDetails | undefined;

  if (!openAiApiKey) {
    const error = { errorBody: "OPENAI_API_KEY is missing" };
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      errorBody: error.errorBody,
    });
    return { reply: "", error };
  }

  try {
    logOpenAiRequestEvent("request start", {
      model: openAiModel,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(createOpenAiResponsesPayload({
        model: openAiModel,
        messages,
        pdfContext,
        studyMode,
        tier,
        memory,
        stream: true,
      })),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = {
        status: response.status,
        errorBody: errorText,
      };

      logOpenAiError("OpenAI GPT stream failed:", {
        status: response.status,
        model: openAiModel,
        errorBody: errorText,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        status: response.status,
        errorBody: errorText,
      });

      return { reply: "", error };
    }

    await streamSseJson(response, async (data) => {
      if (data === "[DONE]") {
        return;
      }

      try {
        const event = JSON.parse(data) as {
          type?: string;
          delta?: string;
          error?: unknown;
          response?: {
            incomplete_details?: {
              reason?: string;
            } | null;
            output_text?: string;
            status?: string;
          };
        };

        if (event.type === "response.failed") {
          streamedError = {
            errorBody: JSON.stringify(event.error ?? event),
          };
          logOpenAiError("OpenAI GPT stream response failed:", {
            model: openAiModel,
            errorBody: streamedError.errorBody,
          });
          logOpenAiRequestEvent("request failure", {
            model: openAiModel,
            errorBody: streamedError.errorBody,
          });
        }

        if (event.type === "response.output_text.delta" && event.delta) {
          streamedText += event.delta;
          await onChunk(event.delta);
        }

        if (
          event.type === "response.incomplete" ||
          event.response?.status === "incomplete"
        ) {
          streamedFinishReason =
            event.response?.incomplete_details?.reason ??
            "max_output_tokens";
        }
      } catch (error) {
        console.error("OpenAI GPT stream parse failed:", {
          model: openAiModel,
          data,
          error,
        });
      }
    });

    if (!streamedText) {
      const error = streamedError ?? {
        errorBody: "OpenAI stream returned an empty reply.",
      };
      logOpenAiError("OpenAI GPT stream returned an empty reply:", {
        model: openAiModel,
        errorBody: error.errorBody,
      });
      logOpenAiRequestEvent("request failure", {
        model: openAiModel,
        errorBody: error.errorBody,
      });

      return { reply: "", error };
    }

    logOpenAiRequestEvent("request success", {
      model: openAiModel,
      status: response.status,
    });

    return {
      reply: streamedText,
      finishReason: streamedFinishReason,
      needsContinuation: isMaxTokenFinishReason(streamedFinishReason),
    };
  } catch (error) {
    logOpenAiError("OpenAI GPT stream request failed:", {
      model: openAiModel,
      error,
    });
    logOpenAiRequestEvent("request failure", {
      model: openAiModel,
      error,
    });

    return { reply: "", error: { error } };
  }
}

async function generateProviderReply(
  route: AiRoute,
  messages: ChatMessage[],
  pdfContext: string,
  access: ReturnType<typeof normalizeRoutingAccess>,
  studyMode: StudyModeId,
  memory?: UserMemory,
): Promise<GenerateChatReplyResult> {
  const routeConfig = aiRouteConfig[route];

  if (route === "smart" && hasPremiumSmartAccess(access.tier)) {
    const openAiResult = await generateOpenAiGptReply(
      messages,
      pdfContext,
      studyMode,
      access.tier,
      memory,
    );

    if (openAiResult.reply) {
      console.info("AI Muhammadiyah provider handled request:", {
        route,
        provider: "openai",
        model: resolveOpenAiModel(),
        tier: access.tier,
      });

      return {
        reply: openAiResult.reply,
        provider: "openai",
        model: resolveOpenAiModel(),
      };
    }

    if (gptTestMode) {
      return {
        reply: createOpenAiFailureReply(openAiResult.error),
        provider: "openai",
        model: resolveOpenAiModel(),
        fallbackEvent: "gpt_test_mode_no_fallback",
      };
    }

    console.warn("AI Muhammadiyah falling back from OpenAI GPT to Gemini:", {
      route,
      openAiModel: resolveOpenAiModel(),
      geminiModel: resolveGeminiModel("fast", "free"),
      tier: access.tier,
    });
  }

  const shouldTryGemini =
    route === "fast" ||
    route === "document" ||
    route === "smart" ||
    routeConfig.futureProvider === "gemini";

  if (shouldTryGemini) {
    const geminiResult = await generateGeminiReplyWithFallback(
      messages,
      pdfContext,
      route,
      access.tier,
      studyMode,
      memory,
    );

    if (geminiResult) {
      console.info("AI Muhammadiyah provider handled request:", {
        route,
        provider: "gemini",
        model: geminiResult.model,
        tier: access.tier,
      });

      return {
        reply: geminiResult.reply,
        provider: "gemini",
        model: geminiResult.model,
        fallbackEvent:
          geminiResult.fallbackEvent ??
          (route === "smart" && hasPremiumSmartAccess(access.tier)
            ? "openai_to_gemini"
            : undefined),
      };
    }

    console.warn("AI Muhammadiyah falling back from Gemini to OpenRouter:", {
      route,
      geminiModel: resolveGeminiModel(route, access.tier),
      openRouterModel: resolveOpenRouterModel(route),
      tier: access.tier,
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.info("AI Muhammadiyah provider could not use OpenRouter fallback:", {
      route,
      provider: "openrouter",
      reason: "OPENROUTER_API_KEY is missing",
    });

    return {
      reply: createGenericAiFallback(),
      provider: "openrouter",
      model: resolveOpenRouterModel(route),
      fallbackEvent: "openrouter_unavailable",
    };
  }

  const reply = await generateOpenRouterReply(
    messages,
    pdfContext,
    route,
    access.tier,
    studyMode,
    memory,
  );

  console.info("AI Muhammadiyah provider handled request:", {
    route,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
    tier: access.tier,
  });

  return {
    reply,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
    fallbackEvent: shouldTryGemini ? "gemini_to_openrouter" : undefined,
  };
}

export async function generateChatReply(
  messages: ChatMessage[],
  pdfContext = "",
  selectedModel?: string,
  selectedStudyMode?: string,
  routingAccess?: RoutingAccess,
  memory?: UserMemory,
): Promise<GenerateChatReplyResult> {
  const access = normalizeRoutingAccess(routingAccess);
  const studyMode = normalizeStudyMode(selectedStudyMode);
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const latestMessage = getLatestUserMessage(recentMessages);
  const normalizedModel = normalizeSelectedModel(selectedModel);
  const route = routeSelectedModel(
    normalizedModel,
    latestMessage,
    preparedPdfContext,
    access.allowedModels,
  );
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    return {
      reply: createShortPdfFallback(preparedPdfContext),
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "mock",
      model: process.env.OPENROUTER_API_KEY
        ? resolveOpenRouterModel(route)
        : "mock",
    };
  }

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.OPENROUTER_API_KEY &&
    !process.env.GEMINI_API_KEY
  ) {
    return {
      reply: createMockReply(recentMessages, preparedPdfContext),
      provider: "mock",
      model: "mock",
    };
  }

  const result = await generateProviderReply(
    route,
    recentMessages,
    preparedPdfContext,
    access,
    studyMode,
    memory,
  );

  return result;
}

async function streamText(text: string, onChunk: StreamChunkHandler) {
  const words = text.match(/\S+\s*/g) ?? [text];

  for (const word of words) {
    await onChunk(word);
  }
}

export async function streamChatReply(
  messages: ChatMessage[],
  pdfContext = "",
  selectedModel: string | undefined,
  selectedStudyMode: string | undefined,
  onChunk: StreamChunkHandler,
  routingAccess?: RoutingAccess,
  memory?: UserMemory,
) {
  const access = normalizeRoutingAccess(routingAccess);
  const studyMode = normalizeStudyMode(selectedStudyMode);
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const latestMessage = getLatestUserMessage(recentMessages);
  const normalizedModel = normalizeSelectedModel(selectedModel);
  const route = routeSelectedModel(
    normalizedModel,
    latestMessage,
    preparedPdfContext,
    access.allowedModels,
  );
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    const reply = createShortPdfFallback(preparedPdfContext);
    await streamText(reply, onChunk);
    return {
      reply,
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "mock",
      model: process.env.OPENROUTER_API_KEY
        ? resolveOpenRouterModel(route)
        : "mock",
    };
  }

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.OPENROUTER_API_KEY &&
    !process.env.GEMINI_API_KEY
  ) {
    const reply = createMockReply(recentMessages, preparedPdfContext);
    await streamText(reply, onChunk);
    return { reply, provider: "mock" as const, model: "mock" };
  }

  const routeConfig = aiRouteConfig[route];

  if (route === "smart" && hasPremiumSmartAccess(access.tier)) {
    const openAiResult = await streamOpenAiGptReply(
      recentMessages,
      preparedPdfContext,
      onChunk,
      studyMode,
      access.tier,
      memory,
    );

    if (openAiResult?.reply) {
      console.info("AI Muhammadiyah provider streamed request:", {
        route,
        provider: "openai",
        model: resolveOpenAiModel(),
        tier: access.tier,
      });

      const finalResult = appendContinuationMarkerIfNeeded(openAiResult);

      if (openAiResult.needsContinuation) {
        await onChunk(continuationMarker);
      }

      return {
        reply: finalResult.reply,
        provider: "openai" as const,
        model: resolveOpenAiModel(),
        finishReason: openAiResult.finishReason,
        needsContinuation: openAiResult.needsContinuation,
      };
    }

    if (gptTestMode) {
      const reply = createOpenAiFailureReply(openAiResult?.error);

      await streamText(reply, onChunk);

      return {
        reply,
        provider: "openai" as const,
        model: resolveOpenAiModel(),
        fallbackEvent: "gpt_test_mode_no_fallback",
      };
    }

    console.warn("AI Muhammadiyah streaming fallback from OpenAI GPT to Gemini:", {
      route,
      openAiModel: resolveOpenAiModel(),
      geminiModel: resolveGeminiModel("fast", "free"),
      tier: access.tier,
    });
  }

  if (
    route === "fast" ||
    route === "document" ||
    route === "smart" ||
    routeConfig.futureProvider === "gemini"
  ) {
    const geminiResult = await streamGeminiReplyWithFallback(
      recentMessages,
      preparedPdfContext,
      onChunk,
      route,
      access.tier,
      studyMode,
      memory,
    );

    if (geminiResult) {
      console.info("AI Muhammadiyah provider streamed request:", {
        route,
        provider: "gemini",
        model: geminiResult.model,
        tier: access.tier,
      });

      const finalResult = appendContinuationMarkerIfNeeded(geminiResult);

      if (geminiResult.needsContinuation) {
        await onChunk(continuationMarker);
      }

      return {
        reply: finalResult.reply,
        provider: "gemini" as const,
        model: geminiResult.model,
        fallbackEvent:
          geminiResult.fallbackEvent ??
          (route === "smart" && hasPremiumSmartAccess(access.tier)
            ? "openai_to_gemini"
            : undefined),
        finishReason: geminiResult.finishReason,
        needsContinuation: geminiResult.needsContinuation,
      };
    }

    console.warn("AI Muhammadiyah streaming fallback from Gemini to OpenRouter:", {
      route,
      geminiModel: resolveGeminiModel(route, access.tier),
      openRouterModel: resolveOpenRouterModel(route),
      tier: access.tier,
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    const reply = createGenericAiFallback();

    await streamText(reply, onChunk);

    return {
      reply,
      provider: "openrouter" as const,
      model: resolveOpenRouterModel(route),
      fallbackEvent: "openrouter_unavailable",
    };
  }

  const openRouterResult = await streamOpenRouterReply(
    recentMessages,
    preparedPdfContext,
    route,
    onChunk,
    access.tier,
    studyMode,
    memory,
  );

  if (!openRouterResult) {
    const reply = createGenericAiFallback();
    await streamText(reply, onChunk);
    return {
      reply,
      provider: "openrouter" as const,
      model: resolveOpenRouterModel(route),
      fallbackEvent: "openrouter_empty",
    };
  }

  console.info("AI Muhammadiyah provider streamed request:", {
    route,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
    tier: access.tier,
  });

  const finalOpenRouterResult =
    appendContinuationMarkerIfNeeded(openRouterResult);

  if (openRouterResult.needsContinuation) {
    await onChunk(continuationMarker);
  }

  return {
    reply: finalOpenRouterResult.reply,
    provider: "openrouter" as const,
    model: resolveOpenRouterModel(route),
    fallbackEvent: "gemini_to_openrouter",
    finishReason: openRouterResult.finishReason,
    needsContinuation: openRouterResult.needsContinuation,
  };
}

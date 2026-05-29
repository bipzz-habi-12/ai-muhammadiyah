export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: AiProvider;
};

type SelectedModel = "auto" | "fast" | "smart" | "document";
type AiRoute = Exclude<SelectedModel, "auto">;
type AiProvider = "mock" | "openrouter" | "openai" | "gemini";

export const islamicAiIdentitySystemPrompt = [
  "You are AI Muhammadiyah, a modern Islamic education assistant for Muhammadiyah learning communities.",
  "Speak politely, professionally, warmly, and naturally. Use Islamic greetings such as Assalamualaikum only when appropriate, without forcing them into every reply.",
  "Focus on education, akhlak, useful knowledge, helpfulness, motivation, productivity, and adab reminders.",
  "Support Islamic study help and school learning with a balanced Muhammadiyah educational tone: thoughtful, evidence-aware, practical, and respectful.",
  "Avoid extreme, sectarian, unsafe, or unsupported religious claims. Do not present uncertain Islamic rulings as absolute.",
  "When a question depends on detailed fiqh, local fatwa, or a sensitive Islamic ruling and you are unsure, encourage the user to consult qualified scholars or trusted Muhammadiyah authorities.",
  "Keep answers concise unless the user asks for detailed explanations.",
  "Answer in the user's language when possible, and use simple Indonesian by default.",
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
const geminiDefaultModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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

function resolveGeminiModel() {
  return geminiDefaultModel.replace(/^models\//, "");
}

function routeSelectedModel(
  selectedModel: SelectedModel,
  latestMessage: string,
  pdfContext: string,
): AiRoute {
  if (selectedModel !== "auto") {
    return selectedModel;
  }

  if (pdfContext && isDocumentQuestion(latestMessage)) {
    return "document";
  }

  if (isReasoningQuestion(latestMessage)) {
    return "smart";
  }

  return "fast";
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

function createGeminiUnavailableFallback(pdfContext: string) {
  const hasPdfContext = Boolean(preparePdfContext(pdfContext));

  if (hasPdfContext) {
    return [
      "Maaf, Gemini sedang belum bisa menganalisis dokumen saat ini.",
      "",
      "Dokumen sudah berhasil dibaca, tetapi layanan AI dokumennya perlu dicoba lagi sebentar lagi.",
    ].join("\n");
  }

  return [
    "Maaf, Gemini sedang belum bisa menjawab saat ini.",
    "",
    "Silakan coba lagi sebentar lagi.",
  ].join("\n");
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

function createOpenRouterMessages(messages: ChatMessage[], pdfContext: string) {
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const latestUserIndex = recentMessages.findLastIndex(
    (message) => message.role === "user",
  );

  return [
    { role: "system", content: islamicAiIdentitySystemPrompt },
    { role: "system", content: contextPrioritySystemPrompt },
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

async function generateOpenRouterReply(
  messages: ChatMessage[],
  pdfContext = "",
  route: AiRoute,
) {
  const messagesForOpenRouter = createOpenRouterMessages(messages, pdfContext);
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
        max_tokens: 350,
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

async function generateOpenAiGptReply() {
  // Future connection point:
  // Use OPENAI_API_KEY here when the smart route is ready to call an OpenAI GPT model.
  // For now this intentionally returns null so OpenRouter remains the working fallback.
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return null;
}

async function generateGeminiReply(
  messages: ChatMessage[],
  pdfContext = "",
): Promise<string | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = resolveGeminiModel();

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
                text: [
                  islamicAiIdentitySystemPrompt,
                  contextPrioritySystemPrompt,
                ].join("\n\n"),
              },
            ],
          },
          contents: createGeminiContents(messages, pdfContext),
          generationConfig: {
            maxOutputTokens: 700,
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

async function generateProviderReply(
  route: AiRoute,
  messages: ChatMessage[],
  pdfContext: string,
): Promise<{ reply: string; provider: AiProvider }> {
  const routeConfig = aiRouteConfig[route];

  if (routeConfig.futureProvider === "openai") {
    const openAiReply = await generateOpenAiGptReply();

    if (openAiReply) {
      return { reply: openAiReply, provider: "openai" };
    }
  }

  if (routeConfig.futureProvider === "gemini") {
    const geminiReply = await generateGeminiReply(messages, pdfContext);

    if (geminiReply) {
      console.info("AI Muhammadiyah provider handled request:", {
        route,
        provider: "gemini",
        model: resolveGeminiModel(),
      });

      return { reply: geminiReply, provider: "gemini" };
    }

    console.info("AI Muhammadiyah falling back from Gemini to OpenRouter:", {
      route,
      openRouterModel: resolveOpenRouterModel(route),
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    const provider = routeConfig.futureProvider === "gemini" ? "gemini" : "mock";

    console.info("AI Muhammadiyah provider could not use OpenRouter fallback:", {
      route,
      provider,
      reason: "OPENROUTER_API_KEY is missing",
    });

    return {
      reply:
        routeConfig.futureProvider === "gemini"
          ? createGeminiUnavailableFallback(pdfContext)
          : createMockReply(messages, pdfContext),
      provider,
    };
  }

  const reply = await generateOpenRouterReply(messages, pdfContext, route);

  console.info("AI Muhammadiyah provider handled request:", {
    route,
    provider: "openrouter",
    model: resolveOpenRouterModel(route),
  });

  return {
    reply,
    provider: "openrouter",
  };
}

export async function generateChatReply(
  messages: ChatMessage[],
  pdfContext = "",
  selectedModel?: string,
): Promise<GenerateChatReplyResult> {
  const recentMessages = prepareChatHistory(messages);
  const preparedPdfContext = preparePdfContext(pdfContext);
  const latestMessage = getLatestUserMessage(recentMessages);
  const normalizedModel = normalizeSelectedModel(selectedModel);
  const route = routeSelectedModel(
    normalizedModel,
    latestMessage,
    preparedPdfContext,
  );
  const shouldUsePdfContext =
    Boolean(preparedPdfContext) && isDocumentQuestion(latestMessage);

  if (shouldUsePdfContext && isPdfContextTooShort(preparedPdfContext)) {
    return {
      reply: createShortPdfFallback(preparedPdfContext),
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "mock",
    };
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
    return {
      reply: createMockReply(recentMessages, preparedPdfContext),
      provider: "mock",
    };
  }

  const result = await generateProviderReply(
    route,
    recentMessages,
    preparedPdfContext,
  );

  return result;
}

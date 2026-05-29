export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: "mock" | "openrouter";
};

type SelectedModel = "auto" | "fast" | "smart" | "document";

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

const openRouterDefaultModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";

const openRouterModelMap: Record<SelectedModel, string> = {
  auto: openRouterDefaultModel,
  fast: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  smart: "moonshotai/kimi-k2.6:free",
  document: "qwen/qwen3-coder:free",
};

// Later replacement point:
// fast -> GPT Mini or Gemini Flash
// smart -> GPT 5.5 or Gemini Pro
// document -> GPT 5.5 or Gemini Pro with a larger context window
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

function resolveOpenRouterModel(selectedModel?: string) {
  const normalizedModel = normalizeSelectedModel(selectedModel);

  return openRouterModelMap[normalizedModel] ?? openRouterDefaultModel;
}

function getLatestUserMessage(messages: ChatMessage[]) {
  return messages.findLast((message) => message.role === "user")?.text ?? "";
}

function preparePdfContext(pdfContext: string) {
  const trimmedContext = pdfContext.trim();

  if (!trimmedContext) {
    return "";
  }

  // Keep the prompt beginner-friendly and avoid sending a very large document at once.
  return trimmedContext.slice(0, maxDocumentContextLength);
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
    "Kemungkinan dokumen berisi scan/gambar, teksnya tidak terseleksi, atau ekstraksinya belum lengkap. Silakan upload PDF atau Word (.docx) dengan teks yang bisa diseleksi agar analisisnya lebih akurat.",
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

function createPdfAnalysisPrompt(pdfContext: string, question: string) {
  return [
    "DOCUMENT ANALYSIS INSTRUCTIONS:",
    "- The uploaded document text is already provided below inside this message.",
    "- Do not say that you cannot access, open, view, read, or receive the document.",
    "- Answer based only on the provided document text. Do not invent facts outside the document context.",
    "- If the document context is unclear, mention which part is unclear, then summarize or answer what can still be inferred from the provided text.",
    "- For summary requests, use clear bullet points and keep the structure easy to scan.",
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
  const hasPdfContext = Boolean(preparedPdfContext);

  if (!latestMessage) {
    return "Assalamualaikum. Silakan tulis pertanyaan terlebih dahulu.";
  }

  if (isPdfContextTooShort(preparedPdfContext)) {
    return createShortPdfFallback(preparedPdfContext);
  }

  if (hasPdfContext) {
    return `Assalamualaikum. Dokumen sudah terbaca, jadi AI bisa memakai isi dokumen sebagai konteks untuk menjawab: "${latestMessage}".`;
  }

  return `Assalamualaikum. Ini respon contoh untuk: "${latestMessage}". Nanti bagian ini bisa diganti dengan GPT atau Gemini saat API key sudah tersedia.`;
}

function createOpenRouterMessages(messages: ChatMessage[], pdfContext: string) {
  const preparedPdfContext = preparePdfContext(pdfContext);
  const latestUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );

  return [
    { role: "system", content: islamicAiIdentitySystemPrompt },
    ...messages.map((message, index) => {
      const role = message.role === "ai" ? "assistant" : "user";
      const shouldAttachPdfContext =
        Boolean(preparedPdfContext) && index === latestUserIndex;

      return {
        role,
        content: shouldAttachPdfContext
          ? createPdfAnalysisPrompt(preparedPdfContext, message.text)
          : message.text,
      };
    }),
  ];
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
  selectedModel?: string,
) {
  const messagesForOpenRouter = createOpenRouterMessages(messages, pdfContext);
  const openRouterModel = resolveOpenRouterModel(selectedModel);

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

export async function generateChatReply(
  messages: ChatMessage[],
  pdfContext = "",
  selectedModel?: string,
): Promise<GenerateChatReplyResult> {
  const preparedPdfContext = preparePdfContext(pdfContext);

  if (isPdfContextTooShort(preparedPdfContext)) {
    return {
      reply: createShortPdfFallback(preparedPdfContext),
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "mock",
    };
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      reply: createMockReply(messages, preparedPdfContext),
      provider: "mock",
    };
  }

  const reply = await generateOpenRouterReply(
    messages,
    preparedPdfContext,
    selectedModel,
  );

  return {
    reply,
    provider: "openrouter",
  };
}

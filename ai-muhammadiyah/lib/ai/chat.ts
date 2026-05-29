export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: "mock" | "openrouter";
};

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
const openRouterModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
const maxPdfContextLength = 12000;
const minUsefulPdfContextLength = 120;

function getLatestUserMessage(messages: ChatMessage[]) {
  return messages.findLast((message) => message.role === "user")?.text ?? "";
}

function preparePdfContext(pdfContext: string) {
  const trimmedContext = pdfContext.trim();

  if (!trimmedContext) {
    return "";
  }

  // Keep the prompt beginner-friendly and avoid sending a very large PDF at once.
  return trimmedContext.slice(0, maxPdfContextLength);
}

function isPdfContextTooShort(pdfContext: string) {
  return pdfContext.length > 0 && pdfContext.length < minUsefulPdfContextLength;
}

function createShortPdfFallback(pdfContext: string) {
  const visibleText = pdfContext.trim().slice(0, minUsefulPdfContextLength);

  return [
    "Teks PDF berhasil diterima, tetapi hasil ekstraksinya terlalu pendek untuk dianalisis dengan yakin.",
    "",
    "Yang bisa saya baca:",
    `- ${visibleText || "Tidak ada teks bermakna yang terbaca."}`,
    "",
    "Kemungkinan PDF berisi scan/gambar, teksnya tidak terseleksi, atau ekstraksinya belum lengkap. Silakan upload PDF dengan teks yang bisa diseleksi agar analisisnya lebih akurat.",
  ].join("\n");
}

function createPdfAnalysisPrompt(pdfContext: string, question: string) {
  return [
    "PDF ANALYSIS INSTRUCTIONS:",
    "- The uploaded PDF text is already provided below inside this message.",
    "- Do not say that you cannot access, open, view, read, or receive the PDF.",
    "- Answer based only on the provided PDF text. Do not invent facts outside the PDF context.",
    "- If the PDF context is unclear, mention which part is unclear, then summarize or answer what can still be inferred from the provided text.",
    "- For summary requests, use clear bullet points and keep the structure easy to scan.",
    "- If the user asks for information that is not present in the PDF text, say that it is not found in the provided PDF context.",
    "",
    "PDF TEXT:",
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
    return `Assalamualaikum. PDF sudah terbaca, jadi AI bisa memakai isi PDF sebagai konteks untuk menjawab: "${latestMessage}".`;
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

async function generateOpenRouterReply(messages: ChatMessage[], pdfContext = "") {
  const messagesForOpenRouter = createOpenRouterMessages(messages, pdfContext);

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
    console.error("OpenRouter error:", response.status, errorText);
    throw new Error("OpenRouter request failed");
  }

  const data = await response.json();

  return data.choices?.[0]?.message?.content ?? "Maaf, AI belum memberikan jawaban.";
}

export async function generateChatReply(
  messages: ChatMessage[],
  pdfContext = "",
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

  const reply = await generateOpenRouterReply(messages, preparedPdfContext);

  return {
    reply,
    provider: "openrouter",
  };
}

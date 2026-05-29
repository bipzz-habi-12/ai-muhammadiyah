export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: "mock" | "openrouter";
};

const systemPrompt =
  "You are AI Muhammadiyah, a friendly Islamic education assistant. Answer clearly, politely, and in simple Indonesian.";
const openRouterModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
const maxPdfContextLength = 12000;

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

function createMockReply(messages: ChatMessage[], pdfContext = "") {
  const latestMessage = getLatestUserMessage(messages);
  const hasPdfContext = Boolean(preparePdfContext(pdfContext));

  if (!latestMessage) {
    return "Assalamualaikum. Silakan tulis pertanyaan terlebih dahulu.";
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
    { role: "system", content: systemPrompt },
    ...messages.map((message, index) => {
      const role = message.role === "ai" ? "assistant" : "user";
      const shouldAttachPdfContext =
        Boolean(preparedPdfContext) && index === latestUserIndex;

      return {
        role,
        content: shouldAttachPdfContext
          ? [
              "The user uploaded a PDF. Use the PDF text below as the document context for this question.",
              "If the answer is not found in the PDF text, say that clearly.",
              "",
              "PDF TEXT:",
              preparedPdfContext,
              "",
              "USER QUESTION:",
              message.text,
            ].join("\n")
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
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      reply: createMockReply(messages, pdfContext),
      provider: "mock",
    };
  }

  const reply = await generateOpenRouterReply(messages, pdfContext);

  return {
    reply,
    provider: "openrouter",
  };
}

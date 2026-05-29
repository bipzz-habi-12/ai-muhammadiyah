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

function getLatestUserMessage(messages: ChatMessage[]) {
  return messages.findLast((message) => message.role === "user")?.text ?? "";
}

function createMockReply(messages: ChatMessage[]) {
  const latestMessage = getLatestUserMessage(messages);

  if (!latestMessage) {
    return "Assalamualaikum. Silakan tulis pertanyaan terlebih dahulu.";
  }

  return `Assalamualaikum. Ini respon contoh untuk: "${latestMessage}". Nanti bagian ini bisa diganti dengan GPT atau Gemini saat API key sudah tersedia.`;
}

async function generateOpenRouterReply(messages: ChatMessage[]) {
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
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({
          role: message.role === "ai" ? "assistant" : "user",
          content: message.text,
        })),
      ],
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
): Promise<GenerateChatReplyResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      reply: createMockReply(messages),
      provider: "mock",
    };
  }

  const reply = await generateOpenRouterReply(messages);

  return {
    reply,
    provider: "openrouter",
  };
}

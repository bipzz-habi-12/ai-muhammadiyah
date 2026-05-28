export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type GenerateChatReplyResult = {
  reply: string;
  provider: "mock" | "openai";
};

const systemPrompt =
  "You are AI Muhammadiyah, a friendly Islamic education assistant. Answer clearly, politely, and in simple Indonesian.";

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

async function generateOpenAiReply(messages: ChatMessage[]) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      instructions: systemPrompt,
      input: messages.map((message) => ({
        role: message.role === "ai" ? "assistant" : "user",
        content: message.text,
      })),
      max_output_tokens: 350,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const data = await response.json();

  return data.output_text ?? "Maaf, AI belum memberikan jawaban.";
}

export async function generateChatReply(
  messages: ChatMessage[],
): Promise<GenerateChatReplyResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      reply: createMockReply(messages),
      provider: "mock",
    };
  }

  const reply = await generateOpenAiReply(messages);

  return {
    reply,
    provider: "openai",
  };
}

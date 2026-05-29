import { NextResponse } from "next/server";
import { generateChatReply, type ChatMessage } from "@/lib/ai/chat";

type ChatRequestBody = {
  messages?: ChatMessage[];
  pdfContext?: string;
  selectedModel?: string;
};

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const messages = body.messages ?? [];
    const pdfContext = body.pdfContext ?? "";
    const selectedModel = body.selectedModel ?? "auto";

    if (!Array.isArray(messages) || !messages.every(isChatMessage)) {
      return NextResponse.json(
        { error: "Format pesan tidak valid." },
        { status: 400 },
      );
    }

    if (typeof pdfContext !== "string") {
      return NextResponse.json(
        { error: "Konteks PDF tidak valid." },
        { status: 400 },
      );
    }

    if (typeof selectedModel !== "string") {
      return NextResponse.json(
        { error: "Pilihan model tidak valid." },
        { status: 400 },
      );
    }

    const result = await generateChatReply(messages, pdfContext, selectedModel);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI chat sedang bermasalah. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

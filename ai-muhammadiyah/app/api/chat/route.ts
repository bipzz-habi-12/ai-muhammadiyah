import { NextResponse } from "next/server";
import { generateChatReply, type ChatMessage } from "@/lib/ai/chat";

type ChatRequestBody = {
  history?: ChatMessage[];
  messages?: ChatMessage[];
  pdfContext?: string;
  selectedModel?: string;
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
    const body = (await request.json()) as ChatRequestBody;
    const rawHistory = body.history ?? body.messages ?? [];
    const pdfContext = body.pdfContext ?? "";
    const selectedModel = body.selectedModel ?? "auto";

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

    const safeHistory = createSafeHistory(rawHistory);
    const result = await generateChatReply(safeHistory, pdfContext, selectedModel);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI chat sedang bermasalah. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

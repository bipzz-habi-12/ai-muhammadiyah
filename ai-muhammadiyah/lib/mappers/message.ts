import type { Skill } from "@/lib/skills";
import { normalizeSelectedModel } from "./conversation";
import { resolveSkillIdFromLegacyValue } from "./legacy-study-mode";
import type { Message, MessageRow } from "./types";

const maxRecentChatMessages = 10;
const maxMessageTextLength = 2000;

export function mapMessageRow(row: MessageRow, skills: Skill[]): Message {
  return {
    id: row.id,
    role: row.role === "assistant" ? "ai" : "user",
    text: row.content,
    createdAt: row.created_at,
    model: normalizeSelectedModel(row.selected_model),
    skillId: resolveSkillIdFromLegacyValue(row.study_mode, skills),
    documentMetadata: row.document_metadata,
  };
}

export function truncateMessageText(text: string) {
  const trimmedText = text.trim();

  if (trimmedText.length <= maxMessageTextLength) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, maxMessageTextLength)}\n[Pesan dipotong agar memori chat tetap ringan.]`;
}

export function getRecentChatHistory(messages: Message[]) {
  // Keep only recent, useful messages so the browser state and API prompt stay small.
  return messages
    .filter((message) => message.text.trim())
    .slice(-maxRecentChatMessages)
    .map((message) => ({
      role: message.role,
      text: truncateMessageText(message.text),
    }));
}

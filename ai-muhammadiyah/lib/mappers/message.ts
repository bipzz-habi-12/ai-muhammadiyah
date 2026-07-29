import {
  maxSingleMessageTokens,
  trimHistoryToTokenBudget,
  truncateToTokens,
} from "@/lib/ai/context-window";
import type { Skill } from "@/lib/skills";
import { normalizeSelectedModel } from "./conversation";
import { resolveSkillIdFromLegacyValue } from "./legacy-study-mode";
import type { Message, MessageRow } from "./types";

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
  return truncateToTokens(text, maxSingleMessageTokens);
}

export function getRecentChatHistory(messages: Message[]) {
  // Kirim riwayat sebanyak yang muat di anggaran context window, bukan N pesan
  // terakhir — percakapan panjang tidak lagi kehilangan awalnya.
  return trimHistoryToTokenBudget(
    messages.map((message) => ({ role: message.role, text: message.text })),
  );
}

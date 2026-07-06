import type { PlanModelId } from "@/lib/subscriptions/plans";
import type { Skill } from "@/lib/skills";
import { resolveSkillIdFromLegacyValue } from "./legacy-study-mode";
import type { Conversation, ConversationRow, Workspace } from "./types";

export function normalizeSelectedModel(value?: string | null): PlanModelId {
  if (
    value === "fast" ||
    value === "smart" ||
    value === "document" ||
    value === "auto"
  ) {
    return value;
  }

  return "auto";
}

export function mapConversationRow(
  row: ConversationRow,
  skills: Skill[],
): Conversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    model: normalizeSelectedModel(row.selected_model),
    skillId: resolveSkillIdFromLegacyValue(row.study_mode, skills),
    documentMetadata: row.document_metadata,
    workspaceId: row.workspace_id,
    isPinned: Boolean(row.is_pinned),
  };
}

export function createConversationTitle(text: string) {
  const stopWords = new Set([
    "aku",
    "apa",
    "bantu",
    "buat",
    "dan",
    "dengan",
    "di",
    "ini",
    "itu",
    "jelaskan",
    "ke",
    "mohon",
    "saya",
    "tentang",
    "tolong",
    "untuk",
    "yang",
  ]);
  const normalizedText = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedText) {
    return "Obrolan baru";
  }

  const words = normalizedText
    .split(" ")
    .map((word) => word.replace(/[^\p{L}\p{N}+/.-]/gu, ""))
    .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
    .slice(0, 8);
  const title = words.length >= 3 ? words.join(" ") : normalizedText;
  const tidyTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return tidyTitle.length > 56 ? `${tidyTitle.slice(0, 56)}...` : tidyTitle;
}

export function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((first, second) => {
    if (first.isPinned !== second.isPinned) {
      return first.isPinned ? -1 : 1;
    }

    return (
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    );
  });
}

export function groupConversationsByWorkspace(
  conversations: Conversation[],
  workspaces: Workspace[],
) {
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.name]),
  );
  const pinned = sortConversations(
    conversations.filter((conversation) => conversation.isPinned),
  );
  const workspaceGroups = new Map<string, Conversation[]>();

  for (const conversation of conversations) {
    if (conversation.isPinned) {
      continue;
    }

    const workspaceName = conversation.workspaceId
      ? workspaceById.get(conversation.workspaceId) ?? "Workspace lama"
      : "General";
    workspaceGroups.set(workspaceName, [
      ...(workspaceGroups.get(workspaceName) ?? []),
      conversation,
    ]);
  }

  const groups = Array.from(workspaceGroups.entries())
    .map(([label, items]) => ({
      label,
      items: sortConversations(items),
    }))
    .sort((first, second) => {
      if (first.label === "General") return -1;
      if (second.label === "General") return 1;
      return first.label.localeCompare(second.label);
    });

  return pinned.length ? [{ label: "Pinned", items: pinned }, ...groups] : groups;
}

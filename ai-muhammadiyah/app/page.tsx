"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyUserMemory,
  loadUserMemory,
  sanitizeUserMemory,
  updateUserMemory,
  type UserMemory,
} from "@/lib/memory/user-memory";
import {
  canUseStudyMode,
  defaultStudyMode,
  getStudyModeBadge,
  normalizeStudyMode,
  resolveAllowedStudyMode,
  studyModeCatalog,
  studyModeOptions,
  type StudyModeId,
} from "@/lib/study-modes";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getPlanByTier,
  getUpgradePlanForModel,
  modelCatalog,
  subscriptionPlans,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import {
  normalizeUsageSnapshot,
  tierLabels,
  type UsageSnapshot,
} from "@/lib/usage/limits";

type Message = {
  id?: string;
  role: "user" | "ai";
  text: string;
  createdAt?: string;
  model?: SelectedModel;
  studyMode?: SelectedStudyMode;
  documentMetadata?: DocumentMetadata | null;
  continuationSuggested?: boolean;
};

type DocumentStatus = "idle" | "loading" | "loaded" | "error";
type UploadedDocumentType =
  | "PDF"
  | "Word"
  | "PowerPoint"
  | "Excel"
  | "Image"
  | "Dokumen";
type UploadedAttachmentKind = "document" | "image";

type SelectedModel = PlanModelId;
type SelectedStudyMode = StudyModeId;
type SettingsTab =
  | "general"
  | "personalization"
  | "subscription"
  | "data"
  | "security"
  | "documents"
  | "knowledge";

type DocumentMetadata = {
  fileName: string;
  fileType: UploadedDocumentType;
  status: Exclude<DocumentStatus, "idle">;
  files?: {
    fileName: string;
    fileType: UploadedDocumentType;
    status: Exclude<DocumentStatus, "idle">;
    kind?: UploadedAttachmentKind;
  }[];
};

type UploadedAttachment = {
  id: string;
  fileName: string;
  fileType: UploadedDocumentType;
  kind: UploadedAttachmentKind;
  status: Exclude<DocumentStatus, "idle">;
  text?: string;
  mimeType?: string;
  data?: string;
  error?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: SelectedModel;
  studyMode: SelectedStudyMode;
  documentMetadata: DocumentMetadata | null;
  workspaceId: string | null;
  isPinned: boolean;
};

type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  selected_model: string | null;
  study_mode: string | null;
  document_metadata: DocumentMetadata | null;
  workspace_id: string | null;
  is_pinned: boolean | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  selected_model: string | null;
  study_mode: string | null;
  document_metadata: DocumentMetadata | null;
};

type KnowledgeSource = {
  id: string;
  title: string;
  category: string;
  fileType: string;
  originalFileName: string | null;
  status: "active" | "draft" | "archived";
  chunkCount: number;
  createdAt: string;
};

type Workspace = {
  id: string;
  name: string;
  createdAt: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
  created_at: string;
};

const maxRecentChatMessages = 10;
const maxMessageTextLength = 2000;
const maxDocumentUploadBytes = 25 * 1024 * 1024;
const maxRecentFiles = 6;
const documentExtractionTimeoutMs = 60_000;
const streamUiFlushMs = 48;
const continuationMarker = "[[AI_MU_CONTINUE_SUGGESTED]]";

const welcomeMessage: Message = {
  role: "ai",
  text: "Assalamualaikum. Saya AI Muhammadiyah, siap membantu belajar Islam, Cambridge, OSN/STEM, dan coding.",
};

const modelOptions: SelectedModel[] = ["auto", "fast", "smart", "document"];

function getModelProviderLabel(model: SelectedModel) {
  if (model === "smart") {
    return "Powered by GPT-5 mini";
  }

  if (model === "document") {
    return "Powered by Gemini 2.5 Pro";
  }

  return "Powered by Gemini";
}

function getLockedModelRequirement(model: SelectedModel) {
  if (model === "smart") {
    return "Requires Muallim Pro or higher";
  }

  if (model === "document") {
    return "Requires Muallim Pro or higher";
  }

  return `Mulai dari ${getUpgradePlanForModel(model).name}`;
}

function getLockedStudyModeRequirement(mode: SelectedStudyMode) {
  if (mode === "osn_coach") {
    return "Requires Premium for olympiad coaching";
  }

  if (mode === "research_mode") {
    return "Requires Premium for academic depth";
  }

  if (mode === "step_by_step") {
    return "Requires Premium for full guided solving";
  }

  return "Available in your plan";
}

const settingsTabs: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "personalization", label: "Personalization" },
  { id: "subscription", label: "Subscription" },
  { id: "data", label: "Data Controls" },
  { id: "security", label: "Security" },
  { id: "documents", label: "Documents" },
  { id: "knowledge", label: "Knowledge Base" },
];

const languageOptions = [
  { label: "Auto", value: "" },
  { label: "Indonesian", value: "Bahasa Indonesia sederhana" },
  { label: "English", value: "English" },
];

const supportedDocumentAccept =
  "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,image/png,.png,image/jpeg,.jpg,.jpeg,image/webp,.webp";

const quickPrompts = [
  {
    icon: "book",
    title: "Ringkas tafsir",
    description: "Surat Al-Kahfi ayat 1-10",
  },
  {
    icon: "cap",
    title: "Bantu pelajaran",
    description: "Matematika kelas 9 SMP Muhammadiyah",
  },
  {
    icon: "idea",
    title: "Ide kegiatan",
    description: "Ramadan untuk remaja masjid",
  },
  {
    icon: "heart",
    title: "Doa harian",
    description: "Sebelum belajar & bekerja",
  },
];

function truncateMessageText(text: string) {
  const trimmedText = text.trim();

  if (trimmedText.length <= maxMessageTextLength) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, maxMessageTextLength)}\n[Pesan dipotong agar memori chat tetap ringan.]`;
}

function getRecentChatHistory(messages: Message[]) {
  // Keep only recent, useful messages so the browser state and API prompt stay small.
  return messages
    .filter((message) => message.text.trim())
    .slice(-maxRecentChatMessages)
    .map((message) => ({
      role: message.role,
      text: truncateMessageText(message.text),
    }));
}

function normalizeSelectedModel(value?: string | null): SelectedModel {
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

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    model: normalizeSelectedModel(row.selected_model),
    studyMode: normalizeStudyMode(row.study_mode),
    documentMetadata: row.document_metadata,
    workspaceId: row.workspace_id,
    isPinned: Boolean(row.is_pinned),
  };
}

function mapWorkspaceRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role === "assistant" ? "ai" : "user",
    text: row.content,
    createdAt: row.created_at,
    model: normalizeSelectedModel(row.selected_model),
    studyMode: normalizeStudyMode(row.study_mode),
    documentMetadata: row.document_metadata,
  };
}

function createConversationTitle(text: string) {
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

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((first, second) => {
    if (first.isPinned !== second.isPinned) {
      return first.isPinned ? -1 : 1;
    }

    return (
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    );
  });
}

function groupConversationsByWorkspace(
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

function getLoadedDocumentText(attachments: UploadedAttachment[]) {
  return attachments
    .filter(
      (attachment) =>
        attachment.kind === "document" &&
        attachment.status === "loaded" &&
        attachment.text,
    )
    .map(
      (attachment) =>
        `FILE: ${attachment.fileName} (${attachment.fileType})\n${attachment.text}`,
    )
    .join("\n\n---\n\n");
}

function getAttachmentStatus(attachments: UploadedAttachment[]): DocumentStatus {
  if (attachments.some((attachment) => attachment.status === "error")) {
    return "error";
  }

  if (attachments.some((attachment) => attachment.status === "loading")) {
    return "loading";
  }

  return attachments.length ? "loaded" : "idle";
}

function sanitizeRecentAttachment(attachment: UploadedAttachment) {
  const compactAttachment = { ...attachment };

  if (compactAttachment.kind === "image") {
    delete compactAttachment.data;
  }

  return compactAttachment;
}

function getFriendlyChatError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Maaf, chat AI sedang bermasalah. Silakan coba lagi.";
  }

  if (
    error.message === "Chat API request failed" ||
    error.message === "Chat stream is unavailable" ||
    error.message === "Chat stream returned an empty reply"
  ) {
    return "Maaf, chat AI sedang bermasalah. Silakan coba lagi.";
  }

  return error.message;
}

function parseContinuationMarker(text: string) {
  const needsContinuation = text.includes(continuationMarker);
  const cleanText = text.replaceAll(continuationMarker, "").trimEnd();

  return {
    text: cleanText,
    needsContinuation:
      needsContinuation || looksLikeIncompleteAssistantReply(cleanText),
  };
}

function looksLikeIncompleteAssistantReply(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }

  const lines = trimmedText.split(/\r?\n/).filter(Boolean);
  const lastLine = lines.at(-1)?.trim() ?? "";
  const lowerText = trimmedText.toLowerCase();
  const lowerLastLine = lastLine.toLowerCase();

  if (/[.!?。؟)]$/.test(trimmedText)) {
    return false;
  }

  if (trimmedText.endsWith(":")) {
    return true;
  }

  if (/^([-*•]|\d+[.)])\s*$/.test(lastLine)) {
    return true;
  }

  if (/^([-*•]|\d+[.)])\s+\S{0,32}$/.test(lastLine) && !/[.!?)]$/.test(lastLine)) {
    return true;
  }

  const unfinishedPhrases = [
    "berikut",
    "yaitu",
    "antara lain",
    "sebagai berikut",
    "di antaranya",
    "mencakup",
    "meliputi",
    "contohnya",
    "adalah",
    "then",
    "such as",
    "including",
  ];

  return unfinishedPhrases.some(
    (phrase) =>
      lowerText.endsWith(phrase) ||
      lowerLastLine.endsWith(phrase) ||
      lowerLastLine.endsWith(`${phrase}:`),
  );
}

// Disabled while math is normalized to plain readable text instead of stacked UI.
function isSimpleMathToken(value: string) {
  return /^[A-Za-z0-9\s()+\-.,²³⁰¹⁴⁵⁶⁷⁸⁹]+$/.test(value);
}

// Disabled while math is normalized to plain readable text instead of stacked UI.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renderMathFragments(text: string, keyPrefix: string): ReactNode[] {
  const fragments: ReactNode[] = [];
  const pattern =
    /(sqrt\(([^()\n]+)\)|(\([^()\n]{1,80}\)|[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹][A-Za-z0-9\s()+\-.,²³⁰¹⁴⁵⁶⁷⁸⁹]{0,60})\s+\/\s+([A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹][A-Za-z0-9\s()+\-.,²³⁰¹⁴⁵⁶⁷⁸⁹]{0,40}))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      fragments.push(text.slice(lastIndex, match.index));
    }

    if (match[1].startsWith("sqrt(")) {
      const radicand = match[2].trim();
      const needsParentheses = /[\s+\-*/]/.test(radicand);
      fragments.push(
        <span key={`${keyPrefix}-sqrt-${match.index}`}>
          √{needsParentheses ? `(${radicand})` : radicand}
        </span>,
      );
    } else {
      const numerator = match[3].trim();
      const denominator = match[4].trim();

      if (isSimpleMathToken(numerator) && isSimpleMathToken(denominator)) {
        fragments.push(
          <span
            key={`${keyPrefix}-frac-${match.index}`}
            className="mx-0.5 inline-flex translate-y-[0.18em] flex-col items-center align-middle leading-none"
          >
            <span className="border-b border-current px-1 pb-0.5">
              {numerator}
            </span>
            <span className="px-1 pt-0.5">{denominator}</span>
          </span>,
        );
      } else {
        fragments.push(match[0]);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    fragments.push(text.slice(lastIndex));
  }

  return fragments;
}

function normalizeMathText(text: string) {
  // Example: "$\\frac{x^2 + 2*x + 1}{3}$" -> "(x² + 2 × x + 1) ÷ 3"
  // Example: "sqrt(x+1)" -> "√(x + 1)"
  return text
    .replace(/`([^`\n]*(?:\\frac|\\sqrt|sqrt\(|\^|\s\/\s|\*)[^`\n]*)`/gi, "$1")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) ÷ ($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\bsqrt\(([^()\n]+)\)/gi, (_, radicand: string) => {
      const cleanRadicand = radicand.trim().replace(/\s*([+\-])\s*/g, " $1 ");
      return `√(${cleanRadicand.replace(/\s+/g, " ")})`;
    })
    .replace(/\^([+-]?\d+)/g, (_, power: string) => toSuperscriptV2(power))
    .replace(/(\b[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹]+|\))\s*\*\s*(\(?[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹]+)/g, "$1 × $2")
    .replace(/(?<!https?:)(\b[A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹)]+)\s+\/\s+([A-Za-z0-9²³⁰¹⁴⁵⁶⁷⁸⁹(]+)/g, "$1 ÷ $2")
    .replace(/\b([a-zA-Z])2\b/g, "$1²")
    .replace(/\b([a-zA-Z])3\b/g, "$1³")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderInlineMarkdown(text: string) {
  const cleanText = normalizeMathText(text);
  const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-[#0f3025]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function toSuperscript(value: string) {
  const superscripts: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
  };

  return value
    .split("")
    .map((character) => superscripts[character] ?? character)
    .join("");
}

// Kept only to avoid risky churn around older encoded characters in this file.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMathLikeText(text: string) {
  return text
    .replace(/\^([+-]?\d+)/g, (_, power: string) => toSuperscript(power))
    .replace(/(\d|\w)\s*\*\s*(\d|\w)/g, "$1 × $2")
    .replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, "$1 ÷ $2")
    .replace(/\b([a-zA-Z])2\b/g, "$1²")
    .replace(/\b([a-zA-Z])3\b/g, "$1³");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMathLikeTextV2(text: string) {
  return text
    .replace(/\^([+-]?\d+)/g, (_, power: string) => toSuperscriptV2(power))
    .replace(/(\d|\w)\s*\*\s*(\d|\w)/g, "$1 × $2")
    .replace(/\bsqrt\(([^()\n]+)\)/gi, (_, radicand: string) => {
      const cleanRadicand = radicand.trim();
      return /[\s+\-*/]/.test(cleanRadicand)
        ? `√(${cleanRadicand})`
        : `√${cleanRadicand}`;
    })
    .replace(/\b([a-zA-Z])2\b/g, "$1²")
    .replace(/\b([a-zA-Z])3\b/g, "$1³");
}

function toSuperscriptV2(value: string) {
  const superscripts: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
  };

  return value
    .split("")
    .map((character) => superscripts[character] ?? character)
    .join("");
}

const MarkdownMessage = memo(function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let orderedItems: ReactNode[] = [];

  function flushLists() {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-3 list-disc space-y-1 pl-5">
          {listItems}
        </ul>,
      );
      listItems = [];
    }

    if (orderedItems.length) {
      elements.push(
        <ol
          key={`ol-${elements.length}`}
          className="my-3 list-decimal space-y-1 pl-5"
        >
          {orderedItems}
        </ol>,
      );
      orderedItems = [];
    }
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushLists();
      return;
    }

    const heading = trimmedLine.match(/^(#{2,4})\s+(.+)$/);
    const bullet = trimmedLine.match(/^[-*]\s+(.+)$/);
    const ordered = trimmedLine.match(/^\d+\.\s+(.+)$/);

    if (heading) {
      flushLists();
      const levelClass =
        heading[1].length === 2
          ? "mt-4 text-lg"
          : "mt-3 text-base";

      elements.push(
        <h3
          key={`h-${index}`}
          className={`${levelClass} font-bold leading-snug text-[#0f3025] first:mt-0`}
        >
          {renderInlineMarkdown(heading[2])}
        </h3>,
      );
      return;
    }

    if (trimmedLine === "---") {
      flushLists();
      elements.push(
        <hr key={`hr-${index}`} className="my-4 border-[#d8eadf]" />,
      );
      return;
    }

    if (bullet) {
      orderedItems = [];
      listItems.push(
        <li key={`li-${index}`} className="pl-1">
          {renderInlineMarkdown(bullet[1])}
        </li>,
      );
      return;
    }

    if (ordered) {
      listItems = [];
      orderedItems.push(
        <li key={`oli-${index}`} className="pl-1">
          {renderInlineMarkdown(ordered[1])}
        </li>,
      );
      return;
    }

    flushLists();
    elements.push(
      <p key={`p-${index}`} className="my-2 first:mt-0 last:mb-0">
        {renderInlineMarkdown(trimmedLine)}
      </p>,
    );
  });

  flushLists();

  return <div className="space-y-1">{elements}</div>;
});

async function fetchUsageSnapshot() {
  const response = await fetch("/api/usage", {
    method: "GET",
    cache: "no-store",
  });
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error ?? "Status penggunaan belum bisa dimuat.");
  }

  return normalizeUsageSnapshot(data);
}

function getEmailInitials(email: string) {
  const cleanEmail = email.trim();

  if (!cleanEmail) {
    return "AM";
  }

  const [namePart] = cleanEmail.split("@");
  const namePieces = namePart.split(/[._-]+/).filter(Boolean);

  if (namePieces.length >= 2) {
    return `${namePieces[0][0]}${namePieces[1][0]}`.toUpperCase();
  }

  return cleanEmail.slice(0, 2).toUpperCase();
}

function getUploadedDocumentType(fileName: string): UploadedDocumentType {
  if (
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp")
  ) {
    return "Image";
  }

  if (fileName.endsWith(".docx")) {
    return "Word";
  }

  if (fileName.endsWith(".pptx")) {
    return "PowerPoint";
  }

  if (fileName.endsWith(".xlsx")) {
    return "Excel";
  }

  return "PDF";
}

function getAttachmentKind(file: File): UploadedAttachmentKind {
  const fileName = file.name.toLowerCase();

  return file.type.startsWith("image/") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp")
    ? "image"
    : "document";
}

function isSupportedUpload(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    file.type === "application/pdf" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".docx") ||
    fileName.endsWith(".pptx") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp")
  );
}

async function extractDocumentFromLocalUpload(file: File) {
  const formData = new FormData();
  formData.append("document", file);
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, documentExtractionTimeoutMs);

  try {
    const response = await fetch("/api/document", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = (await response.json()) as {
      error?: string;
      fileName?: string;
      fileType?: "pdf" | "docx" | "pptx" | "xlsx" | "png" | "jpeg" | "webp";
      kind?: UploadedAttachmentKind;
      mimeType?: string;
      data?: string;
      text?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Dokumen belum bisa dibaca.");
    }

    return data;
  } catch (error) {
    if (
      didTimeout ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      throw new Error(
        "File belum selesai dibaca setelah 60 detik. Silakan coba lagi atau gunakan file yang lebih kecil.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchKnowledgeSources() {
  const response = await fetch("/api/knowledge", {
    method: "GET",
    cache: "no-store",
  });
  const data = (await response.json()) as {
    error?: string;
    isAdmin?: boolean;
    sources?: KnowledgeSource[];
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Knowledge base belum bisa dimuat.");
  }

  return {
    isAdmin: Boolean(data.isAdmin),
    sources: data.sources ?? [],
  };
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3.5"
    >
      <path d="M29 5l-4.1 13.7L12 23l12.9 4.3L29 41l4.1-13.7L46 23l-12.9-4.3L29 5Z" />
      <path d="M12 6l-1.8 5.2L5 13l5.2 1.8L12 20l1.8-5.2L19 13l-5.2-1.8L12 6Z" />
      <path d="M10 35a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M40 8v7" />
      <path d="M36.5 11.5h7" />
    </svg>
  );
}

function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
        <path d="M8 2v15" />
      </svg>
    );
  }

  if (name === "cap") {
    return (
      <svg {...common}>
        <path d="m22 10-10-5-10 5 10 5 10-5Z" />
        <path d="M6 12.5V16c2.8 2 9.2 2 12 0v-3.5" />
      </svg>
    );
  }

  if (name === "idea") {
    return (
      <svg {...common}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.4 14.8A6 6 0 1 1 15.6 15c-.7.5-1.1 1.2-1.2 2h-4.8c-.1-.9-.5-1.6-1.2-2.2Z" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
        <path d="M6 11h12v10H6z" />
      </svg>
    );
  }

  if (name === "pin") {
    return (
      <svg {...common}>
        <path d="m15 4 5 5" />
        <path d="m14 10 4-4" />
        <path d="M5 19l5-5" />
        <path d="m9 15-2-2 6-6 4 4-6 6-2-2Z" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.1a2 2 0 0 1 0 4h-.1a1.8 1.8 0 0 0-1.7 1Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchConversations, setSearchConversations] = useState<
    Conversation[] | null
  >(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [renamingConversationId, setRenamingConversationId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [uploadedAttachments, setUploadedAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const [recentAttachments, setRecentAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const [sharePreview, setSharePreview] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>("idle");
  const [documentError, setDocumentError] = useState("");
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [composerNotice, setComposerNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingFirstChunk, setIsAwaitingFirstChunk] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SelectedModel>("auto");
  const [selectedStudyMode, setSelectedStudyMode] =
    useState<SelectedStudyMode>(defaultStudyMode);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isStudyModeMenuOpen, setIsStudyModeMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeTargetModel, setUpgradeTargetModel] =
    useState<SelectedModel>("smart");
  const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);
  const [usageError, setUsageError] = useState("");
  const [learningProfile, setLearningProfile] =
    useState<UserMemory>(emptyUserMemory);
  const [profileDraft, setProfileDraft] = useState<UserMemory>(emptyUserMemory);
  const [favoriteSubjectsDraft, setFavoriteSubjectsDraft] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("general");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSavedMessage, setProfileSavedMessage] = useState("");
  const [settingsDataMessage, setSettingsDataMessage] = useState("");
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [isKnowledgeAdmin, setIsKnowledgeAdmin] = useState(false);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("kemuhammadiyahan");
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [knowledgeError, setKnowledgeError] = useState("");
  const documentTextRef = useRef("");
  const activeRequestRef = useRef<AbortController | null>(null);
  const uploadKeysInFlightRef = useRef(new Set<string>());
  const uploadFilesByAttachmentIdRef = useRef(new Map<string, File>());
  const scrollFrameRef = useRef<number | null>(null);
  const hasLoadedKnowledgeRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const userInitials = useMemo(() => getEmailInitials(userEmail), [userEmail]);
  const visibleConversations = useMemo(
    () => searchConversations ?? conversations,
    [conversations, searchConversations],
  );
  const conversationGroups = useMemo(
    () => groupConversationsByWorkspace(visibleConversations, workspaces),
    [visibleConversations, workspaces],
  );
  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ),
    [activeConversationId, conversations],
  );
  const currentTierLabel = usageSnapshot
    ? tierLabels[usageSnapshot.tier]
    : "Memuat";
  const allowedModels = usageSnapshot?.allowedModels ?? ["auto", "fast"];
  const selectedModelInfo = modelCatalog[selectedModel];
  const selectedStudyModeInfo = studyModeCatalog[selectedStudyMode];
  const selectedStudyModeBadge = getStudyModeBadge(
    selectedStudyMode,
    usageSnapshot?.tier,
  );
  const upgradePlan = getUpgradePlanForModel(upgradeTargetModel);
  const currentPlan = usageSnapshot ? getPlanByTier(usageSnapshot.tier) : null;
  const hasMessageQuota =
    !usageSnapshot || usageSnapshot.remainingMessagesToday > 0;
  const hasUploadQuota =
    !usageSnapshot || usageSnapshot.remainingUploadsToday > 0;
  const profileLabel = useMemo(
    () =>
      learningProfile.displayName ||
      learningProfile.schoolLevel ||
      "Lengkapi profil",
    [learningProfile.displayName, learningProfile.schoolLevel],
  );

  const loadConversations = useCallback(async () => {
    setHistoryError("");
    setIsLoadingConversations(true);

    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
      )
      .order("updated_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error(error);
      setHistoryError("Riwayat obrolan belum bisa dimuat.");
      setIsLoadingConversations(false);
      return;
    }

    setConversations(
      sortConversations(((data ?? []) as ConversationRow[]).map(mapConversationRow)),
    );
    setIsLoadingConversations(false);
  }, [supabase]);

  const loadWorkspaces = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_workspaces")
      .select("id,name,created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setHistoryError("Workspace belum bisa dimuat.");
      return;
    }

    setWorkspaces(((data ?? []) as WorkspaceRow[]).map(mapWorkspaceRow));
  }, [supabase]);

  const loadUsage = useCallback(async () => {
    try {
      setUsageError("");
      const snapshot = await fetchUsageSnapshot();
      setUsageSnapshot(snapshot);

      setSelectedModel((currentModel) =>
        snapshot && !snapshot.allowedModels.includes(currentModel)
          ? "auto"
          : currentModel,
      );
      setSelectedStudyMode((currentMode) =>
        resolveAllowedStudyMode(currentMode, snapshot?.tier),
      );
    } catch (error) {
      console.error(error);
      setUsageSnapshot(null);
      setUsageError(
        error instanceof Error
          ? error.message
          : "Status penggunaan belum bisa dimuat.",
      );
    }
  }, []);

  const loadKnowledge = useCallback(async () => {
    try {
      setIsLoadingKnowledge(true);
      setKnowledgeError("");
      const data = await fetchKnowledgeSources();
      setKnowledgeSources(data.sources);
      setIsKnowledgeAdmin(data.isAdmin);
      hasLoadedKnowledgeRef.current = true;
    } catch (error) {
      console.error(error);
      setKnowledgeError(
        error instanceof Error
          ? error.message
          : "Knowledge base belum bisa dimuat.",
      );
    } finally {
      setIsLoadingKnowledge(false);
    }
  }, []);

  const loadLearningProfile = useCallback(
    async (currentUserId: string) => {
      try {
        setProfileError("");
        const memory = await loadUserMemory(supabase, currentUserId);
        setLearningProfile(memory);
        setProfileDraft(memory);
        setFavoriteSubjectsDraft(memory.favoriteSubjects.join(", "));
        setSelectedModel(memory.defaultModel);
        setSelectedStudyMode(
          normalizeStudyMode(
            window.localStorage.getItem("ai-mu-study-mode") ??
              memory.defaultStudyMode,
          ),
        );
      } catch (error) {
        console.error(error);
        setProfileError("Learning Profile belum bisa dimuat.");
      }
    },
    [supabase],
  );

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");
      await Promise.all([
        loadWorkspaces(),
        loadConversations(),
        loadUsage(),
        loadLearningProfile(user.id),
      ]);
    }

    loadUser();
  }, [
    loadConversations,
    loadLearningProfile,
    loadUsage,
    loadWorkspaces,
    router,
    supabase,
  ]);

  useEffect(() => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: isSending ? "auto" : "smooth",
        block: "end",
      });
      scrollFrameRef.current = null;
    });

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [messages.length, isSending]);

  useEffect(() => {
    document.documentElement.dataset.theme = learningProfile.themePreference;
  }, [learningProfile.themePreference]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (
      isSettingsOpen &&
      activeSettingsTab === "knowledge" &&
      !hasLoadedKnowledgeRef.current &&
      !isLoadingKnowledge
    ) {
      void loadKnowledge();
    }
  }, [activeSettingsTab, isLoadingKnowledge, isSettingsOpen, loadKnowledge]);

  useEffect(() => {
    window.localStorage.setItem("ai-mu-study-mode", selectedStudyMode);
  }, [selectedStudyMode]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const storedRecentFiles = window.localStorage.getItem(
      `ai-mu-recent-files-${userId}`,
    );

    if (!storedRecentFiles) {
      return;
    }

    try {
      const parsedFiles = JSON.parse(storedRecentFiles) as UploadedAttachment[];
      window.queueMicrotask(() => {
        setRecentAttachments(
          parsedFiles.filter(
            (attachment) =>
              typeof attachment.id === "string" &&
              typeof attachment.fileName === "string" &&
              attachment.status === "loaded",
          ),
        );
      });
    } catch {
      window.localStorage.removeItem(`ai-mu-recent-files-${userId}`);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    window.localStorage.setItem(
      `ai-mu-recent-files-${userId}`,
      JSON.stringify(
        recentAttachments
          .slice(0, maxRecentFiles)
          .map(sanitizeRecentAttachment),
      ),
    );
  }, [recentAttachments, userId]);

  useEffect(() => {
    const query = chatSearch.trim();

    if (!query) {
      window.queueMicrotask(() => setSearchConversations(null));
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setHistoryError("");

      const titleMatches = await supabase
        .from("conversations")
        .select(
          "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
        )
        .ilike("title", `%${query}%`)
        .limit(30);
      const messageMatches = await supabase
        .from("messages")
        .select("conversation_id")
        .ilike("content", `%${query}%`)
        .limit(60);

      if (titleMatches.error || messageMatches.error) {
        console.error(titleMatches.error ?? messageMatches.error);
        setHistoryError("Pencarian obrolan belum bisa dijalankan.");
        return;
      }

      const conversationIds = Array.from(
        new Set(
          ((messageMatches.data ?? []) as { conversation_id: string }[]).map(
            (row) => row.conversation_id,
          ),
        ),
      );
      const messageConversationMatches = conversationIds.length
        ? await supabase
            .from("conversations")
            .select(
              "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
            )
            .in("id", conversationIds)
        : { data: [], error: null };

      if (messageConversationMatches.error) {
        console.error(messageConversationMatches.error);
        setHistoryError("Hasil pesan belum bisa dimuat.");
        return;
      }

      const byId = new Map<string, Conversation>();
      for (const row of [
        ...((titleMatches.data ?? []) as ConversationRow[]),
        ...((messageConversationMatches.data ?? []) as ConversationRow[]),
      ]) {
        const conversation = mapConversationRow(row);
        byId.set(conversation.id, conversation);
      }

      setSearchConversations(sortConversations(Array.from(byId.values())));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [chatSearch, supabase]);

  function getCurrentDocumentMetadata(): DocumentMetadata | null {
    if (!uploadedAttachments.length) {
      return null;
    }

    const primaryAttachment = uploadedAttachments[0];

    return {
      fileName:
        uploadedAttachments.length > 1
          ? `${uploadedAttachments.length} files uploaded`
          : primaryAttachment.fileName,
      fileType:
        uploadedAttachments.length > 1 ? "Dokumen" : primaryAttachment.fileType,
      status: uploadedAttachments.some((attachment) => attachment.status === "error")
        ? "error"
        : uploadedAttachments.some((attachment) => attachment.status === "loading")
          ? "loading"
          : "loaded",
      files: uploadedAttachments.map((attachment) => ({
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        status: attachment.status,
        kind: attachment.kind,
      })),
    };
  }

  function resetDocumentState() {
    setUploadedAttachments([]);
    documentTextRef.current = "";
    setDocumentText("");
    setDocumentStatus("idle");
    setDocumentError("");
    setComposerNotice("");
  }

  function rememberLoadedAttachments(attachments: UploadedAttachment[]) {
    const reusableAttachments = attachments
      .filter(
        (attachment) =>
          attachment.status === "loaded" &&
          attachment.kind === "document" &&
          attachment.text,
      )
      .map((attachment) => ({
        ...sanitizeRecentAttachment(attachment),
        id: `${attachment.fileName}-${crypto.randomUUID()}`,
      }));

    if (!reusableAttachments.length) {
      return;
    }

    setRecentAttachments((current) => {
      const next = [...reusableAttachments, ...current].filter(
        (attachment, index, allAttachments) =>
          allAttachments.findIndex(
            (candidate) => candidate.fileName === attachment.fileName,
          ) === index,
      );

      return next.slice(0, maxRecentFiles);
    });
  }

  function reuseRecentAttachment(attachment: UploadedAttachment) {
    const nextAttachment = {
      ...attachment,
      id: `${attachment.fileName}-${crypto.randomUUID()}`,
    };

    setUploadedAttachments((current) => [...current, nextAttachment]);

    if (nextAttachment.kind === "document" && nextAttachment.text) {
      documentTextRef.current = getLoadedDocumentText([
        ...uploadedAttachments,
        nextAttachment,
      ]);
      setDocumentText(documentTextRef.current);
    }

    setDocumentStatus("loaded");
    setDocumentError("");
    setComposerNotice(`${attachment.fileName} dipakai lagi di chat ini.`);
    setIsAttachMenuOpen(false);
  }

  function removeAttachment(attachmentId: string) {
    uploadFilesByAttachmentIdRef.current.delete(attachmentId);
    setUploadedAttachments((current) => {
      const nextAttachments = current.filter(
        (attachment) => attachment.id !== attachmentId,
      );

      documentTextRef.current = getLoadedDocumentText(nextAttachments);
      setDocumentText(documentTextRef.current);
      setDocumentStatus(getAttachmentStatus(nextAttachments));
      setDocumentError(
        nextAttachments.find((attachment) => attachment.status === "error")
          ?.error ?? "",
      );

      return nextAttachments;
    });
  }

  function syncAttachmentState(attachments: UploadedAttachment[]) {
    documentTextRef.current = getLoadedDocumentText(attachments);
    setDocumentText(documentTextRef.current);
    setDocumentStatus(getAttachmentStatus(attachments));
    setDocumentError(
      attachments.find((attachment) => attachment.status === "error")?.error ?? "",
    );
    rememberLoadedAttachments(attachments);
  }

  async function readUploadedAttachment(file: File, attachmentId: string) {
    if (!isSupportedUpload(file)) {
      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error",
                error:
                  "Format belum didukung. Gunakan PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, atau WEBP.",
              }
            : attachment,
        ),
      );
      return;
    }

    if (file.size > maxDocumentUploadBytes) {
      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error",
                error: "Ukuran file terlalu besar. Maksimal 25 MB per file.",
              }
            : attachment,
        ),
      );
      return;
    }

    try {
      const data = await extractDocumentFromLocalUpload(file);
      const normalizedType =
        data.kind === "image"
          ? "Image"
          : data.fileType === "docx"
            ? "Word"
            : data.fileType === "pptx"
              ? "PowerPoint"
              : data.fileType === "xlsx"
                ? "Excel"
                : "PDF";

      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                fileName: data.fileName ?? file.name,
                fileType: normalizedType,
                kind: data.kind ?? attachment.kind,
                status: "loaded",
                text: data.text,
                mimeType: data.mimeType,
                data: data.data,
                error: "",
              }
            : attachment,
        ),
      );
      uploadFilesByAttachmentIdRef.current.delete(attachmentId);
    } catch (error) {
      console.error(error);
      setUploadedAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "File belum bisa dibaca. Silakan coba file lain.",
              }
            : attachment,
        ),
      );
    }
  }

  async function retryAttachment(attachmentId: string) {
    const file = uploadFilesByAttachmentIdRef.current.get(attachmentId);

    if (!file) {
      setUploadedAttachments((current) => {
        const nextAttachments = current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                status: "error" as const,
                error:
                  "File asli tidak tersedia lagi. Hapus lalu upload ulang file ini.",
              }
            : attachment,
        );
        syncAttachmentState(nextAttachments);
        return nextAttachments;
      });
      return;
    }

    const key = `${file.name}:${file.size}:${file.lastModified}`;

    if (uploadKeysInFlightRef.current.has(key)) {
      return;
    }

    uploadKeysInFlightRef.current.add(key);
    setDocumentError("");
    setDocumentStatus("loading");
    setUploadedAttachments((current) =>
      current.map((attachment) =>
        attachment.id === attachmentId
          ? { ...attachment, status: "loading", error: "" }
          : attachment,
      ),
    );

    try {
      await readUploadedAttachment(file, attachmentId);
    } finally {
      uploadKeysInFlightRef.current.delete(key);
    }

    setUploadedAttachments((current) => {
      syncAttachmentState(current);
      return current;
    });
  }

  function showComposerNotice(message: string) {
    setComposerNotice(message);
    setIsAttachMenuOpen(false);
  }

  function resetMemory() {
    setActiveConversationId("");
    setMessages([welcomeMessage]);
    setInput("");
    resetDocumentState();
    setRenamingConversationId("");
    setRenameValue("");
    setSharePreview("");
  }

  function openUpgradeModal(model: SelectedModel = "smart") {
    setUpgradeTargetModel(model);
    setIsUpgradeOpen(true);
    setIsModelMenuOpen(false);
  }

  function selectModel(model: SelectedModel) {
    if (!allowedModels.includes(model)) {
      openUpgradeModal(model);
      return;
    }

    setSelectedModel(model);
    setIsModelMenuOpen(false);
  }

  function selectStudyMode(mode: SelectedStudyMode) {
    if (!canUseStudyMode(mode, usageSnapshot?.tier)) {
      setIsStudyModeMenuOpen(false);
      router.push("/plans");
      return;
    }

    setSelectedStudyMode(mode);
    setIsStudyModeMenuOpen(false);
  }

  async function loadConversation(conversation: Conversation) {
    if (isSending) return;

    setHistoryError("");
    setActiveConversationId(conversation.id);
    setSelectedModel(
      allowedModels.includes(conversation.model) ? conversation.model : "auto",
    );
    setSelectedStudyMode(
      resolveAllowedStudyMode(conversation.studyMode, usageSnapshot?.tier),
    );
    setSelectedWorkspaceId(conversation.workspaceId ?? "");

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,conversation_id,role,content,created_at,selected_model,study_mode,document_metadata",
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setHistoryError("Pesan obrolan belum bisa dimuat.");
      return;
    }

    const loadedMessages = ((data ?? []) as MessageRow[]).map(mapMessageRow);
    setMessages(loadedMessages.length ? loadedMessages : [welcomeMessage]);

    const latestDocumentMetadata =
      [...loadedMessages].reverse().find((message) => message.documentMetadata)
        ?.documentMetadata ?? conversation.documentMetadata;

    if (latestDocumentMetadata) {
      setUploadedAttachments(
        latestDocumentMetadata.files?.length
          ? latestDocumentMetadata.files.map((file, index) => ({
              id: `${file.fileName}-${index}`,
              fileName: file.fileName,
              fileType: file.fileType,
              kind: file.kind ?? (file.fileType === "Image" ? "image" : "document"),
              status: file.status,
            }))
          : [
              {
                id: latestDocumentMetadata.fileName,
                fileName: latestDocumentMetadata.fileName,
                fileType: latestDocumentMetadata.fileType,
                kind:
                  latestDocumentMetadata.fileType === "Image"
                    ? "image"
                    : "document",
                status: latestDocumentMetadata.status,
              },
            ],
      );
      setDocumentStatus(latestDocumentMetadata.status);
      setDocumentError("");
      documentTextRef.current = "";
      setDocumentText("");
    } else {
      resetDocumentState();
    }
  }

  async function createConversation(userText: string) {
    const title = createConversationTitle(userText);
    const documentMetadata = getCurrentDocumentMetadata();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title,
        selected_model: selectedModel,
        study_mode: selectedStudyMode,
        document_metadata: documentMetadata,
        workspace_id: selectedWorkspaceId || null,
      })
      .select(
        "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
      )
      .single();

    if (error) {
      throw error;
    }

    const conversation = mapConversationRow(data as ConversationRow);
    setConversations((prev) => sortConversations([conversation, ...prev]));
    setActiveConversationId(conversation.id);

    return conversation;
  }

  async function createWorkspace() {
    const name = newWorkspaceName.trim();

    if (!name || isCreatingWorkspace) {
      return;
    }

    setIsCreatingWorkspace(true);
    setHistoryError("");

    const { data, error } = await supabase
      .from("chat_workspaces")
      .insert({ name })
      .select("id,name,created_at")
      .single();

    if (error) {
      console.error(error);
      setHistoryError("Workspace belum bisa dibuat.");
      setIsCreatingWorkspace(false);
      return;
    }

    const workspace = mapWorkspaceRow(data as WorkspaceRow);
    setWorkspaces((current) =>
      [...current, workspace].sort((first, second) =>
        first.name.localeCompare(second.name),
      ),
    );
    setSelectedWorkspaceId(workspace.id);
    setNewWorkspaceName("");
    setIsCreatingWorkspace(false);
  }

  async function renameConversation(conversationId: string) {
    const title = renameValue.trim();

    if (!title) {
      setRenamingConversationId("");
      return;
    }

    const { error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversationId);

    if (error) {
      console.error(error);
      setHistoryError("Nama obrolan belum bisa diubah.");
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title }
          : conversation,
      ),
    );
    setRenamingConversationId("");
    setRenameValue("");
  }

  async function deleteConversation(conversationId: string) {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error(error);
      setHistoryError("Obrolan belum bisa dihapus.");
      return;
    }

    setConversations((prev) =>
      prev.filter((conversation) => conversation.id !== conversationId),
    );

    if (activeConversationId === conversationId) {
      resetMemory();
    }
  }

  async function toggleConversationPin(conversation: Conversation) {
    const nextPinned = !conversation.isPinned;
    const { error } = await supabase
      .from("conversations")
      .update({ is_pinned: nextPinned })
      .eq("id", conversation.id);

    if (error) {
      console.error(error);
      setHistoryError("Status pin belum bisa diubah.");
      return;
    }

    setConversations((prev) =>
      sortConversations(
        prev.map((item) =>
          item.id === conversation.id ? { ...item, isPinned: nextPinned } : item,
        ),
      ),
    );
    setSearchConversations((prev) =>
      prev
        ? sortConversations(
            prev.map((item) =>
              item.id === conversation.id
                ? { ...item, isPinned: nextPinned }
                : item,
            ),
          )
        : prev,
    );
  }

  async function updateConversationWorkspace(
    conversationId: string,
    workspaceId: string,
  ) {
    const nextWorkspaceId = workspaceId || null;
    const { error } = await supabase
      .from("conversations")
      .update({ workspace_id: nextWorkspaceId })
      .eq("id", conversationId);

    if (error) {
      console.error(error);
      setHistoryError("Workspace obrolan belum bisa diubah.");
      return;
    }

    const updateItem = (conversation: Conversation) =>
      conversation.id === conversationId
        ? { ...conversation, workspaceId: nextWorkspaceId }
        : conversation;

    setConversations((prev) => prev.map(updateItem));
    setSearchConversations((prev) => (prev ? prev.map(updateItem) : prev));
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function openSettings(tab: SettingsTab = "general") {
    setProfileDraft(learningProfile);
    setFavoriteSubjectsDraft(learningProfile.favoriteSubjects.join(", "));
    setProfileError("");
    setProfileSavedMessage("");
    setSettingsDataMessage("");
    setKnowledgeMessage("");
    setKnowledgeError("");
    setActiveSettingsTab(tab);
    setIsSettingsOpen(true);

    if (tab === "knowledge") {
      void loadKnowledge();
    }
  }

  function openLearningProfile() {
    openSettings("personalization");
  }

  function updateProfileDraft<K extends keyof UserMemory>(
    key: K,
    value: UserMemory[K],
  ) {
    setProfileDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
  }

  async function saveLearningProfile() {
    if (!userId || isSavingProfile) return;

    setIsSavingProfile(true);
    setProfileError("");
    setProfileSavedMessage("");

    try {
      const savedMemory = await updateUserMemory(
        supabase,
        userId,
        learningProfile,
        sanitizeUserMemory({
          ...profileDraft,
          favoriteSubjects: favoriteSubjectsDraft,
        }),
      );

      setLearningProfile(savedMemory);
      setProfileDraft(savedMemory);
      setFavoriteSubjectsDraft(savedMemory.favoriteSubjects.join(", "));
      setSelectedModel(savedMemory.defaultModel);
      setSelectedStudyMode(
        resolveAllowedStudyMode(savedMemory.defaultStudyMode, usageSnapshot?.tier),
      );
      setProfileSavedMessage("Learning Profile tersimpan.");
    } catch (error) {
      console.error(error);
      setProfileError("Learning Profile belum bisa disimpan.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function deleteAllChatHistory() {
    setSettingsDataMessage("");

    const { error } = await supabase
      .from("conversations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      console.error(error);
      setSettingsDataMessage("Riwayat obrolan belum bisa dihapus.");
      return;
    }

    setConversations([]);
    resetMemory();
    setSettingsDataMessage("Semua riwayat obrolan terhapus.");
  }

  function exportChatHistoryPlaceholder() {
    exportActiveChatMarkdown();
    setSettingsDataMessage("Chat aktif diexport sebagai Markdown.");
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const seenKeys = new Set<string>();
    const files = selectedFiles.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;

      if (seenKeys.has(key) || uploadKeysInFlightRef.current.has(key)) {
        return false;
      }

      seenKeys.add(key);
      uploadKeysInFlightRef.current.add(key);
      return true;
    });

    if (!files.length) {
      event.target.value = "";
      return;
    }

    if (!hasUploadQuota) {
      for (const file of files) {
        uploadKeysInFlightRef.current.delete(
          `${file.name}:${file.size}:${file.lastModified}`,
        );
      }
      setDocumentStatus("error");
      setDocumentError(
        "Limit upload dokumen harian paket kamu sudah habis. Silakan coba lagi besok atau upgrade paket.",
      );
      event.target.value = "";
      return;
    }

    const pendingAttachments = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      fileName: file.name,
      fileType: getUploadedDocumentType(file.name.toLowerCase()),
      kind: getAttachmentKind(file),
      status: "loading" as const,
    }));
    pendingAttachments.forEach((attachment, index) => {
      uploadFilesByAttachmentIdRef.current.set(attachment.id, files[index]);
    });

    setUploadedAttachments((current) => [...current, ...pendingAttachments]);
    setDocumentError("");
    setDocumentStatus("loading");
    setComposerNotice("");

    try {
      await Promise.all(
        files.map(async (file, index) => {
          const attachmentId = pendingAttachments[index].id;
          await readUploadedAttachment(file, attachmentId);
        }),
      );
    } finally {
      for (const file of files) {
        uploadKeysInFlightRef.current.delete(
          `${file.name}:${file.size}:${file.lastModified}`,
        );
      }
    }

    setUploadedAttachments((current) => {
      syncAttachmentState(current);
      return current;
    });

    await loadUsage();
    setIsAttachMenuOpen(false);
    // Allows uploading the same files again after an error or update.
    event.target.value = "";
  }

  async function handleKnowledgeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || isUploadingKnowledge) return;

    setKnowledgeMessage("");
    setKnowledgeError("");

    if (!isKnowledgeAdmin) {
      setKnowledgeError("Hanya admin yang bisa upload knowledge source.");
      event.target.value = "";
      return;
    }

    const fileName = file.name.toLowerCase();
    const isSupportedDocument =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".xlsx");

    if (!isSupportedDocument) {
      setKnowledgeError("Format knowledge source harus PDF, DOCX, PPTX, atau XLSX.");
      event.target.value = "";
      return;
    }

    if (file.size > maxDocumentUploadBytes) {
      setKnowledgeError("Ukuran dokumen terlalu besar. Maksimal 25 MB.");
      event.target.value = "";
      return;
    }

    setIsUploadingKnowledge(true);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("title", knowledgeTitle.trim() || file.name);
      formData.append("category", knowledgeCategory.trim() || "general");

      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        chunkCount?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Knowledge source belum bisa diupload.");
      }

      setKnowledgeMessage(
        `Knowledge source tersimpan dengan ${data.chunkCount ?? 0} chunk.`,
      );
      setKnowledgeTitle("");
      await loadKnowledge();
    } catch (error) {
      console.error(error);
      setKnowledgeError(
        error instanceof Error
          ? error.message
          : "Knowledge source belum bisa diupload.",
      );
    } finally {
      setIsUploadingKnowledge(false);
      event.target.value = "";
    }
  }

  async function sendMessage(
    messageOverride?: string,
    options?: { hiddenInstruction?: boolean; appendToLastAssistant?: boolean },
  ) {
    const userText = (messageOverride ?? input).trim();
    const isHiddenInstruction = Boolean(options?.hiddenInstruction);
    const appendTarget =
      isHiddenInstruction && options?.appendToLastAssistant
        ? [...messages].reverse().find((message) => message.role === "ai")
        : undefined;
    const canAppendToAssistant = Boolean(appendTarget?.id);
    const appendBaseText = canAppendToAssistant
      ? appendTarget?.text.replace(continuationMarker, "").trimEnd() ?? ""
      : "";

    if (!userText || isSending || !hasMessageQuota) return;

    const currentDocumentContext = documentTextRef.current || documentText;
    const documentContexts = uploadedAttachments
      .filter(
        (attachment) =>
          attachment.kind === "document" &&
          attachment.status === "loaded" &&
          attachment.text,
      )
      .map((attachment) => ({
        fileName: attachment.fileName,
        fileType: attachment.fileType.toLowerCase(),
        text: attachment.text ?? "",
      }));
    const imageContexts = uploadedAttachments
      .filter(
        (attachment) =>
          attachment.kind === "image" &&
          attachment.status === "loaded" &&
          attachment.data &&
          attachment.mimeType,
      )
      .map((attachment) => ({
        fileName: attachment.fileName,
        mimeType: attachment.mimeType ?? "image/jpeg",
        data: attachment.data ?? "",
      }));
    const documentMetadata = getCurrentDocumentMetadata();
    let conversation = activeConversation;
    const visibleUserMessage: Message = {
      role: "user",
      text: userText,
      model: selectedModel,
      studyMode: selectedStudyMode,
      documentMetadata,
    };
    const nextMessages: Message[] = isHiddenInstruction
      ? messages
      : [...messages, visibleUserMessage];
    const aiHistory = getRecentChatHistory(
      isHiddenInstruction ? messages : nextMessages,
    );

    setMessages(nextMessages);
    if (!isHiddenInstruction) {
      setInput("");
    }
    setIsSending(true);
    setIsAwaitingFirstChunk(true);
    const requestController = new AbortController();
    let streamFlushTimer: number | null = null;
    let latestParsedReply = {
      text: "",
      needsContinuation: false,
    };
    let didReceiveFirstChunk = false;
    activeRequestRef.current?.abort();
    activeRequestRef.current = requestController;

    const applyStreamedReply = (parsedReply = latestParsedReply) => {
      setMessages((prev) => {
        const updatedMessages = [...prev];
        const lastMessage = updatedMessages.at(-1);

        if (lastMessage?.role === "ai") {
          if (canAppendToAssistant && appendTarget?.id) {
            const targetIndex = updatedMessages.findIndex(
              (message) => message.id === appendTarget.id,
            );

            if (targetIndex >= 0) {
              updatedMessages[targetIndex] = {
                ...updatedMessages[targetIndex],
                text: `${appendBaseText}\n\n${parsedReply.text}`.trim(),
                continuationSuggested: parsedReply.needsContinuation,
              };
            }
          } else {
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              text: parsedReply.text,
              continuationSuggested: parsedReply.needsContinuation,
            };
          }
        }

        return updatedMessages;
      });
    };

    const scheduleStreamFlush = () => {
      if (streamFlushTimer !== null) {
        return;
      }

      streamFlushTimer = window.setTimeout(() => {
        streamFlushTimer = null;
        applyStreamedReply();
      }, streamUiFlushMs);
    };

    try {
      conversation ??= await createConversation(userText);
      const currentConversation = conversation;

      if (!isHiddenInstruction) {
        const { error: userMessageError } = await supabase.from("messages").insert({
          conversation_id: currentConversation.id,
          role: "user",
          content: userText,
          selected_model: selectedModel,
          study_mode: selectedStudyMode,
          document_metadata: documentMetadata,
        });

        if (userMessageError) {
          throw userMessageError;
        }
      }

      if (canAppendToAssistant) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === appendTarget?.id
              ? {
                  ...message,
                  continuationSuggested: false,
                }
              : message,
          ),
        );
      } else {
        setMessages([
          ...nextMessages,
          {
            role: "ai",
            text: "",
            model: selectedModel,
            studyMode: selectedStudyMode,
            documentMetadata,
          },
        ]);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: requestController.signal,
        body: JSON.stringify({
          history: aiHistory,
          internalInstruction: isHiddenInstruction ? userText : undefined,
          pdfContext: currentDocumentContext,
          documentContexts,
          imageContexts,
          selectedModel,
          selectedStudyMode,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(errorData?.error ?? "Chat API request failed");
      }

      if (!response.body) {
        throw new Error("Chat stream is unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedReply = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!chunk) {
          continue;
        }

        streamedReply += chunk;
        latestParsedReply = parseContinuationMarker(streamedReply);

        if (!didReceiveFirstChunk) {
          didReceiveFirstChunk = true;
          setIsAwaitingFirstChunk(false);
        }

        scheduleStreamFlush();
      }

      const finalChunk = decoder.decode();

      if (finalChunk) {
        streamedReply += finalChunk;
        latestParsedReply = parseContinuationMarker(streamedReply);
        setIsAwaitingFirstChunk(false);
      }

      if (streamFlushTimer !== null) {
        window.clearTimeout(streamFlushTimer);
        streamFlushTimer = null;
      }

      applyStreamedReply(latestParsedReply);

      const finalReply = parseContinuationMarker(streamedReply);

      if (!finalReply.text.trim()) {
        throw new Error("Chat stream returned an empty reply");
      }

      const finalAssistantText = canAppendToAssistant
        ? `${appendBaseText}\n\n${finalReply.text}`.trim()
        : finalReply.text;
      const assistantWrite = canAppendToAssistant && appendTarget?.id
        ? await supabase
            .from("messages")
            .update({
              content: finalAssistantText,
              selected_model: selectedModel,
              study_mode: selectedStudyMode,
              document_metadata: documentMetadata,
            })
            .eq("id", appendTarget.id)
        : await supabase
            .from("messages")
            .insert({
              conversation_id: currentConversation.id,
              role: "assistant",
              content: finalAssistantText,
              selected_model: selectedModel,
              study_mode: selectedStudyMode,
              document_metadata: documentMetadata,
            })
            .select("id")
            .single();
      const assistantMessageError = assistantWrite.error;

      if (assistantMessageError) {
        throw assistantMessageError;
      }

      if (!canAppendToAssistant && "data" in assistantWrite && assistantWrite.data) {
        const assistantRow = assistantWrite.data as { id?: string };
        if (assistantRow.id) {
          setMessages((prev) => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages.at(-1);

            if (lastMessage?.role === "ai") {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                id: assistantRow.id,
                text: finalAssistantText,
                continuationSuggested: finalReply.needsContinuation,
              };
            }

            return updatedMessages;
          });
        }
      }

      const updatedAt = new Date().toISOString();
      await supabase
        .from("conversations")
        .update({
          selected_model: selectedModel,
          study_mode: selectedStudyMode,
          document_metadata: documentMetadata,
          workspace_id:
            currentConversation.workspaceId ?? (selectedWorkspaceId || null),
          updated_at: updatedAt,
        })
        .eq("id", currentConversation.id);

      setConversations((prev) =>
        prev
          .map((item) =>
            item.id === currentConversation.id
              ? {
                  ...item,
                  model: selectedModel,
                  studyMode: selectedStudyMode,
                  documentMetadata,
                  workspaceId:
                    currentConversation.workspaceId ??
                    (selectedWorkspaceId || null),
                  updatedAt,
                }
              : item,
          )
          .sort(
            (first, second) =>
              new Date(second.updatedAt).getTime() -
              new Date(first.updatedAt).getTime(),
          ),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error(error);
      const errorText = getFriendlyChatError(error);

      if (conversation?.id) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: errorText,
          selected_model: selectedModel,
          study_mode: selectedStudyMode,
          document_metadata: documentMetadata,
        });
      }

      setMessages((prev) =>
        prev.at(-1)?.role === "ai"
          ? [
              ...prev.slice(0, -1),
              {
                role: "ai",
                text: errorText,
                model: selectedModel,
                studyMode: selectedStudyMode,
                documentMetadata,
              },
            ]
          : [
              ...prev,
              {
                role: "ai",
                text: errorText,
                model: selectedModel,
                studyMode: selectedStudyMode,
                documentMetadata,
              },
            ],
      );
    } finally {
      if (streamFlushTimer !== null) {
        window.clearTimeout(streamFlushTimer);
      }

      if (activeRequestRef.current === requestController) {
        activeRequestRef.current = null;
      }

      await loadUsage();
      setIsAwaitingFirstChunk(false);
      setIsSending(false);
    }
  }

  function continueAnswer() {
    void sendMessage(
      "Lanjutkan jawaban sebelumnya dari bagian terakhir. Jangan ulangi dari awal, lanjutkan secara runtut sampai selesai.",
      {
        hiddenInstruction: true,
        appendToLastAssistant: true,
      },
    );
  }

  function getActiveChatMarkdown() {
    const title = activeConversation?.title ?? "Obrolan baru";
    const workspaceName =
      workspaces.find((workspace) => workspace.id === activeConversation?.workspaceId)
        ?.name ?? "General";
    const lines = [
      `# ${title}`,
      "",
      `Workspace: ${workspaceName}`,
      `Exported: ${new Date().toISOString()}`,
      "",
    ];

    for (const message of messages.filter((item) => item.text.trim())) {
      lines.push(`## ${message.role === "user" ? "User" : "AI Muhammadiyah"}`);
      lines.push("");
      lines.push(message.text.trim());
      lines.push("");
    }

    return lines.join("\n");
  }

  function exportActiveChatMarkdown() {
    if (messages.length <= 1) {
      setHistoryError("Belum ada isi obrolan untuk diexport.");
      return;
    }

    const markdown = getActiveChatMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(activeConversation?.title ?? "ai-mu-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ai-mu-chat"}.md`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function openSharePreview() {
    if (messages.length <= 1) {
      setHistoryError("Belum ada isi obrolan untuk dibuat preview.");
      return;
    }

    const previewMessages = messages
      .filter((message) => message.text.trim())
      .slice(0, 6)
      .map(
        (message) =>
          `${message.role === "user" ? "User" : "AI"}: ${message.text
            .trim()
            .slice(0, 360)}`,
      )
      .join("\n\n");

    setSharePreview(
      [
        `Local share preview: ${activeConversation?.title ?? "Obrolan baru"}`,
        "",
        previewMessages,
        "",
        "Public link sharing belum diaktifkan. Preview ini disiapkan untuk alur share link berikutnya.",
      ].join("\n"),
    );
  }

  function renderAttachmentChips(extraClassName = "") {
    if (!uploadedAttachments.length && !composerNotice) {
      return null;
    }

    return (
      <div className={`mx-auto max-w-3xl ${extraClassName}`}>
        {uploadedAttachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {uploadedAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex min-w-[210px] max-w-[280px] items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-[#d3e8dc]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef8f1] text-[#008d54]">
                  <Icon
                    name={attachment.kind === "image" ? "idea" : "book"}
                    className="h-5 w-5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#18392e]">
                    {attachment.fileName}
                  </span>
                  <span
                    className={
                      attachment.status === "error"
                        ? "block truncate text-xs font-semibold text-[#8a3b2b]"
                        : "block truncate text-xs font-semibold text-[#4f665c]"
                    }
                  >
                    {attachment.fileType} ·{" "}
                    {attachment.status === "loading"
                      ? "membaca..."
                      : attachment.status === "loaded"
                        ? attachment.kind === "image"
                          ? "siap dianalisis"
                          : "teks siap"
                        : attachment.error || "gagal dibaca"}
                  </span>
                </span>
                {attachment.status === "error" && (
                  <button
                    type="button"
                    onClick={() => void retryAttachment(attachment.id)}
                    aria-label={`Coba lagi ${attachment.fileName}`}
                    title="Coba lagi"
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-[#008d54] transition hover:bg-[#eef8f1]"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`Hapus ${attachment.fileName}`}
                  title="Hapus"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#6d8178] transition hover:bg-[#fff1ed] hover:text-[#8a3b2b]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {composerNotice && (
          <p className="mt-2 rounded-2xl bg-[#eef8f1] px-3 py-2 text-sm font-semibold text-[#008d54] ring-1 ring-[#d8eadf]">
            {composerNotice}
          </p>
        )}

        {documentStatus === "error" && documentError && (
          <p className="mt-2 rounded-2xl bg-[#fff1ed] px-3 py-2 text-sm font-semibold text-[#8a3b2b] ring-1 ring-[#f0c8be]">
            {documentError}
          </p>
        )}
      </div>
    );
  }

  function renderAttachMenu() {
    if (!isAttachMenuOpen) {
      return null;
    }

    return (
      <div className="absolute bottom-full left-0 z-20 mb-3 w-72 overflow-hidden rounded-3xl bg-white p-2 text-sm shadow-2xl shadow-emerald-950/10 ring-1 ring-[#d3e8dc]">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 font-bold text-[#18392e] transition hover:bg-[#eef8f1]">
          <Icon name="book" className="h-5 w-5 text-[#008d54]" />
          <span>Add photos & files</span>
          <input
            type="file"
            multiple
            accept={supportedDocumentAccept}
            onChange={handleDocumentUpload}
            className="hidden"
          />
        </label>
        <div className="rounded-2xl px-3 py-2">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[#6b8178]">
            <Icon name="edit" className="h-4 w-4 text-[#008d54]" />
            Recent files
          </div>
          {recentAttachments.length ? (
            <div className="space-y-1">
              {recentAttachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => reuseRecentAttachment(attachment)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-[#18392e] transition hover:bg-[#eef8f1]"
                >
                  <Icon
                    name={attachment.kind === "image" ? "idea" : "book"}
                    className="h-4 w-4 shrink-0 text-[#008d54]"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {attachment.fileName}
                  </span>
                  <span className="text-xs text-[#6b8178]">
                    {attachment.fileType}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold text-[#6b8178]">
              Belum ada file terbaru.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            showComposerNotice("Create image masih Coming soon sampai provider image generation dikonfigurasi.")
          }
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#18392e] transition hover:bg-[#eef8f1]"
        >
          <Icon name="idea" className="h-5 w-5 text-[#008d54]" />
          Create image
        </button>
        {isKnowledgeAdmin && (
          <button
            type="button"
            onClick={() => {
              setActiveSettingsTab("knowledge");
              setIsSettingsOpen(true);
              setIsAttachMenuOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#18392e] transition hover:bg-[#eef8f1]"
          >
            <Icon name="lock" className="h-5 w-5 text-[#008d54]" />
            Knowledge source upload
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsStudyModeMenuOpen(true);
            setIsAttachMenuOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#18392e] transition hover:bg-[#eef8f1]"
        >
          <Icon name="cap" className="h-5 w-5 text-[#008d54]" />
          Study mode
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            setIsAttachMenuOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#18392e] transition hover:bg-[#eef8f1]"
        >
          <Icon name="settings" className="h-5 w-5 text-[#008d54]" />
          Settings
        </button>
      </div>
    );
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f7fbf8] text-[#04140b]">
      <aside className="hidden w-[340px] shrink-0 border-r border-[#d9e9df] bg-[#eef8f1] md:flex md:flex-col">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#009252] text-white shadow-xl shadow-emerald-900/10">
              <SparkIcon className="h-7 w-7" />
            </div>

            <h1 className="text-xl font-bold tracking-tight">AI-mu</h1>
          </div>

          <button
            type="button"
            aria-label="Alihkan sidebar"
            title="Alihkan sidebar"
            className="grid h-10 w-10 place-items-center rounded-full text-[#557064] transition hover:bg-white/80"
          >
            <Icon name="book" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4">
          <button
            type="button"
            onClick={resetMemory}
            className="flex h-[62px] w-full items-center gap-4 rounded-[28px] bg-white px-6 text-left text-lg font-bold shadow-[0_2px_10px_rgba(15,55,35,0.16)] ring-1 ring-[#d8eadf] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,55,35,0.14)]"
          >
            <span className="text-3xl font-light text-[#008d54]">+</span>
            Obrolan baru
          </button>
          <label className="mt-3 block">
            <span className="sr-only">Workspace untuk obrolan baru</span>
            <select
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              className="h-11 w-full rounded-2xl bg-white px-4 text-sm font-bold text-[#18392e] outline-none ring-1 ring-[#d8eadf] transition focus:ring-[#95d6b9]"
            >
              <option value="">General workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void createWorkspace();
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Workspace baru"
              className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
            />
            <button
              type="submit"
              disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#009252] text-white transition hover:bg-[#007c46] disabled:cursor-not-allowed disabled:bg-[#95d6b9]"
              aria-label="Buat workspace"
              title="Buat workspace"
            >
              <span className="text-xl leading-none">+</span>
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center gap-3 px-6 text-[#536b60]">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            value={chatSearch}
            onChange={(event) => setChatSearch(event.target.value)}
            placeholder="Cari judul atau isi chat"
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-[#536b60]"
          />
        </div>

        <nav className="mt-9 flex-1 overflow-y-auto px-5 pb-6">
          {isLoadingConversations && (
            <p className="text-sm font-semibold text-[#4f665c]">
              Memuat riwayat...
            </p>
          )}

          {historyError && (
            <p className="mb-4 rounded-2xl bg-white p-3 text-sm font-semibold text-[#8a3b2b] ring-1 ring-[#efd1c8]">
              {historyError}
            </p>
          )}

          {!isLoadingConversations && conversationGroups.length === 0 && (
            <p className="text-sm font-semibold text-[#4f665c]">
              Belum ada riwayat obrolan.
            </p>
          )}

          {conversationGroups.map((group) => (
            <div key={group.label} className="mb-8">
              <h2 className="mb-5 flex items-center justify-between text-sm font-bold tracking-wide text-[#4f665c]">
                <span>{group.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#008d54] ring-1 ring-[#d8eadf]">
                  {group.items.length}
                </span>
              </h2>

              <div className="space-y-3">
                {group.items.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={
                      conversation.id === activeConversationId
                        ? "rounded-2xl bg-white p-2 shadow-sm ring-1 ring-[#d8eadf]"
                        : "rounded-2xl p-2 transition hover:bg-white/70"
                    }
                  >
                    {renamingConversationId === conversation.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          renameConversation(conversation.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          autoFocus
                          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#95d6b9]"
                        />
                        <button
                          type="submit"
                          className="grid h-9 w-9 place-items-center rounded-full bg-[#009252] text-white"
                          aria-label="Simpan nama"
                          title="Simpan nama"
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadConversation(conversation)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left text-base text-[#18392e] transition hover:text-[#008d54]"
                        >
                          <Icon
                            name="chat"
                            className="h-5 w-5 shrink-0 text-[#566d62]"
                          />
                          <span className="truncate">{conversation.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleConversationPin(conversation)}
                          className={
                            conversation.isPinned
                              ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eef8f1] text-[#008d54]"
                              : "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#566d62] transition hover:bg-[#eef8f1]"
                          }
                          aria-label={
                            conversation.isPinned
                              ? "Lepas pin obrolan"
                              : "Pin obrolan"
                          }
                          title={
                            conversation.isPinned
                              ? "Lepas pin obrolan"
                              : "Pin obrolan"
                          }
                        >
                          <Icon name="pin" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingConversationId(conversation.id);
                            setRenameValue(conversation.title);
                          }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#566d62] transition hover:bg-[#eef8f1]"
                          aria-label="Ubah nama obrolan"
                          title="Ubah nama obrolan"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteConversation(conversation.id)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#8a3b2b] transition hover:bg-[#fff1ed]"
                          aria-label="Hapus obrolan"
                          title="Hapus obrolan"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {renamingConversationId !== conversation.id && (
                      <label className="mt-2 block">
                        <span className="sr-only">Workspace obrolan</span>
                        <select
                          value={conversation.workspaceId ?? ""}
                          onChange={(event) =>
                            updateConversationWorkspace(
                              conversation.id,
                              event.target.value,
                            )
                          }
                          className="h-9 w-full rounded-xl bg-white px-3 text-xs font-bold text-[#4f665c] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                        >
                          <option value="">General</option>
                          {workspaces.map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-[#d9e9df] px-5 py-4">
          {isAccountMenuOpen && (
            <div className="absolute bottom-[86px] left-5 right-5 z-40 overflow-hidden rounded-[22px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#d8eadf]">
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  router.push("/plans");
                }}
                className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
              >
                <span>
                  <span className="block font-bold text-[#18392e]">
                    Upgrade plan
                  </span>
                  <span className="text-xs font-semibold text-[#4f665c]">
                    {currentTierLabel}
                  </span>
                </span>
                <span className="rounded-full bg-[#eef8f1] px-2 py-1 text-xs font-bold text-[#008d54]">
                  {usageSnapshot
                    ? `${usageSnapshot.remainingMessagesToday}/${usageSnapshot.dailyMessageLimit}`
                    : "--"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  openLearningProfile();
                }}
                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
              >
                <Icon name="user" className="h-5 w-5 text-[#008d54]" />
                <span>
                  <span className="block font-bold text-[#18392e]">
                    Learning Profile
                  </span>
                  <span className="text-xs font-semibold text-[#4f665c]">
                    {profileLabel}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  openSettings("subscription");
                }}
                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
              >
                <Icon name="book" className="h-5 w-5 text-[#008d54]" />
                <span className="font-bold text-[#18392e]">Usage / quota</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  openSettings("general");
                }}
                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
              >
                <Icon name="settings" className="h-5 w-5 text-[#008d54]" />
                <span className="font-bold text-[#18392e]">Settings</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left font-bold text-[#8a3b2b] transition hover:bg-[#fff1ed] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="lock" className="h-5 w-5" />
                {isLoggingOut ? "Keluar..." : "Logout"}
              </button>
              {usageError && (
                <p className="px-3 py-2 text-xs font-semibold text-[#8a3b2b]">
                  {usageError}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            className="flex w-full items-center gap-3 rounded-[22px] bg-white p-3 text-left ring-1 ring-[#d8eadf] transition hover:bg-[#f7fbf8]"
            aria-expanded={isAccountMenuOpen}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c9f7dc] text-base font-bold text-[#008d54]">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">Akun Anggota</p>
              <p className="truncate text-xs text-[#4f665c]">
                {userEmail || "Memuat akun..."}
              </p>
            </div>
            <span className="rounded-full bg-[#eef8f1] px-2 py-1 text-xs font-bold text-[#008d54]">
              {currentTierLabel}
            </span>
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#fbfdfb]">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#d9e9df] px-4 sm:px-6 md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#009252] text-white md:hidden">
              <SparkIcon className="h-7 w-7" />
            </div>
            <div className="relative min-w-0 text-lg font-bold sm:text-xl">
              <span>AI-mu</span>
              <span className="mx-2 text-[#4f665c]">·</span>
              <button
                type="button"
                onClick={() => {
                  setIsStudyModeMenuOpen(false);
                  setIsModelMenuOpen((isOpen) => !isOpen);
                }}
                aria-label="Pilih model AI"
                aria-expanded={isModelMenuOpen}
                className="inline-flex max-w-[190px] items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#38534a] shadow-sm ring-1 ring-[#d8eadf] outline-none transition hover:bg-[#eef8f1] focus:ring-[#95d6b9] sm:max-w-none sm:text-base"
              >
                <span className="truncate">{selectedModelInfo.label}</span>
                {selectedModel === "smart" && (
                  <span className="rounded-full bg-[#fff4d8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-[#8a5a00]">
                    GPT
                  </span>
                )}
                <span className="text-xs text-[#6b8178]">⌄</span>
              </button>
              <span className="ml-2 hidden align-middle text-xs font-bold text-[#6b8178] lg:inline">
                {getModelProviderLabel(selectedModel)}
              </span>

              <span className="mx-2 hidden text-[#4f665c] sm:inline">/</span>
              <button
                type="button"
                onClick={() => {
                  setIsModelMenuOpen(false);
                  setIsStudyModeMenuOpen((isOpen) => !isOpen);
                }}
                aria-label="Pilih study mode"
                aria-expanded={isStudyModeMenuOpen}
                className="mt-2 inline-flex max-w-[210px] items-center gap-2 rounded-full bg-[#eef8f1] px-3 py-2 text-sm font-semibold text-[#38534a] shadow-sm ring-1 ring-[#d8eadf] outline-none transition hover:bg-white focus:ring-[#95d6b9] sm:mt-0 sm:max-w-none"
              >
                <span className="truncate">{selectedStudyModeInfo.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-[#008d54] ring-1 ring-[#d8eadf]">
                  {selectedStudyModeBadge}
                </span>
                <span className="text-xs text-[#6b8178]">⌄</span>
              </button>

              {isModelMenuOpen && (
                <div className="absolute left-16 top-11 z-30 w-[min(86vw,360px)] overflow-hidden rounded-[24px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#d8eadf] sm:left-20">
                  {modelOptions.map((model) => {
                    const modelInfo = modelCatalog[model];
                    const isAllowed = allowedModels.includes(model);

                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => selectModel(model)}
                        className={
                          selectedModel === model
                            ? "flex w-full items-start gap-3 rounded-[18px] bg-[#eef8f1] p-3 text-left"
                            : "flex w-full items-start gap-3 rounded-[18px] p-3 text-left transition hover:bg-[#f7fbf8]"
                        }
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c9f7dc] text-[#008d54]">
                          <Icon
                            name={isAllowed ? "check" : "lock"}
                            className="h-4 w-4"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-bold text-[#18392e]">
                            {modelInfo.label}
                            {model === "smart" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4d8] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                                <SparkIcon className="h-3 w-3" />
                                GPT-5 mini
                              </span>
                            )}
                            {model === "document" && (
                              <span className="rounded-full bg-[#e8f1ff] px-2 py-0.5 text-[11px] font-bold text-[#28528a]">
                                Gemini Pro
                              </span>
                            )}
                            {!isAllowed && (
                              <span className="rounded-full bg-[#fff4d8] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                                Premium
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#4f665c]">
                            {isAllowed
                              ? modelInfo.description
                              : getLockedModelRequirement(model)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {isStudyModeMenuOpen && (
                <div className="absolute left-0 top-24 z-30 w-[min(88vw,390px)] overflow-hidden rounded-[24px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#d8eadf] sm:left-44 sm:top-12">
                  {studyModeOptions.map((mode) => {
                    const isAllowed = canUseStudyMode(mode.id, usageSnapshot?.tier);
                    const badge = getStudyModeBadge(mode.id, usageSnapshot?.tier);

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => selectStudyMode(mode.id)}
                        className={
                          selectedStudyMode === mode.id
                            ? "flex w-full items-start gap-3 rounded-[18px] bg-[#eef8f1] p-3 text-left"
                            : "flex w-full items-start gap-3 rounded-[18px] p-3 text-left transition hover:bg-[#f7fbf8]"
                        }
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c9f7dc] text-[#008d54]">
                          <Icon
                            name={isAllowed ? "check" : "lock"}
                            className="h-4 w-4"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-bold text-[#18392e]">
                            {mode.label}
                            <span
                              className={
                                isAllowed
                                  ? "rounded-full bg-[#eef8f1] px-2 py-0.5 text-[11px] font-bold text-[#008d54]"
                                  : "rounded-full bg-[#fff4d8] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]"
                              }
                            >
                              {badge}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#4f665c]">
                            {isAllowed
                              ? mode.description
                              : getLockedStudyModeRequirement(mode.id)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {activeConversation && (
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => toggleConversationPin(activeConversation)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#4f665c] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1] hover:text-[#008d54]"
                  aria-label={
                    activeConversation.isPinned
                      ? "Lepas pin obrolan"
                      : "Pin obrolan"
                  }
                  title={
                    activeConversation.isPinned
                      ? "Lepas pin obrolan"
                      : "Pin obrolan"
                  }
                >
                  <Icon name="pin" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={exportActiveChatMarkdown}
                  className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={openSharePreview}
                  className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
                >
                  Share
                </button>
              </div>
            )}
            <span className="hidden rounded-full bg-[#eef8f1] px-3 py-1 text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf] sm:inline-flex">
              {currentTierLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              aria-label="Menu akun"
              aria-expanded={isAccountMenuOpen}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#009252] text-xl font-bold text-white shadow-sm transition hover:bg-[#007c46]"
            >
              {userInitials}
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-14 z-40 w-[min(86vw,300px)] overflow-hidden rounded-[22px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#d8eadf] md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    router.push("/plans");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
                >
                  <span className="font-bold text-[#18392e]">Upgrade plan</span>
                  <span className="rounded-full bg-[#eef8f1] px-2 py-1 text-xs font-bold text-[#008d54]">
                    {currentTierLabel}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    openLearningProfile();
                  }}
                  className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
                >
                  <Icon name="user" className="h-5 w-5 text-[#008d54]" />
                  <span className="font-bold text-[#18392e]">
                    Learning Profile
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    openSettings("subscription");
                  }}
                  className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
                >
                  <Icon name="book" className="h-5 w-5 text-[#008d54]" />
                  <span className="font-bold text-[#18392e]">Usage / quota</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    openSettings("general");
                  }}
                  className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7fbf8]"
                >
                  <Icon name="settings" className="h-5 w-5 text-[#008d54]" />
                  <span className="font-bold text-[#18392e]">Settings</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left font-bold text-[#8a3b2b] transition hover:bg-[#fff1ed] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="lock" className="h-5 w-5" />
                  {isLoggingOut ? "Keluar..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="border-b border-[#d9e9df] px-4 py-3 md:hidden">
          <div className="mb-3 grid gap-2">
            <input
              value={chatSearch}
              onChange={(event) => setChatSearch(event.target.value)}
              placeholder="Cari chat"
              className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] placeholder:text-[#6d8178] focus:ring-[#95d6b9]"
            />
            <select
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              className="h-11 rounded-full bg-white px-4 text-sm font-bold text-[#18392e] outline-none ring-1 ring-[#d8eadf]"
            >
              <option value="">General workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={resetMemory}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#18392e] shadow-sm ring-1 ring-[#d8eadf]"
            >
              + Obrolan baru
            </button>
            {visibleConversations.slice(0, 8).map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => loadConversation(conversation)}
                className={
                  conversation.id === activeConversationId
                    ? "max-w-[220px] shrink-0 truncate rounded-full bg-[#009252] px-4 py-2 text-sm font-bold text-white"
                    : "max-w-[220px] shrink-0 truncate rounded-full bg-white px-4 py-2 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf]"
                }
              >
                {conversation.title}
              </button>
            ))}
          </div>
          {activeConversation && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => toggleConversationPin(activeConversation)}
                className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf]"
              >
                {activeConversation.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                onClick={exportActiveChatMarkdown}
                className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf]"
              >
                Export
              </button>
              <button
                type="button"
                onClick={openSharePreview}
                className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf]"
              >
                Share
              </button>
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#18392e] shadow-sm ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
            >
              <span className="text-xl text-[#008d54]">+</span>
              Add photos & files
            </button>
            {renderAttachMenu()}
          </div>

          {renderAttachmentChips("mt-2")}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-9">
          {messages.length <= 1 && (
            <div className="mx-auto flex min-h-full w-full max-w-[746px] flex-col items-center justify-center gap-8 pb-3 pt-1 md:justify-start">
              <div className="grid h-[84px] w-[84px] place-items-center rounded-[34px] bg-[#009252] text-white shadow-2xl shadow-emerald-900/10">
                <SparkIcon className="h-12 w-12" />
              </div>

              <section className="text-center">
                <h2 className="text-4xl font-bold leading-tight tracking-normal text-[#05150d] sm:text-5xl">
                  Assalamu&apos;alaikum, ada yang bisa AI-mu bantu?
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-[#4a6258] sm:text-xl">
                  Asisten cerdas Muhammadiyah, ditenagai{" "}
                  <strong className="text-[#05150d]">ChatGPT 5.5</strong> &{" "}
                  <strong className="text-[#05150d]">Gemini 3.1 Pro.</strong>
                </p>
              </section>

              <div className="w-full rounded-[34px] bg-white p-5 shadow-[0_22px_60px_rgba(27,77,50,0.08)] ring-1 ring-[#d3e8dc]">
                {renderAttachmentChips("mb-3")}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="Tanyakan apa saja kepada AI-mu..."
                  disabled={isSending}
                  className="h-20 w-full bg-transparent text-xl text-[#18392e] outline-none placeholder:text-[#4f665c]"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3 text-[#4f665c]">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]"
                    >
                    <span aria-hidden="true" className="text-2xl">⌘</span>
                    Lampirkan
                    </button>
                    {renderAttachMenu()}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsStudyModeMenuOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]"
                  >
                    <Icon name="book" className="h-6 w-6" />
                    {selectedStudyModeInfo.shortLabel}
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]"
                  >
                    <Icon name="idea" className="h-5 w-5" />
                    Ide
                  </button>

                  <button
                    type="button"
                    aria-label="Input suara"
                    title="Input suara"
                    className="ml-auto grid h-11 w-11 place-items-center rounded-full transition hover:bg-[#eef8f1]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                      <path d="M19 11a7 7 0 0 1-14 0" />
                      <path d="M12 18v4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={isSending || !input.trim() || !hasMessageQuota}
                    aria-label="Kirim pesan"
                    title="Kirim pesan"
                    className="grid h-14 w-14 place-items-center rounded-full bg-[#95d6b9] text-white transition hover:bg-[#009252] disabled:cursor-not-allowed disabled:bg-[#c9ded3]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-7 w-7"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                      <path d="M22 2 11 13" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.title}
                    type="button"
                    onClick={() => setInput(prompt.title)}
                    className="flex min-h-[104px] items-center gap-5 rounded-[30px] bg-white px-6 text-left ring-1 ring-[#d3e8dc] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(27,77,50,0.08)]"
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#c9f7dc] text-[#008d54]">
                      <Icon name={prompt.icon} className="h-7 w-7" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold text-[#05150d]">
                        {prompt.title}
                      </span>
                      <span className="mt-1 block text-base leading-snug text-[#38534a]">
                        {prompt.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <p className="max-w-2xl text-center text-base leading-relaxed text-[#4f665c]">
                AI-mu dapat keliru. Selalu verifikasi informasi penting, terutama
                dalam urusan ibadah & syariah.
              </p>
            </div>
          )}

          {messages.length > 1 && (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end space-y-4">
              {messages.map((message, index) => (
                message.role === "ai" && !message.text ? null : (
                  <div
                    key={index}
                    className={
                      message.role === "user"
                        ? "flex justify-end animate-[messageIn_0.25s_ease-out]"
                        : "flex justify-start animate-[messageIn_0.25s_ease-out]"
                    }
                  >
                    <div
                      className={
                        message.role === "user"
                          ? "max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-md bg-[#009252] px-5 py-3 text-sm leading-relaxed text-white shadow-lg shadow-emerald-900/15 sm:max-w-xl sm:text-base"
                          : "max-w-[85%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 text-sm leading-relaxed text-[#18392e] shadow-sm ring-1 ring-[#d3e8dc] sm:max-w-2xl sm:text-base"
                      }
                    >
                      {message.role === "ai" ? (
                        <>
                          <MarkdownMessage text={message.text} />
                          {message.continuationSuggested && !isSending && (
                            <button
                              type="button"
                              onClick={continueAnswer}
                              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eef8f1] px-4 py-2 text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf] transition hover:bg-white"
                            >
                              Lanjutkan jawaban
                            </button>
                          )}
                        </>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                )
              ))}

              {isSending && isAwaitingFirstChunk && (
                <div className="flex justify-start animate-[messageIn_0.25s_ease-out]">
                  <div className="max-w-[85%] rounded-[24px] rounded-bl-md bg-white px-5 py-3 text-sm leading-relaxed text-[#4f665c] shadow-sm ring-1 ring-[#d3e8dc] sm:max-w-xl sm:text-base">
                    Sedang menjawab...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {messages.length > 1 && (
          <div className="border-t border-[#d9e9df] bg-[#fbfdfb] p-3 sm:p-4">
            {renderAttachmentChips("mb-2")}
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-[#d3e8dc] focus-within:ring-[#95d6b9] sm:gap-3 sm:px-4">
              <div className="relative">
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#4f665c] transition hover:bg-[#eef8f1]"
                title="Add photos & files"
                aria-label="Add photos & files"
              >
                <span aria-hidden="true" className="text-2xl leading-none">+</span>
              </button>
              {renderAttachMenu()}
              </div>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder="Tanyakan apa saja kepada AI-mu..."
                disabled={isSending}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#18392e] outline-none placeholder:text-[#6d8178] sm:text-base"
              />

              <button
                type="button"
                onClick={() => {
                  setIsModelMenuOpen(false);
                  setIsStudyModeMenuOpen((isOpen) => !isOpen);
                }}
                className="hidden shrink-0 items-center gap-2 rounded-full bg-[#eef8f1] px-3 py-2 text-xs font-bold text-[#008d54] ring-1 ring-[#d8eadf] transition hover:bg-white sm:inline-flex"
              >
                {selectedStudyModeInfo.shortLabel}
                <span className="text-[10px] text-[#4f665c]">
                  {selectedStudyModeBadge}
                </span>
              </button>

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={isSending || !input.trim() || !hasMessageQuota}
                aria-label="Kirim pesan"
                title="Kirim pesan"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#95d6b9] text-white transition hover:bg-[#009252] disabled:cursor-not-allowed disabled:bg-[#c9ded3]"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>

          </div>
        )}
      </section>

      {sharePreview && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#04140b]/35 px-3 py-4 sm:items-center sm:justify-center">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#f7fbf8] shadow-2xl ring-1 ring-[#d8eadf]">
            <div className="flex items-center justify-between border-b border-[#d9e9df] px-5 py-4">
              <div>
                <p className="text-sm font-bold text-[#008d54]">
                  Share preview
                </p>
                <h2 className="text-xl font-bold text-[#05150d]">
                  Local chat preview
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSharePreview("")}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#4f665c] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
                aria-label="Tutup preview"
                title="Tutup preview"
              >
                x
              </button>
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-[#18392e]">
              {sharePreview}
            </pre>
          </div>
        </div>
      )}

      {isUpgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#04140b]/35 px-3 py-4 sm:items-center sm:justify-center">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-[28px] bg-[#fbfdfb] p-5 shadow-2xl ring-1 ring-[#d8eadf] sm:max-w-5xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#008d54]">
                  Upgrade paket
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#05150d]">
                  Buka {modelCatalog[upgradeTargetModel].label}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4f665c]">
                  Paket kamu saat ini: {currentTierLabel}. Upgrade mulai dari{" "}
                  <strong className="text-[#18392e]">{upgradePlan.name}</strong>{" "}
                  untuk memakai {modelCatalog[upgradeTargetModel].description}
                </p>
                {(upgradeTargetModel === "smart" ||
                  upgradeTargetModel === "document") && (
                  <p className="mt-2 inline-flex rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-bold text-[#8a5a00]">
                    Requires Muallim Pro or higher
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeOpen(false)}
                aria-label="Tutup upgrade"
                title="Tutup"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#566d62] transition hover:bg-[#eef8f1]"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  x
                </span>
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {subscriptionPlans.map((plan) => {
                const isCurrentPlan = usageSnapshot?.tier === plan.tier;
                const unlocksTarget =
                  plan.allowedModels.includes(upgradeTargetModel);

                return (
                  <article
                    key={plan.tier}
                    className={
                      unlocksTarget
                        ? "rounded-[24px] bg-white p-4 ring-2 ring-[#95d6b9]"
                        : "rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]"
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#18392e]">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-2xl font-bold text-[#05150d]">
                          {plan.price}
                        </p>
                        <p className="text-xs font-semibold text-[#4f665c]">
                          per bulan
                        </p>
                      </div>
                      {isCurrentPlan && (
                        <span className="rounded-full bg-[#eef8f1] px-2 py-1 text-[11px] font-bold text-[#008d54]">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#4f665c]">
                      {plan.tagline}
                    </p>
                    <div className="mt-4 space-y-2 text-xs font-semibold text-[#38534a]">
                      <p>{plan.quotas[0]}</p>
                      <p>{plan.quotas[1]}</p>
                      <p>{plan.modelNames.join(", ")}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {plan.modelBadges.map((badge) => (
                        <span
                          key={badge}
                          className={
                            badge.includes("GPT")
                              ? "rounded-full bg-[#fff4d8] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]"
                              : badge.includes("Gemini 2.5 Pro")
                                ? "rounded-full bg-[#e8f1ff] px-2 py-0.5 text-[11px] font-bold text-[#28528a]"
                                : "rounded-full bg-[#eef8f1] px-2 py-0.5 text-[11px] font-bold text-[#008d54]"
                          }
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled
                      className="mt-4 h-10 w-full rounded-full bg-[#eef8f1] text-xs font-bold text-[#008d54] ring-1 ring-[#d8eadf] disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      Coming Soon
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 rounded-[22px] bg-[#eef8f1] p-4 text-sm leading-relaxed text-[#38534a] ring-1 ring-[#d8eadf]">
              Pembayaran otomatis belum diaktifkan. Untuk sekarang, upgrade
              ditampilkan sebagai placeholder manual sambil rute premium dan
              kuota subscription tetap siap dipakai dari data subscription.
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#04140b]/35 px-3 py-4 sm:items-center sm:justify-center">
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[28px] bg-[#fbfdfb] shadow-2xl ring-1 ring-[#d8eadf] sm:max-w-5xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#d9e9df] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-2xl font-bold text-[#05150d]">Settings</h2>
                <p className="mt-1 text-sm text-[#4f665c]">
                  Preferensi AI-mu, akun, data, dan dokumen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Tutup Settings"
                title="Tutup"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#566d62] transition hover:bg-[#eef8f1]"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  x
                </span>
              </button>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[230px_1fr]">
              <nav className="flex gap-2 overflow-x-auto border-b border-[#d9e9df] bg-[#f7fbf8] p-3 md:block md:space-y-1 md:overflow-visible md:border-b-0 md:border-r">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSettingsTab(tab.id)}
                    className={
                      activeSettingsTab === tab.id
                        ? "shrink-0 rounded-2xl bg-white px-4 py-3 text-left text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf] md:w-full"
                        : "shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#38534a] transition hover:bg-white md:w-full"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                {activeSettingsTab === "general" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Theme
                      </span>
                      <select
                        value={profileDraft.themePreference}
                        onChange={(event) =>
                          updateProfileDraft(
                            "themePreference",
                            event.target.value as UserMemory["themePreference"],
                          )
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Language
                      </span>
                      <select
                        value={profileDraft.preferredLanguage}
                        onChange={(event) =>
                          updateProfileDraft("preferredLanguage", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        {languageOptions.map((option) => (
                          <option key={option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Default AI model
                      </span>
                      <select
                        value={profileDraft.defaultModel}
                        onChange={(event) =>
                          updateProfileDraft(
                            "defaultModel",
                            event.target.value as UserMemory["defaultModel"],
                          )
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        {modelOptions.map((model) => (
                          <option key={model} value={model}>
                            {modelCatalog[model].label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Default study mode
                      </span>
                      <select
                        value={profileDraft.defaultStudyMode}
                        onChange={(event) =>
                          updateProfileDraft(
                            "defaultStudyMode",
                            normalizeStudyMode(event.target.value),
                          )
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        {studyModeOptions.map((mode) => (
                          <option key={mode.id} value={mode.id}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {activeSettingsTab === "personalization" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Learning Profile
                      </span>
                      <input
                        value={profileDraft.displayName}
                        onChange={(event) =>
                          updateProfileDraft("displayName", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                        placeholder="Nama panggilan"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Jenjang sekolah
                      </span>
                      <input
                        value={profileDraft.schoolLevel}
                        onChange={(event) =>
                          updateProfileDraft("schoolLevel", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                        placeholder="Kelas 9 SMP"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Explanation style
                      </span>
                      <select
                        value={profileDraft.preferredExplanationStyle}
                        onChange={(event) =>
                          updateProfileDraft(
                            "preferredExplanationStyle",
                            event.target.value,
                          )
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        <option value="">Default</option>
                        <option value="Singkat, langsung ke inti, lalu contoh.">
                          Singkat + contoh
                        </option>
                        <option value="Pelan-pelan dengan langkah berurutan.">
                          Langkah berurutan
                        </option>
                        <option value="Gunakan analogi sederhana dan latihan kecil.">
                          Analogi + latihan
                        </option>
                        <option value="Lebih mendalam, cocok untuk diskusi kajian.">
                          Mendalam
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-[#18392e]">
                        Favorite subjects
                      </span>
                      <input
                        value={favoriteSubjectsDraft}
                        onChange={(event) =>
                          setFavoriteSubjectsDraft(event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                        placeholder="Matematika, Al-Islam"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-bold text-[#18392e]">
                        Learning goals
                      </span>
                      <textarea
                        value={profileDraft.learningGoals}
                        onChange={(event) =>
                          updateProfileDraft("learningGoals", event.target.value)
                        }
                        className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                        placeholder="Ingin lebih paham matematika dan latihan menjawab soal."
                      />
                    </label>
                  </div>
                )}

                {activeSettingsTab === "subscription" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                      <p className="text-sm font-bold text-[#008d54]">
                        Current plan
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-[#05150d]">
                        {currentPlan?.name ?? currentTierLabel}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                        {currentPlan?.tagline ?? "Status paket sedang dimuat."}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#d8eadf]">
                        <p className="text-sm font-bold text-[#18392e]">
                          Usage quota
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#008d54]">
                          {usageSnapshot
                            ? `${usageSnapshot.remainingMessagesToday}/${usageSnapshot.dailyMessageLimit}`
                            : "--"}
                        </p>
                        <p className="text-sm text-[#4f665c]">
                          pesan tersisa hari ini
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#d8eadf]">
                        <p className="text-sm font-bold text-[#18392e]">
                          Document quota
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#008d54]">
                          {usageSnapshot
                            ? `${usageSnapshot.remainingUploadsToday}/${usageSnapshot.dailyUploadLimit}`
                            : "--"}
                        </p>
                        <p className="text-sm text-[#4f665c]">
                          upload tersisa hari ini
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/plans")}
                      className="h-12 rounded-full bg-[#009252] px-6 text-sm font-bold text-white transition hover:bg-[#007c46]"
                    >
                      Upgrade plan
                    </button>
                  </div>
                )}

                {activeSettingsTab === "data" && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={resetMemory}
                      className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left ring-1 ring-[#d8eadf] transition hover:bg-[#f7fbf8]"
                    >
                      <span>
                        <span className="block text-sm font-bold text-[#18392e]">
                          Clear current chat
                        </span>
                        <span className="mt-1 block text-sm text-[#4f665c]">
                          Mulai obrolan kosong tanpa menghapus riwayat.
                        </span>
                      </span>
                      <span className="text-xl text-[#008d54]">+</span>
                    </button>
                    <button
                      type="button"
                      onClick={deleteAllChatHistory}
                      className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left ring-1 ring-[#f0c8be] transition hover:bg-[#fff1ed]"
                    >
                      <span>
                        <span className="block text-sm font-bold text-[#8a3b2b]">
                          Delete all chat history
                        </span>
                        <span className="mt-1 block text-sm text-[#4f665c]">
                          Menghapus semua conversation milik akun ini.
                        </span>
                      </span>
                      <Icon name="trash" className="h-5 w-5 text-[#8a3b2b]" />
                    </button>
                    <button
                      type="button"
                      onClick={exportChatHistoryPlaceholder}
                      className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left ring-1 ring-[#d8eadf] transition hover:bg-[#f7fbf8]"
                    >
                      <span>
                        <span className="block text-sm font-bold text-[#18392e]">
                          Export active chat
                        </span>
                        <span className="mt-1 block text-sm text-[#4f665c]">
                          Unduh Markdown dengan format pesan tetap terjaga.
                        </span>
                      </span>
                      <span className="text-sm font-bold text-[#008d54]">
                        MD
                      </span>
                    </button>
                    {settingsDataMessage && (
                      <p className="rounded-2xl bg-[#eef8f1] p-3 text-sm font-semibold text-[#008d54]">
                        {settingsDataMessage}
                      </p>
                    )}
                  </div>
                )}

                {activeSettingsTab === "security" && (
                  <div className="space-y-4">
                    <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                      <p className="text-sm font-bold text-[#18392e]">
                        Login email
                      </p>
                      <p className="mt-1 break-words text-sm text-[#4f665c]">
                        {userEmail || "Memuat akun..."}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-[#eef8f1] p-4 text-sm leading-relaxed text-[#38534a] ring-1 ring-[#d8eadf]">
                      Login memakai OTP email. AI Muhammadiyah tidak menyimpan
                      password di aplikasi ini.
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="h-12 rounded-full bg-white px-6 text-sm font-bold text-[#8a3b2b] ring-1 ring-[#f0c8be] transition hover:bg-[#fff1ed] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoggingOut ? "Keluar..." : "Logout"}
                    </button>
                  </div>
                )}

                {activeSettingsTab === "documents" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                      <p className="text-sm font-bold text-[#18392e]">
                        Upload limits
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                        Maksimal 25 MB per file. Kuota harian mengikuti paket:
                        {" "}
                        {usageSnapshot
                          ? `${usageSnapshot.dailyUploadLimit} upload/hari`
                          : "memuat kuota"}
                        .
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                      <p className="text-sm font-bold text-[#18392e]">
                        Supported files
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                        PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, WEBP.
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf] sm:col-span-2">
                      <p className="text-sm font-bold text-[#18392e]">
                        Storage info
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                        Dokumen diproses untuk mengambil teks, lalu konteksnya
                        dipakai pada chat aktif. File asli tidak ditampilkan
                        sebagai arsip permanen di UI saat ini.
                      </p>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "knowledge" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                        <p className="text-sm font-bold text-[#18392e]">
                          Retrieval status
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                          {isLoadingKnowledge
                            ? "Memuat knowledge base..."
                            : `${knowledgeSources.length} source aktif terbaca.`}
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                        <p className="text-sm font-bold text-[#18392e]">
                          Admin access
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                          {isKnowledgeAdmin
                            ? "Upload dan kelola manual aktif untuk akun ini."
                            : "Akun ini bisa membaca source publik aktif."}
                        </p>
                      </div>
                    </div>

                    {isKnowledgeAdmin && (
                      <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-sm font-bold text-[#18392e]">
                              Source title
                            </span>
                            <input
                              value={knowledgeTitle}
                              onChange={(event) =>
                                setKnowledgeTitle(event.target.value)
                              }
                              className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                              placeholder="Pedoman ISMUBA"
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-bold text-[#18392e]">
                              Category
                            </span>
                            <input
                              value={knowledgeCategory}
                              onChange={(event) =>
                                setKnowledgeCategory(event.target.value)
                              }
                              className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                              placeholder="kemuhammadiyahan"
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-[#009252] px-6 text-sm font-bold text-white transition hover:bg-[#007c46]">
                            {isUploadingKnowledge
                              ? "Mengupload..."
                              : "Upload knowledge document"}
                            <input
                              type="file"
                              accept={supportedDocumentAccept}
                              onChange={handleKnowledgeUpload}
                              disabled={isUploadingKnowledge}
                              className="sr-only"
                            />
                          </label>
                          <p className="text-sm text-[#4f665c]">
                            PDF, DOCX, PPTX, XLSX. Teks dipotong otomatis untuk
                            pencarian full-text.
                          </p>
                        </div>
                      </div>
                    )}

                    {(knowledgeError || knowledgeMessage) && (
                      <p
                        className={
                          knowledgeError
                            ? "rounded-2xl bg-[#fff1ed] p-3 text-sm font-semibold text-[#8a3b2b]"
                            : "rounded-2xl bg-[#eef8f1] p-3 text-sm font-semibold text-[#008d54]"
                        }
                      >
                        {knowledgeError || knowledgeMessage}
                      </p>
                    )}

                    <div className="space-y-3">
                      {knowledgeSources.map((source) => (
                        <div
                          key={source.id}
                          className="rounded-[22px] bg-white p-4 ring-1 ring-[#d8eadf]"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-[#18392e]">
                                {source.title}
                              </p>
                              <p className="mt-1 text-sm text-[#4f665c]">
                                {source.category} - {source.fileType.toUpperCase()} -
                                {" "}
                                {source.chunkCount} chunks
                              </p>
                            </div>
                            <span className="w-fit rounded-full bg-[#eef8f1] px-3 py-1 text-xs font-bold text-[#008d54]">
                              {source.status}
                            </span>
                          </div>
                          {source.originalFileName && (
                            <p className="mt-2 break-words text-xs text-[#6b8177]">
                              {source.originalFileName}
                            </p>
                          )}
                        </div>
                      ))}

                      {!isLoadingKnowledge && knowledgeSources.length === 0 && (
                        <div className="rounded-[22px] bg-white p-4 text-sm leading-relaxed text-[#4f665c] ring-1 ring-[#d8eadf]">
                          Belum ada knowledge source aktif.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(activeSettingsTab === "general" ||
                  activeSettingsTab === "personalization") && (
                  <>
                    {(profileError || profileSavedMessage) && (
                      <p
                        className={
                          profileError
                            ? "mt-4 rounded-2xl bg-[#fff1ed] p-3 text-sm font-semibold text-[#8a3b2b]"
                            : "mt-4 rounded-2xl bg-[#eef8f1] p-3 text-sm font-semibold text-[#008d54]"
                        }
                      >
                        {profileError || profileSavedMessage}
                      </p>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        className="h-12 rounded-full bg-white px-6 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={saveLearningProfile}
                        disabled={isSavingProfile}
                        className="h-12 rounded-full bg-[#009252] px-6 text-sm font-bold text-white transition hover:bg-[#007c46] disabled:cursor-not-allowed disabled:bg-[#95d6b9]"
                      >
                        {isSavingProfile ? "Menyimpan..." : "Simpan settings"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

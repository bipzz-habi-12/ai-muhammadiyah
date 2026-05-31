"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyUserMemory,
  loadUserMemory,
  sanitizeUserMemory,
  updateUserMemory,
  type UserMemory,
} from "@/lib/memory/user-memory";
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
  documentMetadata?: DocumentMetadata | null;
  continuationSuggested?: boolean;
};

type DocumentStatus = "idle" | "loading" | "loaded" | "error";
type UploadedDocumentType = "PDF" | "Word" | "PowerPoint" | "Excel" | "Dokumen";

type SelectedModel = PlanModelId;
type SettingsTab =
  | "general"
  | "personalization"
  | "subscription"
  | "data"
  | "security"
  | "documents";

type DocumentMetadata = {
  fileName: string;
  fileType: UploadedDocumentType;
  status: Exclude<DocumentStatus, "idle">;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: SelectedModel;
  documentMetadata: DocumentMetadata | null;
};

type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  selected_model: string | null;
  document_metadata: DocumentMetadata | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  selected_model: string | null;
  document_metadata: DocumentMetadata | null;
};

const maxRecentChatMessages = 10;
const maxMessageTextLength = 2000;
const maxDocumentUploadBytes = 25 * 1024 * 1024;
const continuationMarker = "[[AI_MU_CONTINUE_SUGGESTED]]";

const welcomeMessage: Message = {
  role: "ai",
  text: "Assalamualaikum! Saya AI Muhammadiyah.",
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

const settingsTabs: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "personalization", label: "Personalization" },
  { id: "subscription", label: "Subscription" },
  { id: "data", label: "Data Controls" },
  { id: "security", label: "Security" },
  { id: "documents", label: "Documents" },
];

const languageOptions = [
  { label: "Auto", value: "" },
  { label: "Indonesian", value: "Bahasa Indonesia sederhana" },
  { label: "English", value: "English" },
];

const studyModeOptions = [
  "Kajian umum",
  "Tanya jawab cepat",
  "Latihan soal",
  "Ringkasan materi",
  "Persiapan ujian",
];

const supportedDocumentAccept =
  "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx";

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
    documentMetadata: row.document_metadata,
  };
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role === "assistant" ? "ai" : "user",
    text: row.content,
    createdAt: row.created_at,
    model: normalizeSelectedModel(row.selected_model),
    documentMetadata: row.document_metadata,
  };
}

function createConversationTitle(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "Obrolan baru";
  }

  return normalizedText.length > 48
    ? `${normalizedText.slice(0, 48)}...`
    : normalizedText;
}

function getConversationGroupLabel(dateValue: string) {
  const date = new Date(dateValue);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDifference = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (dayDifference <= 0) {
    return "HARI INI";
  }

  if (dayDifference === 1) {
    return "KEMARIN";
  }

  if (dayDifference <= 7) {
    return "7 HARI LALU";
  }

  return "30 HARI LALU";
}

function groupConversations(conversations: Conversation[]) {
  const groups = new Map<string, Conversation[]>();

  for (const conversation of conversations) {
    const label = getConversationGroupLabel(conversation.updatedAt);
    groups.set(label, [...(groups.get(label) ?? []), conversation]);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
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

  return {
    text: text.replaceAll(continuationMarker, "").trimEnd(),
    needsContinuation,
  };
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

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

function MarkdownMessage({ text }: { text: string }) {
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
}

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

async function extractDocumentFromLocalUpload(file: File) {
  const formData = new FormData();
  formData.append("document", file);

  const response = await fetch("/api/document", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as {
    error?: string;
    fileName?: string;
    fileType?: "pdf" | "docx" | "pptx" | "xlsx";
    text?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Dokumen belum bisa dibaca.");
  }

  return data;
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
  const supabase = createSupabaseBrowserClient();
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedDocumentType, setUploadedDocumentType] =
    useState<UploadedDocumentType>("Dokumen");
  const [documentText, setDocumentText] = useState("");
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>("idle");
  const [documentError, setDocumentError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingFirstChunk, setIsAwaitingFirstChunk] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SelectedModel>("auto");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
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
  const documentTextRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const userInitials = getEmailInitials(userEmail);
  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(chatSearch.toLowerCase().trim()),
  );
  const conversationGroups = groupConversations(filteredConversations);
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );
  const currentTierLabel = usageSnapshot
    ? tierLabels[usageSnapshot.tier]
    : "Memuat";
  const allowedModels = usageSnapshot?.allowedModels ?? ["auto", "fast"];
  const selectedModelInfo = modelCatalog[selectedModel];
  const upgradePlan = getUpgradePlanForModel(upgradeTargetModel);
  const currentPlan = usageSnapshot ? getPlanByTier(usageSnapshot.tier) : null;
  const hasMessageQuota =
    !usageSnapshot || usageSnapshot.remainingMessagesToday > 0;
  const hasUploadQuota =
    !usageSnapshot || usageSnapshot.remainingUploadsToday > 0;
  const profileLabel =
    learningProfile.displayName ||
    learningProfile.schoolLevel ||
    "Lengkapi profil";

  const loadConversations = useCallback(async () => {
    setHistoryError("");
    setIsLoadingConversations(true);

    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,created_at,updated_at,selected_model,document_metadata")
      .order("updated_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error(error);
      setHistoryError("Riwayat obrolan belum bisa dimuat.");
      setIsLoadingConversations(false);
      return;
    }

    setConversations(((data ?? []) as ConversationRow[]).map(mapConversationRow));
    setIsLoadingConversations(false);
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

  const loadLearningProfile = useCallback(
    async (currentUserId: string) => {
      try {
        setProfileError("");
        const memory = await loadUserMemory(supabase, currentUserId);
        setLearningProfile(memory);
        setProfileDraft(memory);
        setFavoriteSubjectsDraft(memory.favoriteSubjects.join(", "));
        setSelectedModel(memory.defaultModel);
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
        loadConversations(),
        loadUsage(),
        loadLearningProfile(user.id),
      ]);
    }

    loadUser();
  }, [loadConversations, loadLearningProfile, loadUsage, router, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    document.documentElement.dataset.theme = learningProfile.themePreference;
  }, [learningProfile.themePreference]);

  function getCurrentDocumentMetadata(): DocumentMetadata | null {
    if (!uploadedFileName || documentStatus === "idle") {
      return null;
    }

    return {
      fileName: uploadedFileName,
      fileType: uploadedDocumentType,
      status: documentStatus,
    };
  }

  function resetDocumentState() {
    setUploadedFileName("");
    setUploadedDocumentType("Dokumen");
    documentTextRef.current = "";
    setDocumentText("");
    setDocumentStatus("idle");
    setDocumentError("");
  }

  function resetMemory() {
    setActiveConversationId("");
    setMessages([welcomeMessage]);
    setInput("");
    resetDocumentState();
    setRenamingConversationId("");
    setRenameValue("");
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

  async function loadConversation(conversation: Conversation) {
    if (isSending) return;

    setHistoryError("");
    setActiveConversationId(conversation.id);
    setSelectedModel(
      allowedModels.includes(conversation.model) ? conversation.model : "auto",
    );

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,conversation_id,role,content,created_at,selected_model,document_metadata",
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
      setUploadedFileName(latestDocumentMetadata.fileName);
      setUploadedDocumentType(latestDocumentMetadata.fileType);
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
        document_metadata: documentMetadata,
      })
      .select("id,title,created_at,updated_at,selected_model,document_metadata")
      .single();

    if (error) {
      throw error;
    }

    const conversation = mapConversationRow(data as ConversationRow);
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);

    return conversation;
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
    setActiveSettingsTab(tab);
    setIsSettingsOpen(true);
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
    setSettingsDataMessage("Export chat history akan tersedia di versi berikutnya.");
  }

  async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!hasUploadQuota) {
      setDocumentStatus("error");
      setDocumentError(
        "Limit upload dokumen harian paket kamu sudah habis. Silakan coba lagi besok atau upgrade paket.",
      );
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

    setUploadedFileName(file.name);
    setUploadedDocumentType(getUploadedDocumentType(fileName));
    documentTextRef.current = "";
    setDocumentText("");
    setDocumentError("");
    setDocumentStatus("loading");

    if (!isSupportedDocument) {
      setDocumentStatus("error");
      setDocumentError(
        "Format belum didukung. Mohon upload file PDF, Word (.docx), PowerPoint (.pptx), atau Excel (.xlsx).",
      );
      event.target.value = "";
      return;
    }

    if (file.size > maxDocumentUploadBytes) {
      setDocumentStatus("error");
      setDocumentError(
        "Ukuran dokumen terlalu besar. Mohon upload file maksimal 25 MB agar bisa dibaca dengan stabil.",
      );
      event.target.value = "";
      return;
    }

    try {
      const data = await extractDocumentFromLocalUpload(file);

      setUploadedFileName(data.fileName ?? file.name);
      setUploadedDocumentType(
        data.fileType === "docx"
          ? "Word"
          : data.fileType === "pptx"
            ? "PowerPoint"
            : data.fileType === "xlsx"
              ? "Excel"
              : "PDF",
      );
      documentTextRef.current = data.text ?? "";
      setDocumentText(documentTextRef.current);
      setDocumentStatus("loaded");
      await loadUsage();
    } catch (error) {
      console.error(error);
      setDocumentStatus("error");
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Dokumen belum bisa dibaca. Silakan coba file lain.",
      );
    } finally {
      // Allows uploading the same file again after an error or update.
      event.target.value = "";
    }
  }

  async function sendMessage(messageOverride?: string) {
    const userText = (messageOverride ?? input).trim();

    if (!userText || isSending || !hasMessageQuota) return;

    const currentDocumentContext = documentTextRef.current || documentText;
    const documentMetadata = getCurrentDocumentMetadata();
    let conversation = activeConversation;
    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        text: userText,
        model: selectedModel,
        documentMetadata,
      },
    ];
    const aiHistory = getRecentChatHistory(nextMessages);

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setIsAwaitingFirstChunk(true);

    try {
      conversation ??= await createConversation(userText);
      const currentConversation = conversation;

      const { error: userMessageError } = await supabase.from("messages").insert({
        conversation_id: currentConversation.id,
        role: "user",
        content: userText,
        selected_model: selectedModel,
        document_metadata: documentMetadata,
      });

      if (userMessageError) {
        throw userMessageError;
      }

      setMessages([
        ...nextMessages,
        {
          role: "ai",
          text: "",
          model: selectedModel,
          documentMetadata,
        },
      ]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: aiHistory,
          pdfContext: currentDocumentContext,
          selectedModel,
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
        const parsedReply = parseContinuationMarker(streamedReply);
        setIsAwaitingFirstChunk(false);
        setMessages((prev) => {
          const updatedMessages = [...prev];
          const lastMessage = updatedMessages.at(-1);

          if (lastMessage?.role === "ai") {
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              text: parsedReply.text,
              continuationSuggested: parsedReply.needsContinuation,
            };
          }

          return updatedMessages;
        });
      }

      const finalChunk = decoder.decode();

      if (finalChunk) {
        streamedReply += finalChunk;
        const parsedReply = parseContinuationMarker(streamedReply);
        setIsAwaitingFirstChunk(false);
        setMessages((prev) => {
          const updatedMessages = [...prev];
          const lastMessage = updatedMessages.at(-1);

          if (lastMessage?.role === "ai") {
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              text: parsedReply.text,
              continuationSuggested: parsedReply.needsContinuation,
            };
          }

          return updatedMessages;
        });
      }

      const finalReply = parseContinuationMarker(streamedReply);

      if (!finalReply.text.trim()) {
        throw new Error("Chat stream returned an empty reply");
      }

      const { error: assistantMessageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "assistant",
          content: finalReply.text,
          selected_model: selectedModel,
          document_metadata: documentMetadata,
        });

      if (assistantMessageError) {
        throw assistantMessageError;
      }

      const updatedAt = new Date().toISOString();
      await supabase
        .from("conversations")
        .update({
          selected_model: selectedModel,
          document_metadata: documentMetadata,
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
                  documentMetadata,
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
      console.error(error);
      const errorText = getFriendlyChatError(error);

      if (conversation?.id) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: errorText,
          selected_model: selectedModel,
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
                documentMetadata,
              },
            ]
          : [
              ...prev,
              {
                role: "ai",
                text: errorText,
                model: selectedModel,
                documentMetadata,
              },
            ],
      );
    } finally {
      await loadUsage();
      setIsAwaitingFirstChunk(false);
      setIsSending(false);
    }
  }

  function continueAnswer() {
    void sendMessage(
      "Lanjutkan jawaban sebelumnya dari bagian terakhir. Jangan ulangi dari awal, lanjutkan secara runtut sampai selesai.",
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
            placeholder="Cari obrolan"
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
              <h2 className="mb-5 text-sm font-bold tracking-wide text-[#4f665c]">
                {group.label}
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
                onClick={() => setIsModelMenuOpen((isOpen) => !isOpen)}
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
            </div>
          </div>

          <div className="relative flex items-center gap-3">
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
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={resetMemory}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#18392e] shadow-sm ring-1 ring-[#d8eadf]"
            >
              + Obrolan baru
            </button>
            {conversations.slice(0, 8).map((conversation) => (
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

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#18392e] shadow-sm ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]">
            <span className="text-xl text-[#008d54]">+</span>
            Upload PDF / Word / PowerPoint / Excel
            <input
              type="file"
              accept={supportedDocumentAccept}
              onChange={handleDocumentUpload}
              className="hidden"
            />
          </label>

          {uploadedFileName && (
            <p className="mt-2 truncate text-sm text-[#4f665c]">
              {uploadedFileName}
              {documentStatus === "loading" &&
                ` - membaca ${uploadedDocumentType}...`}
              {documentStatus === "loaded" && ` - ${uploadedDocumentType} siap`}
              {documentStatus === "error" &&
                ` - ${documentError || "gagal dibaca"}`}
            </p>
          )}
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
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]">
                    <span aria-hidden="true" className="text-2xl">⌘</span>
                    Lampirkan
                    <input
                      type="file"
                      accept={supportedDocumentAccept}
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#eef8f1]"
                  >
                    <Icon name="book" className="h-6 w-6" />
                    Mode Kajian
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
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-[#d3e8dc] focus-within:ring-[#95d6b9] sm:gap-3 sm:px-4">
              <label
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[#4f665c] transition hover:bg-[#eef8f1]"
                title="Lampirkan PDF, Word, PowerPoint, atau Excel"
                aria-label="Lampirkan PDF, Word, PowerPoint, atau Excel"
              >
                <span aria-hidden="true" className="text-2xl leading-none">+</span>
                <input
                  type="file"
                  accept={supportedDocumentAccept}
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>

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

            {uploadedFileName && (
              <p className="mx-auto mt-2 max-w-3xl truncate px-3 text-sm text-[#4f665c]">
                {uploadedFileName}
                {documentStatus === "loading" &&
                  ` - membaca ${uploadedDocumentType}...`}
                {documentStatus === "loaded" &&
                  ` - ${uploadedDocumentType} siap dianalisis`}
                {documentStatus === "error" &&
                  ` - ${documentError || "gagal dibaca"}`}
              </p>
            )}
          </div>
        )}
      </section>

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
                          updateProfileDraft("defaultStudyMode", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        {studyModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
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
                          Export chat history
                        </span>
                        <span className="mt-1 block text-sm text-[#4f665c]">
                          Placeholder untuk unduhan arsip obrolan.
                        </span>
                      </span>
                      <span className="text-sm font-bold text-[#008d54]">
                        Soon
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
                        PDF, DOCX, PPTX, XLSX.
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

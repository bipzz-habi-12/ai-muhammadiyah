"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import {
  getFriendlyChatError,
  parseContinuationMarker,
  continuationMarker,
} from "@/lib/chat/errors";
import {
  getModelProviderLabel,
  getLockedModelRequirement,
  getLockedSkillRequirement,
} from "@/lib/chat/selection-labels";
import { getEmailInitials } from "@/lib/formatting/text";
import { fetchKnowledgeSources } from "@/lib/knowledge";
import {
  emptyUserMemory,
  loadUserMemory,
  sanitizeUserMemory,
  updateUserMemory,
  type UserMemory,
} from "@/lib/memory/user-memory";
import {
  createConversationTitle,
  groupConversationsByWorkspace,
  mapConversationRow,
  sortConversations,
} from "@/lib/mappers/conversation";
import {
  resolveSkillIdFromLegacyValue,
  skillNameToLegacyStudyMode,
  skillToLegacyStudyMode,
} from "@/lib/mappers/legacy-study-mode";
import { getRecentChatHistory, mapMessageRow } from "@/lib/mappers/message";
import { mapWorkspaceRow } from "@/lib/mappers/workspace";
import {
  canAccessTier,
  fetchSkills,
  getSkillBadge,
  resolveAllowedSkill,
  type Skill,
} from "@/lib/skills";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getPlanByTier,
  getUpgradePlanForModel,
  modelCatalog,
  subscriptionPlans,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import { tierLabels, type UsageSnapshot, fetchUsageSnapshot } from "@/lib/usage/limits";
import {
  extractDocumentFromLocalUpload,
  getAttachmentKind,
  getAttachmentStatus,
  getLoadedDocumentText,
  getUploadedDocumentType,
  isSupportedUpload,
  sanitizeRecentAttachment,
} from "@/lib/chat/attachments";

type Message = {
  id?: string;
  role: "user" | "ai";
  text: string;
  createdAt?: string;
  model?: SelectedModel;
  skillId?: string | null;
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
  skillId: string | null;
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

const maxDocumentUploadBytes = 25 * 1024 * 1024;
const maxRecentFiles = 6;
const streamUiFlushMs = 48;

const welcomeMessage: Message = {
  role: "ai",
  text: "Assalamualaikum. Saya AI Muhammadiyah, siap membantu belajar Islam, Cambridge, OSN/STEM, dan coding.",
};

const modelOptions: SelectedModel[] = ["auto", "fast", "smart", "document"];

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
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
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
  const skillsRef = useRef<Skill[]>([]);
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
  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [skills, selectedSkillId],
  );
  const selectedSkillBadge = selectedSkill
    ? getSkillBadge(selectedSkill, usageSnapshot?.tier)
    : "";
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

  useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);

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
      sortConversations(
        ((data ?? []) as ConversationRow[]).map((row) =>
          mapConversationRow(row, skillsRef.current),
        ),
      ),
    );
    setIsLoadingConversations(false);
  }, [supabase]);

  const loadSkills = useCallback(
    async (currentUserId: string) => {
      setSkillsLoading(true);

      try {
        const data = await fetchSkills(supabase, currentUserId);
        setSkills(data);
      } catch (error) {
        console.error(error);
      } finally {
        setSkillsLoading(false);
      }
    },
    [supabase],
  );

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
      setSelectedSkillId((currentId) =>
        resolveAllowedSkill(currentId, snapshot?.tier, skillsRef.current)?.id ??
          null,
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
        setSelectedSkillId(
          resolveSkillIdFromLegacyValue(
            window.localStorage.getItem("ai-mu-study-mode") ??
              memory.defaultStudyMode,
            skillsRef.current,
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
        loadSkills(user.id),
      ]);
    }

    loadUser();
  }, [
    loadConversations,
    loadLearningProfile,
    loadSkills,
    loadUsage,
    loadWorkspaces,
    router,
    supabase,
  ]);

  useEffect(() => {
    if (skillsLoading || selectedSkillId || !skills.length) {
      return;
    }

    const fallback = resolveAllowedSkill(null, usageSnapshot?.tier, skills);

    if (fallback) {
      setSelectedSkillId(fallback.id);
    }
  }, [skillsLoading, skills, selectedSkillId, usageSnapshot?.tier]);

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
    if (selectedSkillId) {
      window.localStorage.setItem("ai-mu-study-mode", selectedSkillId);
    }
  }, [selectedSkillId]);

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
        const conversation = mapConversationRow(row, skillsRef.current);
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

  function selectSkill(skillId: string) {
    const skill = skills.find((item) => item.id === skillId);

    if (!skill || !canAccessTier(usageSnapshot?.tier, skill.minTier)) {
      setIsStudyModeMenuOpen(false);
      router.push("/plans");
      return;
    }

    setSelectedSkillId(skillId);
    setIsStudyModeMenuOpen(false);
  }

  async function loadConversation(conversation: Conversation) {
    if (isSending) return;

    setHistoryError("");
    setActiveConversationId(conversation.id);
    setSelectedModel(
      allowedModels.includes(conversation.model) ? conversation.model : "auto",
    );
    setSelectedSkillId(
      resolveAllowedSkill(conversation.skillId, usageSnapshot?.tier, skills)?.id ??
        null,
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

    const loadedMessages = ((data ?? []) as MessageRow[]).map((row) =>
      mapMessageRow(row, skills),
    );
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
        study_mode: skillToLegacyStudyMode(selectedSkill),
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

    const conversation = mapConversationRow(data as ConversationRow, skills);
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
      setSelectedSkillId(
        resolveAllowedSkill(
          resolveSkillIdFromLegacyValue(savedMemory.defaultStudyMode, skills),
          usageSnapshot?.tier,
          skills,
        )?.id ?? null,
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

    const activeSkill = resolveAllowedSkill(
      selectedSkillId,
      usageSnapshot?.tier,
      skills,
    );

    if (!activeSkill) {
      setComposerNotice("Skill masih dimuat, coba lagi sebentar.");
      return;
    }

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
      skillId: activeSkill.id,
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
          study_mode: skillToLegacyStudyMode(activeSkill),
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
            skillId: activeSkill.id,
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
          skillId: activeSkill.id,
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
              study_mode: skillToLegacyStudyMode(activeSkill),
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
              study_mode: skillToLegacyStudyMode(activeSkill),
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
          study_mode: skillToLegacyStudyMode(activeSkill),
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
                  skillId: activeSkill.id,
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
          study_mode: skillToLegacyStudyMode(activeSkill),
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
                skillId: activeSkill.id,
                documentMetadata,
              },
            ]
          : [
              ...prev,
              {
                role: "ai",
                text: errorText,
                model: selectedModel,
                skillId: activeSkill.id,
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
                <span className="truncate">
                  {selectedSkill ? selectedSkill.name : "Memuat skill..."}
                </span>
                {selectedSkill && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-[#008d54] ring-1 ring-[#d8eadf]">
                    {selectedSkillBadge}
                  </span>
                )}
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
                  {skillsLoading && !skills.length && (
                    <div className="p-3 text-xs font-semibold text-[#6b8178]">
                      Memuat skill...
                    </div>
                  )}
                  {skills.map((skill) => {
                    const isAllowed = canAccessTier(
                      usageSnapshot?.tier,
                      skill.minTier,
                    );
                    const badge = getSkillBadge(skill, usageSnapshot?.tier);

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => selectSkill(skill.id)}
                        className={
                          selectedSkillId === skill.id
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
                            {skill.name}
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
                              ? (skill.category ?? "")
                              : getLockedSkillRequirement(skill)}
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
                    {selectedSkill ? selectedSkill.name : "Memuat..."}
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
                {selectedSkill ? selectedSkill.name : "Memuat..."}
                <span className="text-[10px] text-[#4f665c]">
                  {selectedSkillBadge}
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
                            event.target.value as UserMemory["defaultStudyMode"],
                          )
                        }
                        className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                      >
                        {skills
                          .filter(
                            (skill) =>
                              skill.ownerId === null &&
                              skillNameToLegacyStudyMode[skill.name],
                          )
                          .map((skill) => (
                            <option
                              key={skill.id}
                              value={skillToLegacyStudyMode(skill)}
                            >
                              {skill.name} ({getSkillBadge(skill, usageSnapshot?.tier)})
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

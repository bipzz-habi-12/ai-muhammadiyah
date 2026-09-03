"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { measureContextUsage } from "@/lib/ai/context-window";
import { Icon } from "@/components/icons";
import ArtifactPanel from "@/components/ArtifactPanel";
import ChatArea from "@/components/ChatArea";
import Composer from "@/components/Composer";
import KnowledgeSidebar from "@/components/KnowledgeSidebar";
import BottomNav from "@/components/BottomNav";
import HistorySheet from "@/components/HistorySheet";
import ShareModal from "@/components/ShareModal";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import ToolPlaceholder from "@/components/ToolPlaceholder";
import TopBar from "@/components/TopBar";
import UpgradeModal from "@/components/UpgradeModal";
import WorkspaceModal from "@/components/WorkspaceModal";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useAttachments } from "@/hooks/useAttachments";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useChatSession } from "@/hooks/useChatSession";
import { useConversations } from "@/hooks/useConversations";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useModelSelection } from "@/hooks/useModelSelection";
import { useSettingsPanel } from "@/hooks/useSettingsPanel";
import { useSkills } from "@/hooks/useSkills";
import { applyUsageConstraints, useUsage } from "@/hooks/useUsage";
import { useUserMemory } from "@/hooks/useUserMemory";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { canAccessTier } from "@/lib/skills";
import { getEmailInitials } from "@/lib/formatting/text";
import {
  groupConversationsByWorkspace,
  mapConversationRow,
  sortConversations,
} from "@/lib/mappers/conversation";
import type { ActiveTool, ConversationRow } from "@/lib/mappers/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { type PlanModelId } from "@/lib/subscriptions/plans";

type SelectedModel = PlanModelId;

const modelOptions: SelectedModel[] = ["aether", "cosmos", "prism", "velo"];

const supportedDocumentAccept =
  "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,image/png,.png,image/jpeg,.jpg,.jpeg,image/webp,.webp";

export default function Home() {
  const { userId, userEmail, isLoggingOut, handleLogout } = useAuthSession();
  const [historyError, setHistoryError] = useState("");
  const [activeTool, setActiveTool] = useState<ActiveTool>("chat");
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    newWorkspaceName,
    setNewWorkspaceName,
    isCreatingWorkspace,
    loadWorkspaces,
    createWorkspace,
    updateWorkspaceSystemInstructions,
  } = useWorkspaces(setHistoryError);
  // model/skill dropdowns now live in the Composer (Part 2); the open-state is
  // still owned here and threaded through.
  const [isStudyModeMenuOpen, setIsStudyModeMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  // Sheet riwayat mobile — pengganti MobileToolbar lama. Semua kontrol riwayat
  // (cari, workspace tujuan, daftar chat) pindah ke sini supaya layar chat
  // berangkat dari sapaan + kotak tulis, bukan dari deretan kontrol.
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  // Deep link from /workspace/[id]: "/?conversationId=<uuid>" opens that chat
  // once after the conversation list finishes its initial load. A ref (not
  // state): consumed exactly once, and the resolve effect is already re-run by
  // the isLoadingConversations flip, so no extra render is needed.
  const pendingConversationIdRef = useRef<string | null>(null);
  // Deep link from /work: "/?skill=/surat" preselects that skill for the next
  // message. Same ref-consumed-once pattern, resolved after the skill list
  // loads (the slash command is only resolvable to an id once skills arrive).
  const pendingSkillSlashRef = useRef<string | null>(null);
  const {
    knowledgeSources,
    isKnowledgeAdmin,
    isLoadingKnowledge,
    isUploadingKnowledge,
    knowledgeTitle,
    setKnowledgeTitle,
    knowledgeCategory,
    setKnowledgeCategory,
    knowledgeMessage,
    setKnowledgeMessage,
    knowledgeError,
    setKnowledgeError,
    hasLoadedKnowledgeRef,
    loadKnowledge,
    handleKnowledgeUpload,
  } = useKnowledgeBase();
  const {
    usageSnapshot,
    usageError,
    loadUsage: loadUsageSnapshot,
    currentTierLabel,
    allowedModels,
    availableProviders,
    currentPlan,
    hasMessageQuota,
    hasUploadQuota,
  } = useUsage();
  const {
    skills,
    skillsLoading,
    selectedSkillId,
    setSelectedSkillId,
    skillsRef,
    loadSkills,
    selectSkill,
    selectedSkill,
    selectedSkillBadge,
    messageSkillOverrideId,
    setMessageSkillOverrideId,
    createCustomSkill,
    updateCustomSkill,
    deleteCustomSkill,
    isMutatingSkill,
    skillMutationError,
    setSkillMutationError,
  } = useSkills(usageSnapshot?.tier, setIsStudyModeMenuOpen);
  const {
    selectedModel,
    setSelectedModel,
    selectedProvider,
    selectProvider,
    selectedEngineLabel,
    isModelMenuOpen,
    setIsModelMenuOpen,
    isEffortMenuOpen,
    setIsEffortMenuOpen,
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeTargetModel,
    selectedModelInfo,
    upgradePlan,
    selectModel,
    effort,
    setEffort,
    isThinkingEnabled,
    toggleThinking,
  } = useModelSelection(allowedModels, availableProviders);
  const {
    learningProfile,
    profileDraft,
    setProfileDraft,
    favoriteSubjectsDraft,
    setFavoriteSubjectsDraft,
    isSavingProfile,
    profileError,
    setProfileError,
    profileSavedMessage,
    setProfileSavedMessage,
    profileLabel,
    loadLearningProfile,
    updateProfileDraft,
    saveLearningProfile,
  } = useUserMemory(
    userId,
    skills,
    usageSnapshot?.tier,
    setSelectedModel,
    setSelectedSkillId,
  );
  const loadUsage = useCallback(async () => {
    const snapshot = await loadUsageSnapshot();
    applyUsageConstraints(snapshot, skillsRef, setSelectedModel, setSelectedSkillId);
    return snapshot;
  }, [loadUsageSnapshot, skillsRef, setSelectedModel, setSelectedSkillId]);
  const {
    uploadedAttachments,
    setUploadedAttachments,
    recentAttachments,
    documentText,
    setDocumentText,
    documentStatus,
    setDocumentStatus,
    documentError,
    setDocumentError,
    composerNotice,
    setComposerNotice,
    isAttachMenuOpen,
    setIsAttachMenuOpen,
    documentTextRef,
    getCurrentDocumentMetadata,
    resetDocumentState,
    reuseRecentAttachment,
    removeAttachment,
    retryAttachment,
    handleDocumentUpload,
    showComposerNotice,
  } = useAttachments(userId, hasUploadQuota, loadUsage);
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    isLoadingConversations,
    renamingConversationId,
    setRenamingConversationId,
    renameValue,
    setRenameValue,
    chatSearch,
    setChatSearch,
    loadConversations,
    renameConversation,
    deleteConversation,
    toggleConversationPin,
    updateConversationWorkspace,
    visibleConversations,
    activeConversation,
  } = useConversations(skillsRef, setHistoryError);
  const {
    artifacts,
    isLoadingArtifacts,
    activeArtifact,
    setActiveArtifactId,
    isArtifactPanelOpen,
    setIsArtifactPanelOpen,
    loadArtifacts,
    saveArtifacts,
    deleteArtifact,
    resetArtifacts,
  } = useArtifacts();
  const {
    messages,
    input,
    setInput,
    isSending,
    isAwaitingFirstChunk,
    sharePreview,
    setSharePreview,
    messagesEndRef,
    sendMessage,
    loadConversation,
    resetChatSessionState,
    exportActiveChatMarkdown,
    openSharePreview,
  } = useChatSession(
    userId,
    setHistoryError,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaces,
    usageSnapshot,
    hasMessageQuota,
    allowedModels,
    loadUsage,
    skills,
    selectedSkillId,
    setSelectedSkillId,
    selectedSkill,
    selectedModel,
    setSelectedModel,
    effort,
    isThinkingEnabled,
    uploadedAttachments,
    setUploadedAttachments,
    documentText,
    setDocumentText,
    setDocumentStatus,
    setDocumentError,
    documentTextRef,
    getCurrentDocumentMetadata,
    resetDocumentState,
    setComposerNotice,
    setConversations,
    activeConversation,
    setActiveConversationId,
    messageSkillOverrideId,
    setMessageSkillOverrideId,
    saveArtifacts,
    loadArtifacts,
    selectedProvider,
  );
  const resetMemory = useCallback(() => {
    setActiveConversationId("");
    setRenamingConversationId("");
    setRenameValue("");
    resetChatSessionState();
    resetDocumentState();
    resetArtifacts();
  }, [
    setActiveConversationId,
    setRenamingConversationId,
    setRenameValue,
    resetChatSessionState,
    resetDocumentState,
    resetArtifacts,
  ]);
  const userInitials = useMemo(() => getEmailInitials(userEmail), [userEmail]);
  // Nama workspace aktif — dulu hanya tampil sebagai <select> di MobileToolbar;
  // sekarang jadi baris konteks di header, dan tetap satu-satunya cara ganti
  // workspace di mobile (lewat WorkspaceModal).
  const activeWorkspaceName = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId)
        ?.name ?? "General",
    [selectedWorkspaceId, workspaces],
  );
  const conversationGroups = useMemo(
    () => groupConversationsByWorkspace(visibleConversations, workspaces),
    [visibleConversations, workspaces],
  );
  // Pemakaian context window dihitung di client dari state yang sudah ada —
  // tidak perlu round-trip ke server untuk indikatornya.
  const contextUsage = useMemo(
    () =>
      measureContextUsage({
        history: messages.map((message) => ({
          role: message.role,
          text: message.text,
        })),
        documentText,
      }),
    [messages, documentText],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    async function loadInitialData() {
      const [, , usageSnapshotResult, fetchedSkills] = await Promise.all([
        loadWorkspaces(),
        loadConversations(),
        loadUsage(),
        loadSkills(userId),
      ]);
      await loadLearningProfile(userId, fetchedSkills, usageSnapshotResult?.tier);
    }

    loadInitialData();
  }, [
    userId,
    loadConversations,
    loadLearningProfile,
    loadSkills,
    loadUsage,
    loadWorkspaces,
  ]);

  // Capture deep-link params once on mount, then strip them from the URL so a
  // reload doesn't re-trigger them:
  //  - ?conversationId= opens that chat (from a workspace chat card)
  //  - ?workspaceId= preselects the workspace so the next new chat is created
  //    inside it (from the workspace page's "New chat" button)
  //  - ?ask= prefills the composer with a question (from the Research page)
  //  - ?skill= preselects a skill by its slash command (from the Work page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const conversationId = params.get("conversationId");
    if (conversationId && uuidRegex.test(conversationId)) {
      pendingConversationIdRef.current = conversationId;
    }

    const workspaceId = params.get("workspaceId");
    if (workspaceId && uuidRegex.test(workspaceId)) {
      setSelectedWorkspaceId(workspaceId);
    }

    const ask = params.get("ask");
    if (ask) {
      setInput(ask.slice(0, 2000));
    }

    const skillSlash = params.get("skill");
    if (skillSlash) {
      pendingSkillSlashRef.current = skillSlash.slice(0, 64);
    }

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [setSelectedWorkspaceId, setInput]);

  // Resolve ?skill= once the skill list has loaded. Gated by tier on purpose:
  // a locked skill is left unset rather than silently swapped for the default
  // server-side by resolveAllowedSkill, which would look like the deep link
  // worked when it did not.
  useEffect(() => {
    const pendingSlash = pendingSkillSlashRef.current;

    if (!pendingSlash || skillsLoading || skills.length === 0) {
      return;
    }

    pendingSkillSlashRef.current = null;

    const target = skills.find(
      (skill) => skill.slashCommand?.toLowerCase() === pendingSlash.toLowerCase(),
    );

    if (target && canAccessTier(usageSnapshot?.tier, target.minTier)) {
      setMessageSkillOverrideId(target.id);
    }
  }, [
    skills,
    skillsLoading,
    usageSnapshot?.tier,
    setMessageSkillOverrideId,
  ]);

  // Resolve the deep link after the initial conversation load. If the target is
  // outside the 40-item list, fetch it directly and MERGE it into the list first —
  // activeConversation is derived from that list, and sendMessage would otherwise
  // treat the loaded chat as brand new and create a duplicate conversation.
  useEffect(() => {
    const pendingConversationId = pendingConversationIdRef.current;

    if (!pendingConversationId || isLoadingConversations) {
      return;
    }

    pendingConversationIdRef.current = null;

    const target = conversations.find(
      (conversation) => conversation.id === pendingConversationId,
    );

    if (target) {
      void loadConversation(target);
      return;
    }

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id,title,created_at,updated_at,selected_model,study_mode,document_metadata,workspace_id,is_pinned",
        )
        .eq("id", pendingConversationId)
        .maybeSingle();

      if (error || !data) {
        if (error) {
          console.error(error);
        }
        setHistoryError("Obrolan dari tautan belum bisa dimuat.");
        return;
      }

      const conversation = mapConversationRow(
        data as ConversationRow,
        skillsRef.current,
      );
      setConversations((prev) =>
        prev.some((item) => item.id === conversation.id)
          ? prev
          : sortConversations([...prev, conversation]),
      );
      void loadConversation(conversation);
    })();
  }, [
    isLoadingConversations,
    conversations,
    loadConversation,
    setConversations,
    skillsRef,
  ]);

  const {
    isSettingsOpen,
    setIsSettingsOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    settingsDataMessage,
    openSettings,
    openLearningProfile,
    deleteAllChatHistory,
    exportChatHistoryPlaceholder,
  } = useSettingsPanel(
    learningProfile,
    setProfileDraft,
    setFavoriteSubjectsDraft,
    setProfileError,
    setProfileSavedMessage,
    setKnowledgeMessage,
    setKnowledgeError,
    hasLoadedKnowledgeRef,
    isLoadingKnowledge,
    loadKnowledge,
    setConversations,
    resetMemory,
    exportActiveChatMarkdown,
  );

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
                className="flex min-w-[210px] max-w-[280px] items-center gap-3 rounded-2xl bg-[var(--pure-white)] px-3 py-2 text-left shadow-sm ring-1 ring-[var(--brand-deep-line)]/10"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                  <Icon
                    name={attachment.kind === "image" ? "idea" : "book"}
                    className="h-5 w-5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[var(--ink)]">
                    {attachment.fileName}
                  </span>
                  <span
                    className={
                      attachment.status === "error"
                        ? "block truncate text-xs font-semibold text-[var(--danger)]"
                        : "block truncate text-xs font-semibold text-[var(--muted-2)]"
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
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-[var(--brand)] transition hover:bg-[var(--surface-border)]"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`Hapus ${attachment.fileName}`}
                  title="Hapus"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--c-6d8178)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {composerNotice && (
          <p className="mt-2 rounded-2xl bg-[var(--brand)]/10 px-3 py-2 text-sm font-semibold text-[var(--brand)] ring-1 ring-[var(--brand-deep-line)]/10">
            {composerNotice}
          </p>
        )}

        {documentStatus === "error" && documentError && (
          <p className="mt-2 rounded-2xl bg-[var(--danger-bg)] px-3 py-2 text-sm font-semibold text-[var(--danger-ink)] ring-1 ring-[var(--danger-bg)]">
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
      <div className="absolute bottom-full left-0 z-20 mb-3 w-72 overflow-hidden rounded-3xl bg-[var(--pure-white)] p-2 text-sm shadow-2xlring-1 ring-[var(--brand-deep-line)]/10">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 font-bold text-[var(--ink)] transition hover:bg-[var(--surface-border)]">
          <Icon name="book" className="h-5 w-5 text-[var(--brand)]" />
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
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[var(--muted-3)]">
            <Icon name="edit" className="h-4 w-4 text-[var(--brand)]" />
            Recent files
          </div>
          {recentAttachments.length ? (
            <div className="space-y-1">
              {recentAttachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => reuseRecentAttachment(attachment)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-border)]"
                >
                  <Icon
                    name={attachment.kind === "image" ? "idea" : "book"}
                    className="h-4 w-4 shrink-0 text-[var(--brand)]"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {attachment.fileName}
                  </span>
                  <span className="text-xs text-[var(--muted-3)]">
                    {attachment.fileType}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold text-[var(--muted-3)]">
              Belum ada file terbaru.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            showComposerNotice("Create image masih Coming soon sampai provider image generation dikonfigurasi.")
          }
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[var(--ink)] transition hover:bg-[var(--surface-border)]"
        >
          <Icon name="idea" className="h-5 w-5 text-[var(--brand)]" />
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
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[var(--ink)] transition hover:bg-[var(--surface-border)]"
          >
            <Icon name="lock" className="h-5 w-5 text-[var(--brand)]" />
            Knowledge source upload
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsStudyModeMenuOpen(true);
            setIsAttachMenuOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[var(--ink)] transition hover:bg-[var(--surface-border)]"
        >
          <Icon name="cap" className="h-5 w-5 text-[var(--brand)]" />
          Study mode
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            setIsAttachMenuOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[var(--ink)] transition hover:bg-[var(--surface-border)]"
        >
          <Icon name="settings" className="h-5 w-5 text-[var(--brand)]" />
          Settings
        </button>
      </div>
    );
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--ink)]">
      <Sidebar
        chatSearch={chatSearch}
        setChatSearch={setChatSearch}
        isLoadingConversations={isLoadingConversations}
        historyError={historyError}
        conversationGroups={conversationGroups}
        activeConversationId={activeConversationId}
        loadConversation={loadConversation}
        resetMemory={resetMemory}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        workspaces={workspaces}
        renamingConversationId={renamingConversationId}
        setRenamingConversationId={setRenamingConversationId}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        renameConversation={renameConversation}
        toggleConversationPin={toggleConversationPin}
        deleteConversation={deleteConversation}
        updateConversationWorkspace={updateConversationWorkspace}
        isAccountMenuOpen={isAccountMenuOpen}
        setIsAccountMenuOpen={setIsAccountMenuOpen}
        currentTierLabel={currentTierLabel}
        usageSnapshot={usageSnapshot}
        usageError={usageError}
        openLearningProfile={openLearningProfile}
        openSettings={openSettings}
        profileLabel={profileLabel}
        handleLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        userInitials={userInitials}
        userEmail={userEmail}
      />

      <section className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">
        <TopBar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeConversation={activeConversation}
          selectedSkill={selectedSkill}
          activeWorkspaceName={activeWorkspaceName}
          onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
          exportActiveChatMarkdown={exportActiveChatMarkdown}
          openSharePreview={openSharePreview}
          toggleConversationPin={toggleConversationPin}
          onOpenHistory={() => setIsHistorySheetOpen(true)}
          resetMemory={resetMemory}
          openSettings={openSettings}
          artifactCount={artifacts.length}
          isArtifactPanelOpen={isArtifactPanelOpen}
          setIsArtifactPanelOpen={setIsArtifactPanelOpen}
        />

        {activeTool === "chat" ? (
          <>
            <ChatArea
              messages={messages}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              isSending={isSending}
              isAwaitingFirstChunk={isAwaitingFirstChunk}
              hasMessageQuota={hasMessageQuota}
              messagesEndRef={messagesEndRef}
              setIsAttachMenuOpen={setIsAttachMenuOpen}
              renderAttachMenu={renderAttachMenu}
              renderAttachmentChips={renderAttachmentChips}
              setIsStudyModeMenuOpen={setIsStudyModeMenuOpen}
              setIsModelMenuOpen={setIsModelMenuOpen}
              selectedSkill={selectedSkill}
              selectedSkillBadge={selectedSkillBadge}
              selectedModel={selectedModel}
              selectModel={selectModel}
              allowedModels={allowedModels}
              selectedProvider={selectedProvider}
              selectProvider={selectProvider}
              availableProviders={availableProviders}
              selectedEngineLabel={selectedEngineLabel}
              isModelMenuOpen={isModelMenuOpen}
              modelOptions={modelOptions}
              selectedModelInfo={selectedModelInfo}
              isEffortMenuOpen={isEffortMenuOpen}
              setIsEffortMenuOpen={setIsEffortMenuOpen}
              effort={effort}
              setEffort={setEffort}
              isThinkingEnabled={isThinkingEnabled}
              toggleThinking={toggleThinking}
              skills={skills}
              skillsLoading={skillsLoading}
              selectedSkillId={selectedSkillId}
              selectSkill={selectSkill}
              setSelectedSkillId={setSelectedSkillId}
              usageSnapshot={usageSnapshot}
              isStudyModeMenuOpen={isStudyModeMenuOpen}
              messageSkillOverrideId={messageSkillOverrideId}
              setMessageSkillOverrideId={setMessageSkillOverrideId}
              activeConversationId={activeConversationId}
              activeWorkspaceId={selectedWorkspaceId}
            />

            {messages.length > 1 && (
              <Composer
                variant="active"
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                isSending={isSending}
                hasMessageQuota={hasMessageQuota}
                setIsAttachMenuOpen={setIsAttachMenuOpen}
                renderAttachMenu={renderAttachMenu}
                renderAttachmentChips={renderAttachmentChips}
                setIsStudyModeMenuOpen={setIsStudyModeMenuOpen}
                setIsModelMenuOpen={setIsModelMenuOpen}
                selectedSkill={selectedSkill}
                selectedSkillBadge={selectedSkillBadge}
                selectedModel={selectedModel}
                selectModel={selectModel}
                allowedModels={allowedModels}
                selectedProvider={selectedProvider}
                selectProvider={selectProvider}
                availableProviders={availableProviders}
                selectedEngineLabel={selectedEngineLabel}
                isModelMenuOpen={isModelMenuOpen}
                modelOptions={modelOptions}
                selectedModelInfo={selectedModelInfo}
                isEffortMenuOpen={isEffortMenuOpen}
                setIsEffortMenuOpen={setIsEffortMenuOpen}
                effort={effort}
                setEffort={setEffort}
                isThinkingEnabled={isThinkingEnabled}
                toggleThinking={toggleThinking}
                skills={skills}
                skillsLoading={skillsLoading}
                selectedSkillId={selectedSkillId}
                selectSkill={selectSkill}
                setSelectedSkillId={setSelectedSkillId}
                contextUsage={contextUsage}
                usageSnapshot={usageSnapshot}
                isStudyModeMenuOpen={isStudyModeMenuOpen}
                messageSkillOverrideId={messageSkillOverrideId}
                setMessageSkillOverrideId={setMessageSkillOverrideId}
              />
            )}
          </>
        ) : (
          <ToolPlaceholder tool={activeTool} />
        )}

        {/* Nav bawah mobile. Sengaja SELALU tampil di halaman chat — termasuk
            saat percakapan berjalan — supaya tidak ada jalan buntu: sebelum
            ini, di HP tidak ada satu pun tautan ke Workspace/Library/Lainnya
            dari layar chat. */}
        <BottomNav />
      </section>

      {/* Artifact panel replaces the knowledge sidebar while open (Master Plan
          v2: knowledge sidebar collapses so the layout doesn't get cramped).
          Knowledge sidebar hanya muncul untuk user yang MEMANG punya knowledge
          source; user biasa (belum pernah upload) tidak melihat panel kosong —
          menambah source tetap bisa lewat Settings > Knowledge Base. */}
      {activeTool === "chat" && isArtifactPanelOpen ? (
        <ArtifactPanel
          artifacts={artifacts}
          isLoadingArtifacts={isLoadingArtifacts}
          activeArtifact={activeArtifact}
          setActiveArtifactId={setActiveArtifactId}
          onClose={() => setIsArtifactPanelOpen(false)}
          deleteArtifact={deleteArtifact}
        />
      ) : knowledgeSources.length > 0 ? (
        <KnowledgeSidebar
          knowledgeSources={knowledgeSources}
          isLoadingKnowledge={isLoadingKnowledge}
          openSettings={openSettings}
        />
      ) : null}

      <HistorySheet
        isOpen={isHistorySheetOpen}
        onClose={() => setIsHistorySheetOpen(false)}
        chatSearch={chatSearch}
        setChatSearch={setChatSearch}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        setSelectedWorkspaceId={setSelectedWorkspaceId}
        isLoadingConversations={isLoadingConversations}
        historyError={historyError}
        conversationGroups={conversationGroups}
        activeConversationId={activeConversationId}
        loadConversation={loadConversation}
        toggleConversationPin={toggleConversationPin}
        deleteConversation={deleteConversation}
        resetMemory={resetMemory}
      />

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        setSelectedWorkspaceId={setSelectedWorkspaceId}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        isCreatingWorkspace={isCreatingWorkspace}
        createWorkspace={createWorkspace}
        updateWorkspaceSystemInstructions={updateWorkspaceSystemInstructions}
      />

      <ShareModal sharePreview={sharePreview} setSharePreview={setSharePreview} />

      <UpgradeModal
        isUpgradeOpen={isUpgradeOpen}
        setIsUpgradeOpen={setIsUpgradeOpen}
        upgradeTargetModel={upgradeTargetModel}
        currentTierLabel={currentTierLabel}
        upgradePlan={upgradePlan}
        usageSnapshot={usageSnapshot}
      />

      <SettingsModal
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        activeSettingsTab={activeSettingsTab}
        setActiveSettingsTab={setActiveSettingsTab}
        profileDraft={profileDraft}
        updateProfileDraft={updateProfileDraft}
        modelOptions={modelOptions}
        skills={skills}
        usageSnapshot={usageSnapshot}
        userId={userId}
        createCustomSkill={createCustomSkill}
        updateCustomSkill={updateCustomSkill}
        deleteCustomSkill={deleteCustomSkill}
        isMutatingSkill={isMutatingSkill}
        skillMutationError={skillMutationError}
        setSkillMutationError={setSkillMutationError}
        favoriteSubjectsDraft={favoriteSubjectsDraft}
        setFavoriteSubjectsDraft={setFavoriteSubjectsDraft}
        currentPlan={currentPlan}
        currentTierLabel={currentTierLabel}
        resetMemory={resetMemory}
        deleteAllChatHistory={deleteAllChatHistory}
        exportChatHistoryPlaceholder={exportChatHistoryPlaceholder}
        settingsDataMessage={settingsDataMessage}
        userEmail={userEmail}
        handleLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isLoadingKnowledge={isLoadingKnowledge}
        knowledgeSources={knowledgeSources}
        isKnowledgeAdmin={isKnowledgeAdmin}
        knowledgeTitle={knowledgeTitle}
        setKnowledgeTitle={setKnowledgeTitle}
        knowledgeCategory={knowledgeCategory}
        setKnowledgeCategory={setKnowledgeCategory}
        isUploadingKnowledge={isUploadingKnowledge}
        handleKnowledgeUpload={handleKnowledgeUpload}
        knowledgeError={knowledgeError}
        knowledgeMessage={knowledgeMessage}
        supportedDocumentAccept={supportedDocumentAccept}
        profileError={profileError}
        profileSavedMessage={profileSavedMessage}
        saveLearningProfile={saveLearningProfile}
        isSavingProfile={isSavingProfile}
      />
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import Composer from "@/components/Composer";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
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
import { getEmailInitials } from "@/lib/formatting/text";
import { type UserMemory } from "@/lib/memory/user-memory";
import { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import {
  skillNameToLegacyStudyMode,
  skillToLegacyStudyMode,
} from "@/lib/mappers/legacy-study-mode";
import type { SettingsTab } from "@/lib/mappers/types";
import { getSkillBadge } from "@/lib/skills";
import {
  modelCatalog,
  subscriptionPlans,
  type PlanModelId,
} from "@/lib/subscriptions/plans";

type SelectedModel = PlanModelId;

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
  const { userId, userEmail, isLoggingOut, handleLogout } = useAuthSession();
  const [historyError, setHistoryError] = useState("");
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    newWorkspaceName,
    setNewWorkspaceName,
    isCreatingWorkspace,
    loadWorkspaces,
    createWorkspace,
  } = useWorkspaces(setHistoryError);
  const [isStudyModeMenuOpen, setIsStudyModeMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
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
  } = useSkills(usageSnapshot?.tier, setIsStudyModeMenuOpen);
  const {
    selectedModel,
    setSelectedModel,
    isModelMenuOpen,
    setIsModelMenuOpen,
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeTargetModel,
    selectedModelInfo,
    upgradePlan,
    selectModel,
  } = useModelSelection(allowedModels);
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
    messages,
    input,
    setInput,
    isSending,
    isAwaitingFirstChunk,
    sharePreview,
    setSharePreview,
    messagesEndRef,
    sendMessage,
    continueAnswer,
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
  );
  const resetMemory = useCallback(() => {
    setActiveConversationId("");
    setRenamingConversationId("");
    setRenameValue("");
    resetChatSessionState();
    resetDocumentState();
  }, [
    setActiveConversationId,
    setRenamingConversationId,
    setRenameValue,
    resetChatSessionState,
    resetDocumentState,
  ]);
  const userInitials = useMemo(() => getEmailInitials(userEmail), [userEmail]);
  const conversationGroups = useMemo(
    () => groupConversationsByWorkspace(visibleConversations, workspaces),
    [visibleConversations, workspaces],
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
      <Sidebar
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        setSelectedWorkspaceId={setSelectedWorkspaceId}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        isCreatingWorkspace={isCreatingWorkspace}
        createWorkspace={createWorkspace}
        chatSearch={chatSearch}
        setChatSearch={setChatSearch}
        isLoadingConversations={isLoadingConversations}
        historyError={historyError}
        conversationGroups={conversationGroups}
        activeConversationId={activeConversationId}
        renamingConversationId={renamingConversationId}
        setRenamingConversationId={setRenamingConversationId}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        loadConversation={loadConversation}
        renameConversation={renameConversation}
        toggleConversationPin={toggleConversationPin}
        deleteConversation={deleteConversation}
        updateConversationWorkspace={updateConversationWorkspace}
        resetMemory={resetMemory}
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

      <section className="flex min-w-0 flex-1 flex-col bg-[#fbfdfb]">
        <TopBar
          selectedModelInfo={selectedModelInfo}
          selectedModel={selectedModel}
          allowedModels={allowedModels}
          isModelMenuOpen={isModelMenuOpen}
          setIsModelMenuOpen={setIsModelMenuOpen}
          selectModel={selectModel}
          modelOptions={modelOptions}
          isStudyModeMenuOpen={isStudyModeMenuOpen}
          setIsStudyModeMenuOpen={setIsStudyModeMenuOpen}
          selectedSkill={selectedSkill}
          selectedSkillBadge={selectedSkillBadge}
          skills={skills}
          skillsLoading={skillsLoading}
          selectedSkillId={selectedSkillId}
          selectSkill={selectSkill}
          usageSnapshot={usageSnapshot}
          activeConversation={activeConversation}
          toggleConversationPin={toggleConversationPin}
          exportActiveChatMarkdown={exportActiveChatMarkdown}
          openSharePreview={openSharePreview}
          currentTierLabel={currentTierLabel}
          isAccountMenuOpen={isAccountMenuOpen}
          setIsAccountMenuOpen={setIsAccountMenuOpen}
          userInitials={userInitials}
          openLearningProfile={openLearningProfile}
          openSettings={openSettings}
          handleLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

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

              <Composer
                variant="welcome"
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
              />

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
          />
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import ChatArea from "@/components/ChatArea";
import Composer from "@/components/Composer";
import ShareModal from "@/components/ShareModal";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import TopBar from "@/components/TopBar";
import UpgradeModal from "@/components/UpgradeModal";
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
import { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import { type PlanModelId } from "@/lib/subscriptions/plans";

type SelectedModel = PlanModelId;

const modelOptions: SelectedModel[] = ["auto", "fast", "smart", "document"];

const supportedDocumentAccept =
  "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,image/png,.png,image/jpeg,.jpg,.jpeg,image/webp,.webp";

export default function Home() {
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

        <ChatArea
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isSending={isSending}
          isAwaitingFirstChunk={isAwaitingFirstChunk}
          hasMessageQuota={hasMessageQuota}
          continueAnswer={continueAnswer}
          messagesEndRef={messagesEndRef}
          setIsAttachMenuOpen={setIsAttachMenuOpen}
          renderAttachMenu={renderAttachMenu}
          renderAttachmentChips={renderAttachmentChips}
          setIsStudyModeMenuOpen={setIsStudyModeMenuOpen}
          setIsModelMenuOpen={setIsModelMenuOpen}
          selectedSkill={selectedSkill}
          selectedSkillBadge={selectedSkillBadge}
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
          />
        )}
      </section>

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

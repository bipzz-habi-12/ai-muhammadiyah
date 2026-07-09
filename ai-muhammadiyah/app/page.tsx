"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import ChatArea from "@/components/ChatArea";
import Composer from "@/components/Composer";
import DocsPanel from "@/components/DocsPanel";
import IconRail from "@/components/IconRail";
import KnowledgeSidebar from "@/components/KnowledgeSidebar";
import MobileToolbar from "@/components/MobileToolbar";
import ShareModal from "@/components/ShareModal";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import ToolPlaceholder from "@/components/ToolPlaceholder";
import TopBar from "@/components/TopBar";
import UpgradeModal from "@/components/UpgradeModal";
import WorkspaceModal from "@/components/WorkspaceModal";
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
import type { ActiveTool } from "@/lib/mappers/types";
import { type PlanModelId } from "@/lib/subscriptions/plans";

type SelectedModel = PlanModelId;

const modelOptions: SelectedModel[] = ["auto", "fast", "smart", "document"];

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
  } = useWorkspaces(setHistoryError);
  // model/skill dropdowns now live in the Composer (Part 2); the open-state is
  // still owned here and threaded through.
  const [isStudyModeMenuOpen, setIsStudyModeMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
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
                className="flex min-w-[210px] max-w-[280px] items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-[#bec9be]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#004d27]/10 text-[#004d27]">
                  <Icon
                    name={attachment.kind === "image" ? "idea" : "book"}
                    className="h-5 w-5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#191c1d]">
                    {attachment.fileName}
                  </span>
                  <span
                    className={
                      attachment.status === "error"
                        ? "block truncate text-xs font-semibold text-[#ba1a1a]"
                        : "block truncate text-xs font-semibold text-[#3f4940]"
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
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-[#004d27] transition hover:bg-[#edeeef]"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`Hapus ${attachment.fileName}`}
                  title="Hapus"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#6d8178] transition hover:bg-[#ffdad6] hover:text-[#ba1a1a]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {composerNotice && (
          <p className="mt-2 rounded-2xl bg-[#004d27]/10 px-3 py-2 text-sm font-semibold text-[#004d27] ring-1 ring-[#bec9be]">
            {composerNotice}
          </p>
        )}

        {documentStatus === "error" && documentError && (
          <p className="mt-2 rounded-2xl bg-[#ffdad6] px-3 py-2 text-sm font-semibold text-[#93000a] ring-1 ring-[#ffdad6]">
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
      <div className="absolute bottom-full left-0 z-20 mb-3 w-72 overflow-hidden rounded-3xl bg-white p-2 text-sm shadow-2xlring-1 ring-[#bec9be]">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 font-bold text-[#191c1d] transition hover:bg-[#edeeef]">
          <Icon name="book" className="h-5 w-5 text-[#004d27]" />
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
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[#6f7a70]">
            <Icon name="edit" className="h-4 w-4 text-[#004d27]" />
            Recent files
          </div>
          {recentAttachments.length ? (
            <div className="space-y-1">
              {recentAttachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => reuseRecentAttachment(attachment)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-[#191c1d] transition hover:bg-[#edeeef]"
                >
                  <Icon
                    name={attachment.kind === "image" ? "idea" : "book"}
                    className="h-4 w-4 shrink-0 text-[#004d27]"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {attachment.fileName}
                  </span>
                  <span className="text-xs text-[#6f7a70]">
                    {attachment.fileType}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold text-[#6f7a70]">
              Belum ada file terbaru.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            showComposerNotice("Create image masih Coming soon sampai provider image generation dikonfigurasi.")
          }
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#191c1d] transition hover:bg-[#edeeef]"
        >
          <Icon name="idea" className="h-5 w-5 text-[#004d27]" />
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
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#191c1d] transition hover:bg-[#edeeef]"
          >
            <Icon name="lock" className="h-5 w-5 text-[#004d27]" />
            Knowledge source upload
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsStudyModeMenuOpen(true);
            setIsAttachMenuOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#191c1d] transition hover:bg-[#edeeef]"
        >
          <Icon name="cap" className="h-5 w-5 text-[#004d27]" />
          Study mode
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            setIsAttachMenuOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-[#191c1d] transition hover:bg-[#edeeef]"
        >
          <Icon name="settings" className="h-5 w-5 text-[#004d27]" />
          Settings
        </button>
      </div>
    );
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      <IconRail
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
      />

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <TopBar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeConversation={activeConversation}
          selectedSkill={selectedSkill}
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

        <MobileToolbar
          chatSearch={chatSearch}
          setChatSearch={setChatSearch}
          selectedWorkspaceId={selectedWorkspaceId}
          setSelectedWorkspaceId={setSelectedWorkspaceId}
          workspaces={workspaces}
          resetMemory={resetMemory}
          visibleConversations={visibleConversations}
          activeConversationId={activeConversationId}
          loadConversation={loadConversation}
          activeConversation={activeConversation}
          toggleConversationPin={toggleConversationPin}
          exportActiveChatMarkdown={exportActiveChatMarkdown}
          openSharePreview={openSharePreview}
          setIsAttachMenuOpen={setIsAttachMenuOpen}
          renderAttachMenu={renderAttachMenu}
          renderAttachmentChips={renderAttachmentChips}
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
              continueAnswer={continueAnswer}
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
              isModelMenuOpen={isModelMenuOpen}
              modelOptions={modelOptions}
              selectedModelInfo={selectedModelInfo}
              skills={skills}
              skillsLoading={skillsLoading}
              selectedSkillId={selectedSkillId}
              selectSkill={selectSkill}
              setSelectedSkillId={setSelectedSkillId}
              usageSnapshot={usageSnapshot}
              isStudyModeMenuOpen={isStudyModeMenuOpen}
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
                isModelMenuOpen={isModelMenuOpen}
                modelOptions={modelOptions}
                selectedModelInfo={selectedModelInfo}
                skills={skills}
                skillsLoading={skillsLoading}
                selectedSkillId={selectedSkillId}
                selectSkill={selectSkill}
                setSelectedSkillId={setSelectedSkillId}
                usageSnapshot={usageSnapshot}
                isStudyModeMenuOpen={isStudyModeMenuOpen}
              />
            )}
          </>
        ) : activeTool === "docs" ? (
          <DocsPanel
            workspaceId={activeConversation?.workspaceId ?? selectedWorkspaceId}
            activeConversationId={activeConversationId || null}
            activeConversationTitle={activeConversation?.title}
          />
        ) : (
          <ToolPlaceholder tool={activeTool} />
        )}
      </section>

      <KnowledgeSidebar
        knowledgeSources={knowledgeSources}
        isLoadingKnowledge={isLoadingKnowledge}
        openSettings={openSettings}
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

"use client";

import {
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { Conversation, SettingsTab } from "@/lib/mappers/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { UserMemory } from "@/lib/memory/user-memory";

export function useSettingsPanel(
  learningProfile: UserMemory,
  setProfileDraft: Dispatch<SetStateAction<UserMemory>>,
  setFavoriteSubjectsDraft: Dispatch<SetStateAction<string>>,
  setProfileError: Dispatch<SetStateAction<string>>,
  setProfileSavedMessage: Dispatch<SetStateAction<string>>,
  setKnowledgeMessage: Dispatch<SetStateAction<string>>,
  setKnowledgeError: Dispatch<SetStateAction<string>>,
  hasLoadedKnowledgeRef: MutableRefObject<boolean>,
  isLoadingKnowledge: boolean,
  loadKnowledge: () => Promise<void>,
  setConversations: Dispatch<SetStateAction<Conversation[]>>,
  resetMemory: () => void,
  exportActiveChatMarkdown: () => void,
) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<SettingsTab>("general");
  const [settingsDataMessage, setSettingsDataMessage] = useState("");

  useEffect(() => {
    if (
      isSettingsOpen &&
      activeSettingsTab === "knowledge" &&
      !hasLoadedKnowledgeRef.current &&
      !isLoadingKnowledge
    ) {
      void loadKnowledge();
    }
  }, [
    activeSettingsTab,
    hasLoadedKnowledgeRef,
    isLoadingKnowledge,
    isSettingsOpen,
    loadKnowledge,
  ]);

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

  async function deleteAllChatHistory() {
    setSettingsDataMessage("");

    const supabase = createSupabaseBrowserClient();
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

  return {
    isSettingsOpen,
    setIsSettingsOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    settingsDataMessage,
    openSettings,
    openLearningProfile,
    deleteAllChatHistory,
    exportChatHistoryPlaceholder,
  };
}

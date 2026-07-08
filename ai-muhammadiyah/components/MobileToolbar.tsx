"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Conversation, Workspace } from "@/lib/mappers/types";

interface MobileToolbarProps {
  chatSearch: string;
  setChatSearch: Dispatch<SetStateAction<string>>;
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>;
  workspaces: Workspace[];
  resetMemory: () => void;
  visibleConversations: Conversation[];
  activeConversationId: string;
  loadConversation: (conversation: Conversation) => Promise<void>;
  activeConversation: Conversation | undefined;
  toggleConversationPin: (conversation: Conversation) => Promise<void>;
  exportActiveChatMarkdown: () => void;
  openSharePreview: () => void;
  setIsAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  renderAttachMenu: () => ReactNode;
  renderAttachmentChips: (extraClassName?: string) => ReactNode;
}

export default function MobileToolbar({
  chatSearch,
  setChatSearch,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
  workspaces,
  resetMemory,
  visibleConversations,
  activeConversationId,
  loadConversation,
  activeConversation,
  toggleConversationPin,
  exportActiveChatMarkdown,
  openSharePreview,
  setIsAttachMenuOpen,
  renderAttachMenu,
  renderAttachmentChips,
}: MobileToolbarProps) {
  return (
    <div className="border-b border-[#bec9be] px-4 py-3 md:hidden">
      <div className="mb-3 grid gap-2">
        <input
          value={chatSearch}
          onChange={(event) => setChatSearch(event.target.value)}
          placeholder="Cari chat"
          className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-[#191c1d] outline-none ring-1 ring-[#bec9be] placeholder:text-[#6f7a70] focus:ring-[#004d27]"
        />
        <select
          value={selectedWorkspaceId}
          onChange={(event) => setSelectedWorkspaceId(event.target.value)}
          className="h-11 rounded-full bg-white px-4 text-sm font-bold text-[#191c1d] outline-none ring-1 ring-[#bec9be]"
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
          className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#191c1d] shadow-sm ring-1 ring-[#bec9be]"
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
                ? "max-w-[220px] shrink-0 truncate rounded-full bg-[#004d27] px-4 py-2 text-sm font-bold text-white"
                : "max-w-[220px] shrink-0 truncate rounded-full bg-white px-4 py-2 text-sm font-bold text-[#191c1d] ring-1 ring-[#bec9be]"
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
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#191c1d] ring-1 ring-[#bec9be]"
          >
            {activeConversation.isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            onClick={exportActiveChatMarkdown}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#191c1d] ring-1 ring-[#bec9be]"
          >
            Export
          </button>
          <button
            type="button"
            onClick={openSharePreview}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#191c1d] ring-1 ring-[#bec9be]"
          >
            Share
          </button>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#191c1d] shadow-sm ring-1 ring-[#bec9be] transition hover:bg-[#edeeef]"
        >
          <span className="text-xl text-[#004d27]">+</span>
          Add photos & files
        </button>
        {renderAttachMenu()}
      </div>

      {renderAttachmentChips("mt-2")}
    </div>
  );
}

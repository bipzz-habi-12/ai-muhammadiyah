"use client";

import Link from "next/link";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import type { Conversation, Workspace } from "@/lib/mappers/types";

// Static "Internal Links" — no backend data source exists for these; hrefs are
// hardcoded to official Muhammadiyah domains (reported to the user).
const internalLinks: { label: string; href: string; icon: string }[] = [
  { label: "Muhammadiyah.or.id", href: "https://muhammadiyah.or.id", icon: "globe" },
  {
    label: "Majelis Dikti Litbang",
    href: "https://diktilitbang.muhammadiyah.or.id",
    icon: "cap",
  },
  { label: "Majelis Tarjih", href: "https://tarjih.or.id", icon: "book" },
];

interface SidebarProps {
  chatSearch: string;
  setChatSearch: Dispatch<SetStateAction<string>>;
  isLoadingConversations: boolean;
  historyError: string;
  conversationGroups: ReturnType<typeof groupConversationsByWorkspace>;
  activeConversationId: string;
  loadConversation: (conversation: Conversation) => Promise<void>;
  resetMemory: () => void;
  onOpenWorkspaceModal: () => void;

  // conversation item actions (kebab menu)
  workspaces: Workspace[];
  renamingConversationId: string;
  setRenamingConversationId: Dispatch<SetStateAction<string>>;
  renameValue: string;
  setRenameValue: Dispatch<SetStateAction<string>>;
  renameConversation: (conversationId: string) => Promise<void>;
  toggleConversationPin: (conversation: Conversation) => Promise<void>;
  deleteConversation: (
    conversationId: string,
    resetMemory?: () => void,
  ) => Promise<void>;
  updateConversationWorkspace: (
    conversationId: string,
    workspaceId: string,
  ) => Promise<void>;
}

export default function Sidebar({
  chatSearch,
  setChatSearch,
  isLoadingConversations,
  historyError,
  conversationGroups,
  activeConversationId,
  loadConversation,
  resetMemory,
  onOpenWorkspaceModal,
  workspaces,
  renamingConversationId,
  setRenamingConversationId,
  renameValue,
  setRenameValue,
  renameConversation,
  toggleConversationPin,
  deleteConversation,
  updateConversationWorkspace,
}: SidebarProps) {
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [moveSubmenuOpen, setMoveSubmenuOpen] = useState(false);

  const workspaceOptions: { id: string; name: string }[] = [
    { id: "", name: "General" },
    ...workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
    })),
  ];

  function openKebab(conversationId: string) {
    setOpenKebabId((current) =>
      current === conversationId ? null : conversationId,
    );
    setMoveSubmenuOpen(false);
  }

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#004d27]/10 bg-[#006837] text-white md:flex">
      <div className="flex flex-col gap-3 p-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </span>
          <input
            value={chatSearch}
            onChange={(event) => setChatSearch(event.target.value)}
            placeholder="Cari obrolan..."
            className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-8 pr-2 text-sm text-white placeholder-white/50 outline-none transition focus:border-[#fdc003]"
          />
        </div>

        <button
          type="button"
          onClick={resetMemory}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#004d27] transition hover:bg-white/90"
        >
          <span className="text-lg leading-none">+</span>
          Obrolan baru
        </button>

        <button
          type="button"
          onClick={onOpenWorkspaceModal}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          <span className="text-lg leading-none">+</span>
          Workspace baru
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoadingConversations && (
          <p className="px-2 text-sm font-semibold text-white/70">
            Memuat riwayat...
          </p>
        )}

        {historyError && (
          <p className="mb-4 rounded-lg bg-[#ba1a1a]/20 p-3 text-sm font-semibold text-white ring-1 ring-[#ba1a1a]/40">
            {historyError}
          </p>
        )}

        {!isLoadingConversations && conversationGroups.length === 0 && (
          <p className="px-2 text-sm font-semibold text-white/70">
            Belum ada riwayat obrolan.
          </p>
        )}

        {conversationGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <h2 className="px-2 pb-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              {group.label}
            </h2>

            <div className="space-y-1">
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const isRenaming =
                  renamingConversationId === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    className={
                      isActive
                        ? "group relative rounded-lg border-l-4 border-[#fdc003] bg-black/20"
                        : "group relative rounded-lg transition hover:bg-white/5"
                    }
                  >
                    {isRenaming ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          renameConversation(conversation.id);
                        }}
                        className="flex items-center gap-1 p-2"
                      >
                        <input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          autoFocus
                          className="min-w-0 flex-1 rounded-md border border-white/30 bg-white/10 px-2 py-1 text-sm font-semibold text-white outline-none"
                        />
                        <button
                          type="submit"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#006837]"
                          aria-label="Simpan nama"
                          title="Simpan nama"
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingConversationId("")}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10"
                          aria-label="Batal"
                          title="Batal"
                        >
                          <Icon name="close" className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1 p-2">
                        <button
                          type="button"
                          onClick={() => loadConversation(conversation)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Icon
                            name="chat"
                            className={
                              isActive
                                ? "h-5 w-5 shrink-0 text-white"
                                : "h-5 w-5 shrink-0 text-white/70"
                            }
                          />
                          <span className="flex min-w-0 flex-col">
                            <span
                              className={
                                isActive
                                  ? "truncate text-sm font-bold text-white"
                                  : "truncate text-sm text-white/90"
                              }
                            >
                              {conversation.title}
                            </span>
                            <span
                              className={
                                isActive
                                  ? "text-[10px] font-semibold uppercase tracking-tighter text-white/60"
                                  : "text-[10px] text-white/50"
                              }
                            >
                              {isActive
                                ? "Aktif • Baru saja"
                                : formatRelativeTime(conversation.updatedAt)}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openKebab(conversation.id)}
                          className={
                            openKebabId === conversation.id
                              ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-white"
                              : "grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/70 opacity-0 transition hover:bg-white/10 focus:opacity-100 group-hover:opacity-100"
                          }
                          aria-label="Opsi obrolan"
                          aria-expanded={openKebabId === conversation.id}
                        >
                          <Icon name="dots" className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {openKebabId === conversation.id && !isRenaming && (
                      <div className="absolute right-2 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl bg-white p-1 text-sm text-[#191c1d] shadow-2xl ring-1 ring-[#bec9be]">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingConversationId(conversation.id);
                            setRenameValue(conversation.title);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#f3f4f5]"
                        >
                          <Icon name="edit" className="h-4 w-4 text-[#004d27]" />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleConversationPin(conversation);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#f3f4f5]"
                        >
                          <Icon name="pin" className="h-4 w-4 text-[#004d27]" />
                          {conversation.isPinned ? "Lepas pin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveSubmenuOpen((open) => !open)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#f3f4f5]"
                          aria-expanded={moveSubmenuOpen}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              name="book"
                              className="h-4 w-4 text-[#004d27]"
                            />
                            Pindah ke workspace
                          </span>
                          <span className="text-xs text-[#6f7a70]">⌄</span>
                        </button>
                        {moveSubmenuOpen && (
                          <div className="mb-1 mt-1 max-h-44 overflow-auto border-t border-[#bec9be] pt-1">
                            {workspaceOptions.map((option) => {
                              const isCurrent =
                                (conversation.workspaceId ?? "") === option.id;

                              return (
                                <button
                                  key={option.id || "general"}
                                  type="button"
                                  onClick={() => {
                                    updateConversationWorkspace(
                                      conversation.id,
                                      option.id,
                                    );
                                    setOpenKebabId(null);
                                    setMoveSubmenuOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-[#f3f4f5]"
                                >
                                  <span className="truncate">{option.name}</span>
                                  {isCurrent && (
                                    <Icon
                                      name="check"
                                      className="h-3.5 w-3.5 shrink-0 text-[#004d27]"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="my-1 border-t border-[#bec9be]" />
                        <button
                          type="button"
                          onClick={() => {
                            deleteConversation(conversation.id, resetMemory);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6]"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="px-2 pt-4">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Internal Links
          </h3>
          <div className="space-y-1">
            {internalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg p-2 text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <Icon name={link.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      <Link
        href="/hub"
        className="mt-auto flex items-center gap-2 border-t border-white/10 bg-black/10 p-4 transition hover:bg-black/20"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#fdc003] text-[#6c5000]">
          <Icon name="star" className="h-3.5 w-3.5" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
          Muhammadiyah Hub
        </span>
      </Link>
    </aside>
  );
}

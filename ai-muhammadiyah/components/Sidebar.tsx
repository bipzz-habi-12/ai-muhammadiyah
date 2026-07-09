"use client";

import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { Icon } from "@/components/icons";
import type { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import type { Conversation, SettingsTab, Workspace } from "@/lib/mappers/types";
import type { UsageSnapshot } from "@/lib/usage/limits";

interface SidebarProps {
  // workspace switcher + create
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string>>;
  newWorkspaceName: string;
  setNewWorkspaceName: Dispatch<SetStateAction<string>>;
  isCreatingWorkspace: boolean;
  createWorkspace: () => Promise<void>;

  // search + conversation list
  chatSearch: string;
  setChatSearch: Dispatch<SetStateAction<string>>;
  isLoadingConversations: boolean;
  historyError: string;
  conversationGroups: ReturnType<typeof groupConversationsByWorkspace>;
  activeConversationId: string;
  renamingConversationId: string;
  setRenamingConversationId: Dispatch<SetStateAction<string>>;
  renameValue: string;
  setRenameValue: Dispatch<SetStateAction<string>>;
  loadConversation: (conversation: Conversation) => Promise<void>;
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

  // new chat
  resetMemory: () => void;

  // account menu (shared open-state with TopBar's duplicate popover)
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: Dispatch<SetStateAction<boolean>>;
  currentTierLabel: string;
  usageSnapshot: UsageSnapshot | null;
  usageError: string;
  openLearningProfile: () => void;
  openSettings: (tab?: SettingsTab) => void;
  profileLabel: string;
  handleLogout: () => Promise<void>;
  isLoggingOut: boolean;
  userInitials: string;
  userEmail: string;
}

export default function Sidebar({
  workspaces,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
  newWorkspaceName,
  setNewWorkspaceName,
  isCreatingWorkspace,
  createWorkspace,
  chatSearch,
  setChatSearch,
  isLoadingConversations,
  historyError,
  conversationGroups,
  activeConversationId,
  renamingConversationId,
  setRenamingConversationId,
  renameValue,
  setRenameValue,
  loadConversation,
  renameConversation,
  toggleConversationPin,
  deleteConversation,
  updateConversationWorkspace,
  resetMemory,
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  currentTierLabel,
  usageSnapshot,
  usageError,
  openLearningProfile,
  openSettings,
  profileLabel,
  handleLogout,
  isLoggingOut,
  userInitials,
  userEmail,
}: SidebarProps) {
  const router = useRouter();

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-[#00522a] bg-[#006837] text-white md:flex md:flex-col">
      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={resetMemory}
          className="flex h-[62px] w-full items-center gap-4 rounded-[28px] bg-white px-6 text-left text-lg font-bold text-[#191c1d] shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
        >
          <span className="text-3xl font-light text-[#004d27]">+</span>
          Obrolan baru
        </button>
        <label className="mt-3 block">
          <span className="sr-only">Workspace untuk obrolan baru</span>
          <select
            value={selectedWorkspaceId}
            onChange={(event) => setSelectedWorkspaceId(event.target.value)}
            className="h-11 w-full rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white outline-none transition focus:border-white/40"
          >
            <option className="text-[#191c1d]" value="">
              General workspace
            </option>
            {workspaces.map((workspace) => (
              <option
                className="text-[#191c1d]"
                key={workspace.id}
                value={workspace.id}
              >
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
            className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white placeholder-white/50 outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#006837] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/40"
            aria-label="Buat workspace"
            title="Buat workspace"
          >
            <span className="text-xl leading-none">+</span>
          </button>
        </form>
      </div>

      <div className="mt-6 flex items-center gap-3 px-6 text-white/70">
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
          className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/50"
        />
      </div>

      <nav className="mt-9 flex-1 overflow-y-auto px-5 pb-6">
        {isLoadingConversations && (
          <p className="text-sm font-semibold text-white/70">
            Memuat riwayat...
          </p>
        )}

        {historyError && (
          <p className="mb-4 rounded-2xl bg-[#ba1a1a]/20 p-3 text-sm font-semibold text-white ring-1 ring-[#ba1a1a]/40">
            {historyError}
          </p>
        )}

        {!isLoadingConversations && conversationGroups.length === 0 && (
          <p className="text-sm font-semibold text-white/70">
            Belum ada riwayat obrolan.
          </p>
        )}

        {conversationGroups.map((group) => (
          <div key={group.label} className="mb-8">
            <h2 className="mb-5 flex items-center justify-between text-sm font-bold uppercase tracking-widest text-white/40">
              <span>{group.label}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white">
                {group.items.length}
              </span>
            </h2>

            <div className="space-y-3">
              {group.items.map((conversation) => (
                <div
                  key={conversation.id}
                  className={
                    conversation.id === activeConversationId
                      ? "rounded-lg border-l-4 border-[#fdc003] bg-black/20 p-2"
                      : "rounded-2xl p-2 transition hover:bg-white/5"
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
                        className="min-w-0 flex-1 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none"
                      />
                      <button
                        type="submit"
                        className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#006837]"
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
                        className="flex min-w-0 flex-1 items-center gap-3 text-left text-base text-white/90 transition hover:text-white"
                      >
                        <Icon
                          name="chat"
                          className="h-5 w-5 shrink-0 text-white/70"
                        />
                        <span className="truncate">{conversation.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleConversationPin(conversation)}
                        className={
                          conversation.isPinned
                            ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-white"
                            : "grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10"
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
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10"
                        aria-label="Ubah nama obrolan"
                        title="Ubah nama obrolan"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteConversation(conversation.id, resetMemory)
                        }
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-red-300 transition hover:bg-red-500/10"
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
                        className="h-9 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white/80 outline-none focus:border-white/40"
                      >
                        <option className="text-[#191c1d]" value="">
                          General
                        </option>
                        {workspaces.map((workspace) => (
                          <option
                            className="text-[#191c1d]"
                            key={workspace.id}
                            value={workspace.id}
                          >
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

      <div className="relative border-t border-white/10 px-5 py-4">
        {isAccountMenuOpen && (
          <div className="absolute bottom-[86px] left-5 right-5 z-40 overflow-hidden rounded-[22px] bg-white p-2 text-sm text-[#191c1d] shadow-2xl ring-1 ring-[#bec9be]">
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                router.push("/plans");
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
            >
              <span>
                <span className="block font-bold text-[#191c1d]">
                  Upgrade plan
                </span>
                <span className="text-xs font-semibold text-[#3f4940]">
                  {currentTierLabel}
                </span>
              </span>
              <span className="rounded-full bg-[#004d27]/10 px-2 py-1 text-xs font-bold text-[#004d27]">
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
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
            >
              <Icon name="user" className="h-5 w-5 text-[#004d27]" />
              <span>
                <span className="block font-bold text-[#191c1d]">
                  Learning Profile
                </span>
                <span className="text-xs font-semibold text-[#3f4940]">
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
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
            >
              <Icon name="book" className="h-5 w-5 text-[#004d27]" />
              <span className="font-bold text-[#191c1d]">Usage / quota</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                openSettings("general");
              }}
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
            >
              <Icon name="settings" className="h-5 w-5 text-[#004d27]" />
              <span className="font-bold text-[#191c1d]">Settings</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="lock" className="h-5 w-5" />
              {isLoggingOut ? "Keluar..." : "Logout"}
            </button>
            {usageError && (
              <p className="px-3 py-2 text-xs font-semibold text-[#ba1a1a]">
                {usageError}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          className="flex w-full items-center gap-3 rounded-[22px] bg-white/10 p-3 text-left transition hover:bg-white/15"
          aria-expanded={isAccountMenuOpen}
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fdc003] text-base font-bold text-[#6c5000]">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-white">
              Akun Anggota
            </p>
            <p className="truncate text-xs text-white/70">
              {userEmail || "Memuat akun..."}
            </p>
          </div>
          <span className="rounded-full bg-[#fdc003] px-2 py-1 text-xs font-bold text-[#6c5000]">
            {currentTierLabel}
          </span>
        </button>
      </div>
    </aside>
  );
}

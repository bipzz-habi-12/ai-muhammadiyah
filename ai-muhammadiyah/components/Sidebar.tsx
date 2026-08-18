"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon, SparkIcon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import type { Conversation, SettingsTab, Workspace } from "@/lib/mappers/types";
import { getTightestWindow, type UsageSnapshot } from "@/lib/usage/limits";

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

// Section nav — dipindahkan dari IconRail lama supaya halaman chat hanya punya
// SATU sidebar kiri (nav + riwayat + akun), seperti Claude/ChatGPT.
const navItems: { label: string; href: string; glyph: React.ReactNode }[] = [
  {
    label: "Workspaces",
    href: "/workspace",
    glyph: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="6.5" rx="1.6" />
        <rect x="3" y="13.5" width="18" height="6.5" rx="1.6" />
      </svg>
    ),
  },
  {
    label: "Work",
    href: "/work",
    glyph: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2.5" y="7" width="19" height="13" rx="2" />
        <path d="M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6A1.7 1.7 0 0 1 15.5 5.2V7" />
        <path d="M2.5 12.5h19" />
      </svg>
    ),
  },
  {
    label: "Research",
    href: "/research",
    glyph: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <line x1="15.5" y1="15.5" x2="21" y2="21" />
      </svg>
    ),
  },
  {
    label: "Library",
    href: "/library",
    glyph: <Icon name="library" className="h-[18px] w-[18px]" />,
  },
  {
    label: "Muhammadiyah Hub",
    href: "/hub",
    glyph: <Icon name="globe" className="h-[18px] w-[18px]" />,
  },
  {
    label: "Riwayat",
    href: "/history",
    glyph: <Icon name="history" className="h-[18px] w-[18px]" />,
  },
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

  // account menu — dipindahkan dari IconRail lama; open-state tetap dibagi
  // dengan popover mobile di TopBar.
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
  const pathname = usePathname();
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [moveSubmenuOpen, setMoveSubmenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  // Dipakai dua state (expanded & collapsed): popover akun.
  function renderAccountMenu(anchor: string) {
    if (!isAccountMenuOpen) return null;

    return (
      <div
        className={`${anchor} absolute z-50 w-[260px] overflow-hidden rounded-[22px] bg-[var(--pure-white)] p-2 text-sm text-[var(--ink)] shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10`}
      >
        <button
          type="button"
          onClick={() => {
            setIsAccountMenuOpen(false);
            router.push("/plans");
          }}
          className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <span>
            <span className="block font-bold text-[var(--ink)]">
              Upgrade plan
            </span>
            <span className="text-xs font-semibold text-[var(--muted-2)]">
              {currentTierLabel}
            </span>
          </span>
          <span className="rounded-full bg-[var(--brand)]/10 px-2 py-1 text-xs font-bold text-[var(--brand)]">
            {usageSnapshot
              ? `${getTightestWindow(usageSnapshot.tokens).window.percentRemaining}%`
              : "--"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAccountMenuOpen(false);
            openLearningProfile();
          }}
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <Icon name="user" className="h-5 w-5 text-[var(--brand)]" />
          <span>
            <span className="block font-bold text-[var(--ink)]">
              Learning Profile
            </span>
            <span className="text-xs font-semibold text-[var(--muted-2)]">
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
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <Icon name="book" className="h-5 w-5 text-[var(--brand)]" />
          <span className="font-bold text-[var(--ink)]">Usage / quota</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAccountMenuOpen(false);
            openSettings("general");
          }}
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <Icon name="settings" className="h-5 w-5 text-[var(--brand)]" />
          <span className="font-bold text-[var(--ink)]">Settings</span>
        </button>
        <div className="my-1 border-t border-[var(--brand-deep-line)]/10" />
        <div className="px-3 py-2">
          <p className="truncate text-xs font-semibold text-[var(--muted-2)]">
            {userEmail || "Memuat akun..."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left font-bold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="lock" className="h-5 w-5" />
          {isLoggingOut ? "Keluar..." : "Logout"}
        </button>
        {usageError && (
          <p className="px-3 py-2 text-xs font-semibold text-[var(--danger)]">
            {usageError}
          </p>
        )}
      </div>
    );
  }

  // Rail ciut — hanya ikon, tapi tetap SATU sidebar (nav + obrolan baru + akun).
  if (collapsed) {
    return (
      <aside className="relative hidden w-[64px] shrink-0 flex-col items-center border-r border-[var(--brand)]/10 bg-[var(--brand-deep)] py-4 text-white md:flex">
        <Link
          href="/"
          aria-label="Beranda"
          className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--gold)] text-[var(--brand-deep)]"
        >
          <SparkIcon className="h-6 w-6" />
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Lebarkan sidebar"
          aria-label="Lebarkan sidebar"
          className="mt-4 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-lg leading-none text-white transition hover:bg-white/15"
        >
          ›
        </button>

        <button
          type="button"
          onClick={resetMemory}
          title="Obrolan baru"
          aria-label="Obrolan baru"
          className="mt-3 grid h-9 w-9 place-items-center rounded-lg bg-white text-xl leading-none text-[var(--brand)] transition hover:bg-white/90"
        >
          +
        </button>

        <nav className="mt-4 flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-white"
                    : "grid h-9 w-9 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                }
              >
                {item.glyph}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => openSettings("general")}
            title="Settings"
            aria-label="Settings"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="settings" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            aria-label="Menu akun"
            aria-expanded={isAccountMenuOpen}
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gold)] text-xs font-bold text-[var(--gold-ink-2)] transition hover:bg-[var(--c-e0bd6a)]"
          >
            {userInitials}
          </button>
        </div>

        {renderAccountMenu("bottom-4 left-[66px]")}
      </aside>
    );
  }

  return (
    <aside className="relative hidden w-[272px] shrink-0 flex-col border-r border-[var(--brand)]/10 bg-[var(--brand-deep)] text-white md:flex">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Beranda"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--gold)] text-[var(--brand-deep)]"
          >
            <SparkIcon className="h-5 w-5" />
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-white">
            M-Agent
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Ciutkan sidebar"
            aria-label="Ciutkan sidebar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-base leading-none text-white/70 transition hover:bg-white/10"
          >
            ‹
          </button>
        </div>

        <button
          type="button"
          onClick={resetMemory}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-[var(--brand)] transition hover:bg-white/90"
        >
          <span className="text-lg leading-none">+</span>
          Obrolan baru
        </button>

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
            className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-8 pr-2 text-sm text-white placeholder-white/50 outline-none transition focus:border-[var(--gold)]"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Nav antar-halaman — dulu rail ikon terpisah, sekarang menyatu di sini. */}
        <div className="space-y-0.5 pb-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "flex items-center gap-2.5 rounded-lg bg-white/15 px-2 py-2 text-sm font-semibold text-white"
                    : "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
                }
              >
                <span className="shrink-0">{item.glyph}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onOpenWorkspaceModal}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center text-lg leading-none">
              +
            </span>
            <span className="truncate">Workspace baru</span>
          </button>
        </div>

        <div className="mb-2 border-t border-white/10" />

        {isLoadingConversations && (
          <p className="px-2 text-sm font-semibold text-white/70">
            Memuat riwayat...
          </p>
        )}

        {historyError && (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/20 p-3 text-sm font-semibold text-white ring-1 ring-[var(--danger)]/40">
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
                        ? "group relative rounded-lg border-l-4 border-[var(--gold)] bg-black/20"
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
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[var(--brand-hover-text)]"
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
                      <div className="absolute right-2 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl bg-[var(--pure-white)] p-1 text-sm text-[var(--ink)] shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingConversationId(conversation.id);
                            setRenameValue(conversation.title);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-alt)]"
                        >
                          <Icon name="edit" className="h-4 w-4 text-[var(--brand)]" />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleConversationPin(conversation);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-alt)]"
                        >
                          <Icon name="pin" className="h-4 w-4 text-[var(--brand)]" />
                          {conversation.isPinned ? "Lepas pin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveSubmenuOpen((open) => !open)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-alt)]"
                          aria-expanded={moveSubmenuOpen}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              name="book"
                              className="h-4 w-4 text-[var(--brand)]"
                            />
                            Pindah ke workspace
                          </span>
                          <span className="text-xs text-[var(--muted-3)]">⌄</span>
                        </button>
                        {moveSubmenuOpen && (
                          <div className="mb-1 mt-1 max-h-44 overflow-auto border-t border-[var(--brand-deep-line)]/10 pt-1">
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
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-[var(--surface-alt)]"
                                >
                                  <span className="truncate">{option.name}</span>
                                  {isCurrent && (
                                    <Icon
                                      name="check"
                                      className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="my-1 border-t border-[var(--brand-deep-line)]/10" />
                        <button
                          type="button"
                          onClick={() => {
                            deleteConversation(conversation.id, resetMemory);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-bold text-[var(--danger)] transition hover:bg-[var(--danger-bg)]"
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

      {/* Footer akun — dulu di kaki rail ikon. */}
      <div className="mt-auto border-t border-white/10 bg-black/10 p-2">
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Menu akun"
          aria-expanded={isAccountMenuOpen}
          className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-white/10"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--gold)] text-xs font-bold text-[var(--gold-ink-2)]">
            {userInitials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-white">
              {userEmail || "Memuat akun..."}
            </span>
            <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-white/50">
              {currentTierLabel}
            </span>
          </span>
          <span className="shrink-0 text-white/50">
            <Icon name="dots" className="h-4 w-4" />
          </span>
        </button>
      </div>

      {renderAccountMenu("bottom-[68px] left-2")}
    </aside>
  );
}

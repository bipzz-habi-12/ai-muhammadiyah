"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon, SparkIcon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { groupConversationsByWorkspace } from "@/lib/mappers/conversation";
import type { Conversation, SettingsTab, Workspace } from "@/lib/mappers/types";
import { getTightestWindow, type UsageSnapshot } from "@/lib/usage/limits";

// Section nav — halaman chat hanya punya SATU sidebar kiri (nav + riwayat +
// akun), seperti Claude/ChatGPT.
//
// Design premium (Langkah 53): panelnya tidak lagi hijau tua penuh. Hijau
// dipakai HANYA untuk yang bisa diklik (tombol Obrolan baru, item aktif),
// supaya ia terbaca sebagai aksen — bukan sebagai latar. Daftar "Internal
// Links" dicabut dari sini: tiga tautan yang mengirim orang keluar produk tidak
// layak menempati permukaan paling mahal di aplikasi.
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
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="6.5" rx="1.6" />
        <rect x="3" y="13.5" width="18" height="6.5" rx="1.6" />
      </svg>
    ),
  },
  {
    label: "Library",
    href: "/library",
    glyph: <Icon name="library" className="h-[18px] w-[18px]" />,
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
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <line x1="15.5" y1="15.5" x2="21" y2="21" />
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
        strokeWidth="1.8"
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

  // account menu — open-state tetap dibagi dengan popover mobile di TopBar.
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
        className={`${anchor} absolute z-50 w-[264px] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 text-sm text-[var(--ink)] shadow-xl`}
      >
        <button
          type="button"
          onClick={() => {
            setIsAccountMenuOpen(false);
            router.push("/plans");
          }}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <span>
            <span className="block text-[14px] font-medium text-[var(--ink)]">
              Paket &amp; kuota
            </span>
            <span className="text-xs text-[var(--muted-2)]">
              {currentTierLabel}
            </span>
          </span>
          <span className="rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--brand)]">
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <Icon name="user" className="h-[18px] w-[18px] text-[var(--muted-2)]" />
          <span>
            <span className="block text-[14px] font-medium text-[var(--ink)]">
              Learning Profile
            </span>
            <span className="text-xs text-[var(--muted-2)]">{profileLabel}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAccountMenuOpen(false);
            openSettings("general");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <Icon
            name="settings"
            className="h-[18px] w-[18px] text-[var(--muted-2)]"
          />
          <span className="text-[14px] font-medium text-[var(--ink)]">
            Pengaturan
          </span>
        </button>
        <div className="my-1 border-t border-[var(--hairline)]" />
        <div className="px-3 py-1.5">
          <p className="truncate text-xs text-[var(--muted-2)]">
            {userEmail || "Memuat akun..."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="lock" className="h-[18px] w-[18px]" />
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
        {usageError && (
          <p className="px-3 py-2 text-xs text-[var(--danger)]">{usageError}</p>
        )}
      </div>
    );
  }

  // Rail ciut — hanya ikon, tapi tetap SATU sidebar (nav + obrolan baru + akun).
  if (collapsed) {
    return (
      <aside className="relative hidden w-[64px] shrink-0 flex-col items-center border-r border-[var(--hairline)] bg-[var(--surface-panel)] py-3.5 md:flex">
        <Link
          href="/"
          aria-label="Beranda"
          className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[var(--brand)] text-[var(--on-brand)]"
        >
          <SparkIcon className="h-[17px] w-[17px]" />
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Lebarkan sidebar"
          aria-label="Lebarkan sidebar"
          className="mt-4 grid h-9 w-9 place-items-center rounded-[10px] text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={resetMemory}
          title="Obrolan baru"
          aria-label="Obrolan baru"
          className="mt-2 grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[17px] w-[17px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>

        <nav className="mt-4 flex flex-col items-center gap-1">
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
                    ? "grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "grid h-9 w-9 place-items-center rounded-[10px] text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]"
                }
              >
                {item.glyph}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            aria-label="Menu akun"
            aria-expanded={isAccountMenuOpen}
            className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand)] transition hover:bg-[var(--surface-alt)]"
          >
            {userInitials}
          </button>
        </div>

        {renderAccountMenu("bottom-4 left-[66px]")}
      </aside>
    );
  }

  return (
    <aside className="relative hidden w-[264px] shrink-0 flex-col border-r border-[var(--hairline)] bg-[var(--surface-panel)] md:flex">
      <div className="flex flex-col gap-3 p-3.5 pb-0">
        <div className="flex h-10 items-center gap-2.5">
          <Link
            href="/"
            aria-label="Beranda"
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[var(--brand)] text-[var(--on-brand)]"
          >
            <SparkIcon className="h-[17px] w-[17px]" />
          </Link>
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-[var(--ink)]">
            M-Agent
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Ciutkan sidebar"
            aria-label="Ciutkan sidebar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[var(--muted-3)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-[17px] w-[17px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={resetMemory}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-[14.5px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[17px] w-[17px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Obrolan baru
        </button>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-3)]">
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
            placeholder="Cari obrolan"
            className="h-10 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] pl-9 pr-3 text-[13.5px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted-3)] focus:border-[var(--brand)]"
          />
        </div>
      </div>

      <nav className="scroll flex-1 overflow-y-auto px-2 pt-3.5">
        {/* Nav antar-halaman — dulu rail ikon terpisah, sekarang menyatu di sini. */}
        <div className="space-y-px pb-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "flex h-[38px] items-center gap-3 rounded-[10px] bg-[var(--brand-soft)] px-2.5 text-sm font-semibold text-[var(--brand)]"
                    : "flex h-[38px] items-center gap-3 rounded-[10px] px-2.5 text-sm text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]"
                }
              >
                <span
                  className={
                    isActive ? "shrink-0" : "shrink-0 text-[var(--muted-2)]"
                  }
                >
                  {item.glyph}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onOpenWorkspaceModal}
            className="flex h-[38px] w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-sm text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]"
          >
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center text-[var(--muted-2)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            <span className="truncate">Workspace baru</span>
          </button>
        </div>

        <div className="mb-3 border-t border-[var(--hairline)]" />

        {isLoadingConversations && (
          <p className="px-2.5 text-[13.5px] text-[var(--muted-2)]">
            Memuat riwayat...
          </p>
        )}

        {historyError && (
          <p className="mb-4 rounded-xl bg-[var(--danger-bg)] p-3 text-[13px] text-[var(--danger-ink)]">
            {historyError}
          </p>
        )}

        {!isLoadingConversations && conversationGroups.length === 0 && (
          <p className="px-2.5 text-[13.5px] text-[var(--muted-2)]">
            Belum ada riwayat obrolan.
          </p>
        )}

        {conversationGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <h2 className="px-2.5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
              {group.label}
            </h2>

            <div className="space-y-px">
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const isRenaming =
                  renamingConversationId === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    className={
                      isActive
                        ? "group relative rounded-[10px] bg-[var(--brand-soft)]"
                        : "group relative rounded-[10px] transition hover:bg-[var(--surface-alt)]"
                    }
                  >
                    {isRenaming ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          renameConversation(conversation.id);
                        }}
                        className="flex items-center gap-1 p-1.5"
                      >
                        <input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-2 py-1 text-[13.5px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                        />
                        <button
                          type="submit"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand)] text-[var(--on-brand)]"
                          aria-label="Simpan nama"
                          title="Simpan nama"
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingConversationId("")}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)]"
                          aria-label="Batal"
                          title="Batal"
                        >
                          <Icon name="close" className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1 pl-2.5 pr-1">
                        <button
                          type="button"
                          onClick={() => loadConversation(conversation)}
                          className="flex min-w-0 flex-1 flex-col items-start py-2 text-left"
                        >
                          <span
                            className={
                              isActive
                                ? "w-full truncate text-[13.5px] font-medium text-[var(--brand)]"
                                : "w-full truncate text-[13.5px] text-[var(--ink-soft)]"
                            }
                          >
                            {conversation.title}
                          </span>
                          <span className="w-full truncate text-[11px] text-[var(--muted-3)]">
                            {isActive
                              ? "Aktif"
                              : formatRelativeTime(conversation.updatedAt)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openKebab(conversation.id)}
                          className={
                            openKebabId === conversation.id
                              ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-alt)] text-[var(--ink)]"
                              : "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted-3)] opacity-0 transition hover:bg-[var(--surface-alt)] focus:opacity-100 group-hover:opacity-100"
                          }
                          aria-label="Opsi obrolan"
                          aria-expanded={openKebabId === conversation.id}
                        >
                          <Icon name="dots" className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {openKebabId === conversation.id && !isRenaming && (
                      <div className="absolute right-2 top-full z-30 mt-1 w-56 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 text-sm text-[var(--ink)] shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingConversationId(conversation.id);
                            setRenameValue(conversation.title);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition hover:bg-[var(--surface-alt)]"
                        >
                          <Icon
                            name="edit"
                            className="h-4 w-4 text-[var(--muted-2)]"
                          />
                          Ganti nama
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleConversationPin(conversation);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition hover:bg-[var(--surface-alt)]"
                        >
                          <Icon
                            name="pin"
                            className="h-4 w-4 text-[var(--muted-2)]"
                          />
                          {conversation.isPinned ? "Lepas pin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveSubmenuOpen((open) => !open)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition hover:bg-[var(--surface-alt)]"
                          aria-expanded={moveSubmenuOpen}
                        >
                          <span className="flex items-center gap-3">
                            <Icon
                              name="book"
                              className="h-4 w-4 text-[var(--muted-2)]"
                            />
                            Pindah ke workspace
                          </span>
                          <span className="text-xs text-[var(--muted-3)]">⌄</span>
                        </button>
                        {moveSubmenuOpen && (
                          <div className="mb-1 mt-1 max-h-44 overflow-auto border-t border-[var(--hairline)] pt-1">
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
                                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-[var(--surface-alt)]"
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
                        <div className="my-1 border-t border-[var(--hairline)]" />
                        <button
                          type="button"
                          onClick={() => {
                            deleteConversation(conversation.id, resetMemory);
                            setOpenKebabId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] text-[var(--danger)] transition hover:bg-[var(--danger-bg)]"
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
      </nav>

      {/* Footer akun. */}
      <div className="mt-auto border-t border-[var(--hairline)] p-2.5">
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Menu akun"
          aria-expanded={isAccountMenuOpen}
          className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand)]">
            {userInitials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium text-[var(--ink)]">
              {userEmail || "Memuat akun..."}
            </span>
            <span className="truncate text-[11px] text-[var(--muted-3)]">
              {currentTierLabel}
            </span>
          </span>
          <span className="shrink-0 text-[var(--muted-3)]">
            <Icon name="dots" className="h-4 w-4" />
          </span>
        </button>
      </div>

      {renderAccountMenu("bottom-[68px] left-2")}
    </aside>
  );
}

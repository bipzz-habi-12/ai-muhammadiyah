"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon } from "@/components/icons";
import type { ActiveTool, Conversation, SettingsTab } from "@/lib/mappers/types";
import type { Skill } from "@/lib/skills";

// Header chat — Design premium Langkah 53.
//
// Dulu satu-satunya tombol BERISI hijau di layar ini adalah "Share": aksi
// sekunder yang tampil paling menonjol, sementara aksi utama (kirim pesan)
// justru lebih lemah. Sekarang Bagikan turun jadi tombol bergaris di layar
// lebar dan masuk ke menu "⋮" di HP; satu-satunya tombol berisi hijau di
// halaman chat adalah tombol Kirim di composer.
//
// Popover akun versi mobile dicabut dari sini — akun, kuota, dan pengaturan
// kini punya rumah sendiri di tab "Lainnya" (/more), jadi header tidak lagi
// menumpuk dua peran.

interface TopBarProps {
  // tool tab switching
  activeTool: ActiveTool;
  setActiveTool: Dispatch<SetStateAction<ActiveTool>>;

  // conversation title + skill category badge
  activeConversation: Conversation | undefined;
  selectedSkill: Skill | null;

  // konteks workspace — menggantikan <select> di MobileToolbar lama
  activeWorkspaceName: string;
  onOpenWorkspaceModal: () => void;

  // conversation-scoped actions (reuse existing functions)
  exportActiveChatMarkdown: () => void;
  openSharePreview: () => void;
  toggleConversationPin: (conversation: Conversation) => Promise<void>;

  // pemicu sheet riwayat (mobile) + obrolan baru (mobile)
  onOpenHistory: () => void;
  resetMemory: () => void;

  // Modal Pengaturan (Skill saya, Knowledge Base, data) hanya hidup di halaman
  // chat. Di desktop pintunya ada di menu akun sidebar; di HP menu ⋮ ini
  // satu-satunya jalan masuk.
  openSettings: (tab?: SettingsTab) => void;

  // artifact panel toggle
  artifactCount: number;
  isArtifactPanelOpen: boolean;
  setIsArtifactPanelOpen: Dispatch<SetStateAction<boolean>>;
}

export default function TopBar({
  activeTool,
  setActiveTool,
  activeConversation,
  selectedSkill,
  activeWorkspaceName,
  onOpenWorkspaceModal,
  exportActiveChatMarkdown,
  openSharePreview,
  toggleConversationPin,
  onOpenHistory,
  resetMemory,
  openSettings,
  artifactCount,
  isArtifactPanelOpen,
  setIsArtifactPanelOpen,
}: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const skillLabel = selectedSkill?.slashCommand ?? selectedSkill?.name ?? "";

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-1 border-b border-[var(--hairline)] px-2 sm:px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenHistory}
        aria-label="Riwayat obrolan"
        title="Riwayat obrolan"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)] md:hidden"
      >
        <Icon name="history" className="h-[22px] w-[22px]" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <button
          type="button"
          onClick={() => setActiveTool("chat")}
          className="min-w-0 truncate text-left text-[15px] font-medium text-[var(--ink)]"
          title={activeConversation?.title ?? "Obrolan baru"}
        >
          {activeConversation?.title ?? "Obrolan baru"}
        </button>
        <button
          type="button"
          onClick={onOpenWorkspaceModal}
          className="min-w-0 truncate text-left text-[11.5px] text-[var(--muted-3)] transition hover:text-[var(--ink-soft)]"
          title="Ganti workspace"
        >
          {activeWorkspaceName}
          {skillLabel ? ` · ${skillLabel}` : ""}
        </button>
      </div>

      {artifactCount > 0 && activeTool === "chat" && (
        <button
          type="button"
          onClick={() => setIsArtifactPanelOpen((isOpen) => !isOpen)}
          aria-label="Panel artifact"
          title="Panel artifact"
          aria-expanded={isArtifactPanelOpen}
          // Visible on every breakpoint: the panel is a full-screen sheet
          // below lg, so this pill is the only way in on mobile.
          className={
            isArtifactPanelOpen
              ? "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 text-[12.5px] font-medium text-[var(--brand)]"
              : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3 text-[12.5px] font-medium text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)]"
          }
        >
          Artifact
          <span className="text-[11px] text-[var(--muted-3)]">
            {artifactCount}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={openSharePreview}
        className="ml-1 hidden h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--hairline)] px-3.5 text-[13.5px] font-medium text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)] sm:inline-flex"
      >
        <Icon name="share" className="h-4 w-4 text-[var(--muted-2)]" />
        Bagikan
      </button>

      <button
        type="button"
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        aria-label="Aksi lain"
        title="Aksi lain"
        aria-expanded={isMenuOpen}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)] md:h-9 md:w-9"
      >
        <Icon name="dots" className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        onClick={resetMemory}
        aria-label="Obrolan baru"
        title="Obrolan baru"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)] md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[22px] w-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>

      {isMenuOpen && (
        <div className="absolute right-2 top-[52px] z-40 w-[min(84vw,248px)] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 text-sm shadow-xl md:right-6">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              openSharePreview();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--ink)] transition hover:bg-[var(--surface-alt)] sm:hidden"
          >
            <Icon name="share" className="h-[18px] w-[18px] text-[var(--muted-2)]" />
            Bagikan
          </button>

          {activeConversation && (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  exportActiveChatMarkdown();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--ink)] transition hover:bg-[var(--surface-alt)]"
              >
                <Icon
                  name="download"
                  className="h-[18px] w-[18px] text-[var(--muted-2)]"
                />
                Export markdown
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  void toggleConversationPin(activeConversation);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--ink)] transition hover:bg-[var(--surface-alt)]"
              >
                <Icon
                  name="pin"
                  className="h-[18px] w-[18px] text-[var(--muted-2)]"
                />
                {activeConversation.isPinned ? "Lepas pin" : "Pin obrolan"}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              onOpenWorkspaceModal();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--ink)] transition hover:bg-[var(--surface-alt)]"
          >
            <Icon name="book" className="h-[18px] w-[18px] text-[var(--muted-2)]" />
            Ganti workspace
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              openSettings("general");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--ink)] transition hover:bg-[var(--surface-alt)] md:hidden"
          >
            <Icon
              name="settings"
              className="h-[18px] w-[18px] text-[var(--muted-2)]"
            />
            Pengaturan
          </button>
        </div>
      )}
    </header>
  );
}

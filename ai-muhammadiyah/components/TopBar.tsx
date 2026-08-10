"use client";

import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import type {
  ActiveTool,
  Conversation,
  SettingsTab,
} from "@/lib/mappers/types";
import type { Skill } from "@/lib/skills";

interface TopBarProps {
  // tool tab switching
  activeTool: ActiveTool;
  setActiveTool: Dispatch<SetStateAction<ActiveTool>>;

  // conversation title + skill category badge
  activeConversation: Conversation | undefined;
  selectedSkill: Skill | null;

  // conversation-scoped actions (reuse existing functions)
  exportActiveChatMarkdown: () => void;
  openSharePreview: () => void;

  // artifact panel toggle — the panel itself is lg-only, so the pill is too
  artifactCount: number;
  isArtifactPanelOpen: boolean;
  setIsArtifactPanelOpen: Dispatch<SetStateAction<boolean>>;

  // account menu — mobile-only popover here (desktop lives in the Icon Rail)
  currentTierLabel: string;
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: Dispatch<SetStateAction<boolean>>;
  userInitials: string;
  openLearningProfile: () => void;
  openSettings: (tab?: SettingsTab) => void;
  handleLogout: () => Promise<void>;
  isLoggingOut: boolean;
}

export default function TopBar({
  activeTool,
  setActiveTool,
  activeConversation,
  selectedSkill,
  exportActiveChatMarkdown,
  openSharePreview,
  artifactCount,
  isArtifactPanelOpen,
  setIsArtifactPanelOpen,
  currentTierLabel,
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  userInitials,
  openLearningProfile,
  openSettings,
  handleLogout,
  isLoggingOut,
}: TopBarProps) {
  const router = useRouter();
  const categoryLabel = selectedSkill?.category ?? selectedSkill?.name ?? "";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--brand-deep-line)]/10 px-4 sm:px-6 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[var(--on-brand)] md:hidden">
          <SparkIcon className="h-6 w-6" />
        </div>
        <button
          type="button"
          onClick={() => setActiveTool("chat")}
          className="min-w-0 truncate text-lg font-bold text-[var(--ink)] sm:text-xl"
          title={activeConversation?.title ?? "Obrolan baru"}
        >
          {activeConversation?.title ?? "Obrolan baru"}
        </button>
        {categoryLabel && (
          <span className="hidden shrink-0 rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] sm:inline-flex">
            {categoryLabel}
          </span>
        )}
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        {artifactCount > 0 && activeTool === "chat" && (
          <button
            type="button"
            onClick={() => setIsArtifactPanelOpen((isOpen) => !isOpen)}
            aria-label="Panel artifact"
            title="Panel artifact"
            aria-expanded={isArtifactPanelOpen}
            className={
              isArtifactPanelOpen
                ? "hidden items-center gap-1.5 rounded-full bg-[var(--brand)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand)] lg:inline-flex"
                : "hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)] lg:inline-flex"
            }
          >
            Artifact
            <span className="rounded-full bg-[var(--gold)] px-1.5 text-[10px] font-bold text-[var(--gold-ink-2)]">
              {artifactCount}
            </span>
          </button>
        )}

        {activeConversation && (
          <button
            type="button"
            onClick={exportActiveChatMarkdown}
            aria-label="Export markdown"
            title="Export markdown"
            className="hidden h-9 w-9 place-items-center rounded-lg text-[var(--muted-2)] transition hover:bg-[var(--surface-border)] sm:grid"
          >
            <Icon name="download" className="h-5 w-5" />
          </button>
        )}

        <div className="mx-1 hidden h-4 w-px bg-[var(--brand-deep)]/10 sm:block" />

        <button
          type="button"
          onClick={openSharePreview}
          className="flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-medium text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
        >
          <Icon name="share" className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Menu akun"
          aria-expanded={isAccountMenuOpen}
          className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-[var(--gold)] text-base font-bold text-[var(--gold-ink-2)] transition hover:bg-[var(--c-e0bd6a)] md:hidden"
        >
          {userInitials}
        </button>

        {isAccountMenuOpen && (
          <div className="absolute right-0 top-14 z-40 w-[min(86vw,300px)] overflow-hidden rounded-[22px] bg-[var(--pure-white)] p-2 text-sm shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10 md:hidden">
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                router.push("/plans");
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[var(--surface-alt)]"
            >
              <span className="font-bold text-[var(--ink)]">Upgrade plan</span>
              <span className="rounded-full bg-[var(--brand)]/10 px-2 py-1 text-xs font-bold text-[var(--brand)]">
                {currentTierLabel}
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
              <span className="font-bold text-[var(--ink)]">Learning Profile</span>
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
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left font-bold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="lock" className="h-5 w-5" />
              {isLoggingOut ? "Keluar..." : "Logout"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

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

// Header tool cluster — maps to the existing activeTool switching (Chat is the
// default view; clicking a tool opens it, clicking it again returns to Chat).
const toolIcons: { id: Exclude<ActiveTool, "chat">; icon: string; label: string }[] =
  [
    { id: "docs", icon: "book", label: "Docs" },
    { id: "tasks", icon: "tasks", label: "Tasks" },
    { id: "sheets", icon: "sheets", label: "Sheets" },
    { id: "canvas", icon: "canvas", label: "Canvas" },
  ];

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
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#bec9be] px-4 sm:px-6 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#004d27] text-white md:hidden">
          <SparkIcon className="h-6 w-6" />
        </div>
        <button
          type="button"
          onClick={() => setActiveTool("chat")}
          className="min-w-0 truncate text-lg font-bold text-[#191c1d] sm:text-xl"
          title={activeConversation?.title ?? "Obrolan baru"}
        >
          {activeConversation?.title ?? "Obrolan baru"}
        </button>
        {categoryLabel && (
          <span className="hidden shrink-0 rounded-full bg-[#004d27]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#004d27] sm:inline-flex">
            {categoryLabel}
          </span>
        )}
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        {toolIcons.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() =>
              setActiveTool(activeTool === tool.id ? "chat" : tool.id)
            }
            aria-label={tool.label}
            title={tool.label}
            className={
              activeTool === tool.id
                ? "grid h-9 w-9 place-items-center rounded-lg bg-[#004d27]/10 text-[#004d27]"
                : "grid h-9 w-9 place-items-center rounded-lg text-[#3f4940] transition hover:bg-[#edeeef]"
            }
          >
            <Icon name={tool.icon} className="h-5 w-5" />
          </button>
        ))}

        {artifactCount > 0 && activeTool === "chat" && (
          <button
            type="button"
            onClick={() => setIsArtifactPanelOpen((isOpen) => !isOpen)}
            aria-label="Panel artifact"
            title="Panel artifact"
            aria-expanded={isArtifactPanelOpen}
            className={
              isArtifactPanelOpen
                ? "hidden items-center gap-1.5 rounded-full bg-[#004d27]/10 px-3 py-1.5 text-xs font-bold text-[#004d27] lg:inline-flex"
                : "hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#3f4940] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] lg:inline-flex"
            }
          >
            Artifact
            <span className="rounded-full bg-[#fdc003] px-1.5 text-[10px] font-bold text-[#6c5000]">
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
            className="hidden h-9 w-9 place-items-center rounded-lg text-[#3f4940] transition hover:bg-[#edeeef] sm:grid"
          >
            <Icon name="download" className="h-5 w-5" />
          </button>
        )}

        <div className="mx-1 hidden h-4 w-px bg-[#bec9be] sm:block" />

        <button
          type="button"
          onClick={openSharePreview}
          className="flex items-center gap-2 rounded-lg bg-[#004d27] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#006837]"
        >
          <Icon name="share" className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Menu akun"
          aria-expanded={isAccountMenuOpen}
          className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-[#fdc003] text-base font-bold text-[#6c5000] transition hover:bg-[#fabd00] md:hidden"
        >
          {userInitials}
        </button>

        {isAccountMenuOpen && (
          <div className="absolute right-0 top-14 z-40 w-[min(86vw,300px)] overflow-hidden rounded-[22px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#bec9be] md:hidden">
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                router.push("/plans");
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f3f4f5]"
            >
              <span className="font-bold text-[#191c1d]">Upgrade plan</span>
              <span className="rounded-full bg-[#004d27]/10 px-2 py-1 text-xs font-bold text-[#004d27]">
                {currentTierLabel}
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
              <span className="font-bold text-[#191c1d]">Learning Profile</span>
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
          </div>
        )}
      </div>
    </header>
  );
}

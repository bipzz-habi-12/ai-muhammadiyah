"use client";

import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import {
  getModelProviderLabel,
  getLockedModelRequirement,
  getLockedSkillRequirement,
} from "@/lib/chat/selection-labels";
import type {
  ActiveTool,
  Conversation,
  SettingsTab,
} from "@/lib/mappers/types";
import { canAccessTier, getSkillBadge, type Skill } from "@/lib/skills";
import { modelCatalog, type PlanModelId } from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";

const tools: { id: ActiveTool; label: string; icon: string }[] = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "docs", label: "Docs", icon: "book" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "sheets", label: "Sheets", icon: "sheets" },
  { id: "canvas", label: "Canvas", icon: "canvas" },
];

interface TopBarProps {
  // tool tab nav
  activeTool: ActiveTool;
  setActiveTool: Dispatch<SetStateAction<ActiveTool>>;

  // model selector
  selectedModelInfo: (typeof modelCatalog)[PlanModelId];
  selectedModel: PlanModelId;
  allowedModels: string[];
  isModelMenuOpen: boolean;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectModel: (model: PlanModelId) => void;
  modelOptions: PlanModelId[];

  // skill / study-mode selector
  isStudyModeMenuOpen: boolean;
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>;
  selectedSkill: Skill | null;
  selectedSkillBadge: string;
  skills: Skill[];
  skillsLoading: boolean;
  selectedSkillId: string | null;
  selectSkill: (skillId: string) => void;
  usageSnapshot: UsageSnapshot | null;

  // pin / export / share (desktop-only row)
  activeConversation: Conversation | undefined;
  toggleConversationPin: (conversation: Conversation) => Promise<void>;
  exportActiveChatMarkdown: () => void;
  openSharePreview: () => void;

  // tier badge + account menu (trigger always visible; popover here is md:hidden)
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
  selectedModelInfo,
  selectedModel,
  allowedModels,
  isModelMenuOpen,
  setIsModelMenuOpen,
  selectModel,
  modelOptions,
  isStudyModeMenuOpen,
  setIsStudyModeMenuOpen,
  selectedSkill,
  selectedSkillBadge,
  skills,
  skillsLoading,
  selectedSkillId,
  selectSkill,
  usageSnapshot,
  activeConversation,
  toggleConversationPin,
  exportActiveChatMarkdown,
  openSharePreview,
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

  return (
    <>
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#bec9be] px-4 sm:px-6 md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#004d27] text-white md:hidden">
          <SparkIcon className="h-7 w-7" />
        </div>
        <div className="relative min-w-0 text-lg font-bold sm:text-xl">
          <span>AI-mu</span>
          <span className="mx-2 text-[#3f4940]">·</span>
          <button
            type="button"
            onClick={() => {
              setIsStudyModeMenuOpen(false);
              setIsModelMenuOpen((isOpen) => !isOpen);
            }}
            aria-label="Pilih model AI"
            aria-expanded={isModelMenuOpen}
            className="inline-flex max-w-[190px] items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#3f4940] shadow-sm ring-1 ring-[#bec9be] outline-none transition hover:bg-[#edeeef] focus:ring-[#004d27] sm:max-w-none sm:text-base"
          >
            <span className="truncate">{selectedModelInfo.label}</span>
            {selectedModel === "smart" && (
              <span className="rounded-full bg-[#fdc003] px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-[#6c5000]">
                GPT
              </span>
            )}
            <span className="text-xs text-[#6f7a70]">⌄</span>
          </button>
          <span className="ml-2 hidden align-middle text-xs font-bold text-[#6f7a70] lg:inline">
            {getModelProviderLabel(selectedModel)}
          </span>

          <span className="mx-2 hidden text-[#3f4940] sm:inline">/</span>
          <button
            type="button"
            onClick={() => {
              setIsModelMenuOpen(false);
              setIsStudyModeMenuOpen((isOpen) => !isOpen);
            }}
            aria-label="Pilih study mode"
            aria-expanded={isStudyModeMenuOpen}
            className="mt-2 inline-flex max-w-[210px] items-center gap-2 rounded-full bg-[#004d27]/10 px-3 py-2 text-sm font-semibold text-[#3f4940] shadow-sm ring-1 ring-[#bec9be] outline-none transition hover:bg-[#004d27]/15 focus:ring-[#004d27] sm:mt-0 sm:max-w-none"
          >
            <span className="truncate">
              {selectedSkill ? selectedSkill.name : "Memuat skill..."}
            </span>
            {selectedSkill && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-normal text-[#004d27] ring-1 ring-[#bec9be]">
                {selectedSkillBadge}
              </span>
            )}
            <span className="text-xs text-[#6f7a70]">⌄</span>
          </button>

          {isModelMenuOpen && (
            <div className="absolute left-16 top-11 z-30 w-[min(86vw,360px)] overflow-hidden rounded-[24px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#bec9be] sm:left-20">
              {modelOptions.map((model) => {
                const modelInfo = modelCatalog[model];
                const isAllowed = allowedModels.includes(model);

                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => selectModel(model)}
                    className={
                      selectedModel === model
                        ? "flex w-full items-start gap-3 rounded-[18px] bg-[#004d27]/10 p-3 text-left"
                        : "flex w-full items-start gap-3 rounded-[18px] p-3 text-left transition hover:bg-[#f3f4f5]"
                    }
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                      <Icon
                        name={isAllowed ? "check" : "lock"}
                        className="h-4 w-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-bold text-[#191c1d]">
                        {modelInfo.label}
                        {model === "smart" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdc003] px-2 py-0.5 text-[11px] font-bold text-[#6c5000]">
                            <SparkIcon className="h-3 w-3" />
                            GPT-5 mini
                          </span>
                        )}
                        {model === "document" && (
                          <span className="rounded-full bg-[#e0e0ff] px-2 py-0.5 text-[11px] font-bold text-[#343d96]">
                            Gemini Pro
                          </span>
                        )}
                        {!isAllowed && (
                          <span className="rounded-full bg-[#fdc003] px-2 py-0.5 text-[11px] font-bold text-[#6c5000]">
                            Premium
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#3f4940]">
                        {isAllowed
                          ? modelInfo.description
                          : getLockedModelRequirement(model)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {isStudyModeMenuOpen && (
            <div className="absolute left-0 top-24 z-30 w-[min(88vw,390px)] overflow-hidden rounded-[24px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#bec9be] sm:left-44 sm:top-12">
              {skillsLoading && !skills.length && (
                <div className="p-3 text-xs font-semibold text-[#6f7a70]">
                  Memuat skill...
                </div>
              )}
              {skills.map((skill) => {
                const isAllowed = canAccessTier(
                  usageSnapshot?.tier,
                  skill.minTier,
                );
                const badge = getSkillBadge(skill, usageSnapshot?.tier);

                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => selectSkill(skill.id)}
                    className={
                      selectedSkillId === skill.id
                        ? "flex w-full items-start gap-3 rounded-[18px] bg-[#004d27]/10 p-3 text-left"
                        : "flex w-full items-start gap-3 rounded-[18px] p-3 text-left transition hover:bg-[#f3f4f5]"
                    }
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                      <Icon
                        name={isAllowed ? "check" : "lock"}
                        className="h-4 w-4"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-bold text-[#191c1d]">
                        {skill.name}
                        <span
                          className={
                            isAllowed
                              ? "rounded-full bg-[#004d27]/10 px-2 py-0.5 text-[11px] font-bold text-[#004d27]"
                              : "rounded-full bg-[#fdc003] px-2 py-0.5 text-[11px] font-bold text-[#6c5000]"
                          }
                        >
                          {badge}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#3f4940]">
                        {isAllowed
                          ? (skill.category ?? "")
                          : getLockedSkillRequirement(skill)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        {activeConversation && (
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => toggleConversationPin(activeConversation)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#3f4940] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] hover:text-[#004d27]"
              aria-label={
                activeConversation.isPinned
                  ? "Lepas pin obrolan"
                  : "Pin obrolan"
              }
              title={
                activeConversation.isPinned
                  ? "Lepas pin obrolan"
                  : "Pin obrolan"
              }
            >
              <Icon name="pin" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={exportActiveChatMarkdown}
              className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#191c1d] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef]"
            >
              Export
            </button>
            <button
              type="button"
              onClick={openSharePreview}
              className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#191c1d] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef]"
            >
              Share
            </button>
          </div>
        )}
        <span className="hidden rounded-full bg-[#004d27]/10 px-3 py-1 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] sm:inline-flex">
          {currentTierLabel}
        </span>
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-label="Menu akun"
          aria-expanded={isAccountMenuOpen}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#fdc003] text-xl font-bold text-[#6c5000] shadow-sm transition hover:bg-[#fabd00]"
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
              <span className="font-bold text-[#191c1d]">
                Learning Profile
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
          </div>
        )}
      </div>
    </header>

    <nav className="flex items-center gap-1 overflow-x-auto border-b border-[#bec9be] bg-white px-4 py-2 sm:px-6 md:px-10">
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => setActiveTool(tool.id)}
          className={
            activeTool === tool.id
              ? "flex shrink-0 items-center gap-2 rounded-full bg-[#004d27]/10 px-3 py-1.5 text-sm font-bold text-[#004d27]"
              : "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-[#3f4940] transition hover:bg-[#f3f4f5]"
          }
        >
          <Icon name={tool.icon} className="h-4 w-4" />
          {tool.label}
        </button>
      ))}
    </nav>
    </>
  );
}

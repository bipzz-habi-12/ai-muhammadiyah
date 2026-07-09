"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { SparkIcon, Icon } from "@/components/icons";
import {
  getLockedModelRequirement,
  getLockedSkillRequirement,
} from "@/lib/chat/selection-labels";
import { canAccessTier, getSkillBadge, type Skill } from "@/lib/skills";
import { modelCatalog, type PlanModelId } from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";

// Shared disclaimer copy (reused by the welcome hero and the active composer).
export const CHAT_DISCLAIMER =
  "AI-mu dapat keliru. Selalu verifikasi informasi penting, terutama dalam urusan ibadah & syariah.";

interface ComposerProps {
  variant: "welcome" | "active";
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  isSending: boolean;
  hasMessageQuota: boolean;
  setIsAttachMenuOpen: Dispatch<SetStateAction<boolean>>;
  renderAttachMenu: () => ReactNode;
  renderAttachmentChips: (extraClassName?: string) => ReactNode;

  // model dropdown (moved here from the old header)
  selectedModel: PlanModelId;
  selectModel: (model: PlanModelId) => void;
  allowedModels: string[];
  isModelMenuOpen: boolean;
  setIsModelMenuOpen: Dispatch<SetStateAction<boolean>>;
  modelOptions: PlanModelId[];
  selectedModelInfo: (typeof modelCatalog)[PlanModelId];

  // skill dropdown + active chip
  skills: Skill[];
  skillsLoading: boolean;
  selectedSkill: Skill | null;
  selectedSkillId: string | null;
  selectSkill: (skillId: string) => void;
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>;
  selectedSkillBadge: string;
  usageSnapshot: UsageSnapshot | null;
  isStudyModeMenuOpen: boolean;
  setIsStudyModeMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Composer({
  variant,
  input,
  setInput,
  sendMessage,
  isSending,
  hasMessageQuota,
  setIsAttachMenuOpen,
  renderAttachMenu,
  renderAttachmentChips,
  selectedModel,
  selectModel,
  allowedModels,
  isModelMenuOpen,
  setIsModelMenuOpen,
  modelOptions,
  selectedModelInfo,
  skills,
  skillsLoading,
  selectedSkill,
  selectedSkillId,
  selectSkill,
  setSelectedSkillId,
  selectedSkillBadge,
  usageSnapshot,
  isStudyModeMenuOpen,
  setIsStudyModeMenuOpen,
}: ComposerProps) {
  function toggleModelMenu() {
    setIsStudyModeMenuOpen(false);
    setIsModelMenuOpen((isOpen) => !isOpen);
  }

  function toggleSkillMenu() {
    setIsModelMenuOpen(false);
    setIsStudyModeMenuOpen((isOpen) => !isOpen);
  }

  // Upward-opening popover (composer sits low on the screen).
  function renderModelMenu() {
    if (!isModelMenuOpen) {
      return null;
    }

    return (
      <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(86vw,340px)] overflow-hidden rounded-[20px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#bec9be]">
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
                  ? "flex w-full items-start gap-3 rounded-[16px] bg-[#004d27]/10 p-3 text-left"
                  : "flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition hover:bg-[#f3f4f5]"
              }
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                <Icon name={isAllowed ? "check" : "lock"} className="h-4 w-4" />
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
    );
  }

  function renderSkillMenu() {
    if (!isStudyModeMenuOpen) {
      return null;
    }

    return (
      <div className="absolute bottom-full right-0 z-30 mb-2 w-[min(88vw,360px)] overflow-hidden rounded-[20px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#bec9be]">
        {skillsLoading && !skills.length && (
          <div className="p-3 text-xs font-semibold text-[#6f7a70]">
            Memuat skill...
          </div>
        )}
        {skills.map((skill) => {
          const isAllowed = canAccessTier(usageSnapshot?.tier, skill.minTier);
          const badge = getSkillBadge(skill, usageSnapshot?.tier);

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => selectSkill(skill.id)}
              className={
                selectedSkillId === skill.id
                  ? "flex w-full items-start gap-3 rounded-[16px] bg-[#004d27]/10 p-3 text-left"
                  : "flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition hover:bg-[#f3f4f5]"
              }
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#004d27]/10 text-[#004d27]">
                <Icon name={isAllowed ? "check" : "lock"} className="h-4 w-4" />
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
    );
  }

  // Skill chip: opens the skill picker; the X resets to the platform default
  // skill (setSelectedSkillId(null) re-triggers useSkills' fallback effect).
  function renderSkillChip() {
    return (
      <div className="relative">
        <div className="inline-flex items-center gap-1 rounded-full bg-[#004d27]/10 px-3 py-1 text-xs font-bold text-[#004d27]">
          <button
            type="button"
            onClick={toggleSkillMenu}
            className="inline-flex items-center gap-1"
            aria-label="Pilih skill"
          >
            <Icon name="book" className="h-4 w-4" />
            <span className="max-w-[140px] truncate">
              {selectedSkill ? selectedSkill.name : "Memuat..."}
            </span>
            {selectedSkillBadge && (
              <span className="text-[10px] font-bold text-[#3f4940]">
                {selectedSkillBadge}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSkillId(null)}
            className="transition hover:text-[#006837]"
            aria-label="Reset skill ke default"
            title="Reset skill ke default"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
        {renderSkillMenu()}
      </div>
    );
  }

  function renderModelTrigger() {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={toggleModelMenu}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#3f4940] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef]"
          aria-label="Pilih model AI"
          aria-expanded={isModelMenuOpen}
        >
          <Icon name="idea" className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {selectedModelInfo.shortLabel}
          </span>
          <span className="text-[10px] text-[#6f7a70]">⌄</span>
        </button>
        {renderModelMenu()}
      </div>
    );
  }

  if (variant === "welcome") {
    return (
      <div className="w-full rounded-[34px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-[#bec9be]">
        {renderAttachmentChips("mb-3")}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Tanyakan apa saja kepada AI-mu..."
          disabled={isSending}
          className="h-20 w-full bg-transparent text-xl text-[#191c1d] outline-none placeholder:text-[#6f7a70]"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[#3f4940]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#edeeef]"
            >
              <span aria-hidden="true" className="text-2xl">⌘</span>
              Lampirkan
            </button>
            {renderAttachMenu()}
          </div>

          {renderModelTrigger()}
          {renderSkillChip()}

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim() || !hasMessageQuota}
            aria-label="Kirim pesan"
            title="Kirim pesan"
            className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#004d27] text-white transition hover:bg-[#006837] disabled:cursor-not-allowed disabled:bg-[#004d27]/40"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[#bec9be] bg-white p-3 sm:p-4">
      {renderAttachmentChips("mb-2")}
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {renderModelTrigger()}
          {renderSkillChip()}
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-[#bec9be] focus-within:ring-[#004d27] sm:gap-3 sm:px-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#3f4940] transition hover:bg-[#edeeef]"
              title="Add photos & files"
              aria-label="Add photos & files"
            >
              <span aria-hidden="true" className="text-2xl leading-none">+</span>
            </button>
            {renderAttachMenu()}
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            placeholder="Tanyakan apa saja kepada AI-mu..."
            disabled={isSending}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#191c1d] outline-none placeholder:text-[#6f7a70] sm:text-base"
          />

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim() || !hasMessageQuota}
            aria-label="Kirim pesan"
            title="Kirim pesan"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#004d27] text-white transition hover:bg-[#006837] disabled:cursor-not-allowed disabled:bg-[#004d27]/40"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="m22 2-7 20-4-9-9-4 20-7Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] leading-relaxed text-[#6f7a70]">
          {CHAT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

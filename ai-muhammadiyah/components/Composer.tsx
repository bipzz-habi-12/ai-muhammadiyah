"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
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

  // one-shot per-message skill override (chosen via the "/" slash picker)
  messageSkillOverrideId: string | null;
  setMessageSkillOverrideId: Dispatch<SetStateAction<string | null>>;
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
  messageSkillOverrideId,
  setMessageSkillOverrideId,
}: ComposerProps) {
  const router = useRouter();
  // The "/" slash picker opens whenever the input starts with "/". Escape sets
  // this flag to dismiss it without wiping the text; typing anything that no
  // longer starts with "/" re-arms it.
  const [isSlashDismissed, setIsSlashDismissed] = useState(false);

  const isSlashCommand = input.startsWith("/");
  const isSlashPickerOpen = isSlashCommand && !isSlashDismissed;
  const slashMatches = isSlashCommand
    ? skills.filter((skill) =>
        skill.slashCommand
          ?.toLowerCase()
          .startsWith(input.toLowerCase()),
      )
    : [];
  const messageSkillOverride =
    skills.find((skill) => skill.id === messageSkillOverrideId) ?? null;

  function handleInputChange(value: string) {
    setInput(value);
    if (!value.startsWith("/")) {
      setIsSlashDismissed(false);
    }
  }

  // One-shot skill selection via "/": sets the per-message override (NOT
  // selectSkill, which would persist to localStorage), then clears the command
  // text so the user types their actual message next. Locked skills route to
  // the upgrade page, mirroring the dropdown's gating.
  function pickSlashSkill(skill: Skill) {
    if (!canAccessTier(usageSnapshot?.tier, skill.minTier)) {
      setIsSlashDismissed(true);
      router.push("/plans");
      return;
    }

    setMessageSkillOverrideId(skill.id);
    setInput("");
    setIsSlashDismissed(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isSlashPickerOpen) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (slashMatches.length > 0) {
          pickSlashSkill(slashMatches[0]);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsSlashDismissed(true);
        return;
      }
    }

    if (event.key === "Enter") {
      void sendMessage();
    }
  }

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
      <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(86vw,340px)] overflow-hidden rounded-[20px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#0b3d2a]/10">
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
                  ? "flex w-full items-start gap-3 rounded-[16px] bg-[#0f5a3d]/10 p-3 text-left"
                  : "flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition hover:bg-[#f0eee6]"
              }
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0f5a3d]/10 text-[#0f5a3d]">
                <Icon name={isAllowed ? "check" : "lock"} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold text-[#16211c]">
                  {modelInfo.label}
                  {model === "smart" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e7c77e] px-2 py-0.5 text-[11px] font-bold text-[#8a6a1f]">
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
                    <span className="rounded-full bg-[#e7c77e] px-2 py-0.5 text-[11px] font-bold text-[#8a6a1f]">
                      Premium
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#5d6862]">
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
      <div className="absolute bottom-full right-0 z-30 mb-2 w-[min(88vw,360px)] overflow-hidden rounded-[20px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#0b3d2a]/10">
        {skillsLoading && !skills.length && (
          <div className="p-3 text-xs font-semibold text-[#8a9089]">
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
                  ? "flex w-full items-start gap-3 rounded-[16px] bg-[#0f5a3d]/10 p-3 text-left"
                  : "flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition hover:bg-[#f0eee6]"
              }
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0f5a3d]/10 text-[#0f5a3d]">
                <Icon name={isAllowed ? "check" : "lock"} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold text-[#16211c]">
                  {skill.name}
                  <span
                    className={
                      isAllowed
                        ? "rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 text-[11px] font-bold text-[#0f5a3d]"
                        : "rounded-full bg-[#e7c77e] px-2 py-0.5 text-[11px] font-bold text-[#8a6a1f]"
                    }
                  >
                    {badge}
                  </span>
                </span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#5d6862]">
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
        <div className="inline-flex items-center gap-1 rounded-full bg-[#0f5a3d]/10 px-3 py-1 text-xs font-bold text-[#0f5a3d]">
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
              <span className="text-[10px] font-bold text-[#5d6862]">
                {selectedSkillBadge}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSkillId(null)}
            className="transition hover:text-[#0a3d2a]"
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
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5d6862] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
          aria-label="Pilih model AI"
          aria-expanded={isModelMenuOpen}
        >
          <Icon name="idea" className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {selectedModelInfo.shortLabel}
          </span>
          <span className="text-[10px] text-[#8a9089]">⌄</span>
        </button>
        {renderModelMenu()}
      </div>
    );
  }

  // "/" picker: upward-opening popover listing skills whose slash_command matches
  // what's typed after "/". Reuses the model/skill menu styling.
  function renderSlashPicker() {
    if (!isSlashPickerOpen) {
      return null;
    }

    return (
      <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(88vw,360px)] overflow-hidden rounded-[20px] bg-white p-2 text-sm shadow-2xl ring-1 ring-[#0b3d2a]/10">
        <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-[#8a9089]">
          Skill sekali pakai
        </div>
        {slashMatches.length === 0 ? (
          <div className="p-3 text-xs font-semibold text-[#8a9089]">
            {skillsLoading && !skills.length
              ? "Memuat skill..."
              : "Tidak ada skill dengan perintah itu."}
          </div>
        ) : (
          slashMatches.map((skill) => {
            const isAllowed = canAccessTier(usageSnapshot?.tier, skill.minTier);

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => pickSlashSkill(skill)}
                className="flex w-full items-center gap-3 rounded-[16px] p-3 text-left transition hover:bg-[#f0eee6]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0f5a3d]/10 text-[#0f5a3d]">
                  <Icon name={isAllowed ? "book" : "lock"} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-[#16211c]">
                    <span className="font-mono text-[#0f5a3d]">
                      {skill.slashCommand}
                    </span>
                    {skill.name}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#5d6862]">
                    {isAllowed
                      ? (skill.category ?? "")
                      : getLockedSkillRequirement(skill)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  }

  // Amber pill shown when a one-shot "/" skill is armed for the next message.
  function renderOverrideChip() {
    if (!messageSkillOverride) {
      return null;
    }

    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-[#e7c77e] px-3 py-1 text-xs font-bold text-[#8a6a1f]">
        <Icon name="idea" className="h-4 w-4" />
        <span className="max-w-[160px] truncate">
          Sekali pakai: {messageSkillOverride.name}
        </span>
        <button
          type="button"
          onClick={() => setMessageSkillOverrideId(null)}
          className="transition hover:text-[#16211c]"
          aria-label="Batalkan skill sekali pakai"
          title="Batalkan skill sekali pakai"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Shared text input + slash picker, used by both variants (different sizing).
  function renderComposerInput(inputClassName: string, wrapperClassName: string) {
    return (
      <div className={`relative ${wrapperClassName}`}>
        <input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={
            isSlashPickerOpen
              ? "Ketik perintah skill, mis. /coding..."
              : "Tanyakan apa saja kepada AI-mu... (ketik / untuk skill)"
          }
          disabled={isSending}
          className={inputClassName}
        />
        {renderSlashPicker()}
      </div>
    );
  }

  if (variant === "welcome") {
    return (
      <div className="w-full rounded-[20px] bg-[#fbfaf6] p-4 shadow-[0_8px_24px_-20px_rgba(11,61,42,0.5)] ring-1 ring-[#0b3d2a]/14 focus-within:ring-[#0f5a3d]">
        {renderAttachmentChips("mb-3")}
        {renderComposerInput(
          "h-20 w-full bg-transparent text-xl text-[#16211c] outline-none placeholder:text-[#8a9089]",
          "w-full",
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[#5d6862]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[#ece9df]"
            >
              <span aria-hidden="true" className="text-2xl">⌘</span>
              Lampirkan
            </button>
            {renderAttachMenu()}
          </div>

          {renderModelTrigger()}
          {renderSkillChip()}
          {renderOverrideChip()}

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim() || !hasMessageQuota}
            aria-label="Kirim pesan"
            title="Kirim pesan"
            className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#0f5a3d] text-white transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:bg-[#0f5a3d]/40"
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
    <div className="bg-gradient-to-t from-[#f5f3ec] via-[#f5f3ec] to-transparent p-3 sm:p-4">
      {renderAttachmentChips("mb-2")}
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {renderModelTrigger()}
          {renderSkillChip()}
          {renderOverrideChip()}
        </div>

        <div className="flex items-center gap-2 rounded-[16px] bg-[#fbfaf6] px-3 py-2 shadow-[0_8px_24px_-20px_rgba(11,61,42,0.5)] ring-1 ring-[#0b3d2a]/14 focus-within:ring-[#0f5a3d] sm:gap-3 sm:px-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5d6862] transition hover:bg-[#ece9df]"
              title="Add photos & files"
              aria-label="Add photos & files"
            >
              <span aria-hidden="true" className="text-2xl leading-none">+</span>
            </button>
            {renderAttachMenu()}
          </div>

          {renderComposerInput(
            "w-full bg-transparent text-sm text-[#16211c] outline-none placeholder:text-[#8a9089] sm:text-base",
            "min-w-0 flex-1",
          )}

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim() || !hasMessageQuota}
            aria-label="Kirim pesan"
            title="Kirim pesan"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0f5a3d] text-white transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:bg-[#0f5a3d]/40"
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

        <p className="mt-2 text-center text-[11px] leading-relaxed text-[#8a9089]">
          {CHAT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

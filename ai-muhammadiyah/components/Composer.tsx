"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Icon } from "@/components/icons";
import {
  getLockedModelRequirement,
  getLockedSkillRequirement,
} from "@/lib/chat/selection-labels";
import { canAccessTier, type Skill } from "@/lib/skills";
import {
  aiDiscussion,
  effortLevels,
  getEffortLabel,
  modelCatalog,
  type EffortLevel,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";
import {
  formatTokenCount,
  type ContextUsage,
} from "@/lib/ai/context-window";

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

  // submenu "Upaya" + toggle "Pemikiran" di dalam menu model
  isEffortMenuOpen: boolean;
  setIsEffortMenuOpen: Dispatch<SetStateAction<boolean>>;
  effort: EffortLevel;
  setEffort: (level: EffortLevel) => void;
  isThinkingEnabled: boolean;
  toggleThinking: () => void;

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

  // indikator context window (hanya dipakai varian "active")
  contextUsage?: ContextUsage | null;

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
  isEffortMenuOpen,
  setIsEffortMenuOpen,
  effort,
  setEffort,
  isThinkingEnabled,
  toggleThinking,
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
  contextUsage,
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
      <div className="scroll absolute bottom-full left-0 z-30 mb-2 max-h-[min(60vh,380px)] w-[min(86vw,320px)] overflow-y-auto overscroll-contain rounded-[18px] bg-[var(--pure-white)] p-1.5 text-sm shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10">
        {modelOptions.map((model) => {
          const modelInfo = modelCatalog[model];
          const isAllowed = allowedModels.includes(model);
          const isSelected = selectedModel === model;

          return (
            <button
              key={model}
              type="button"
              onClick={() => selectModel(model)}
              className={
                isSelected
                  ? "flex w-full items-center gap-2 rounded-[12px] bg-[var(--brand)]/10 px-2.5 py-1.5 text-left"
                  : "flex w-full items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-left transition hover:bg-[var(--surface-alt)]"
              }
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-bold text-[var(--ink)]">
                    {modelInfo.label}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-[var(--muted-3)]">
                    {modelInfo.engineLabel}
                  </span>
                  {!isAllowed && (
                    <Icon name="lock" className="h-3 w-3 shrink-0 text-[var(--gold-ink-2)]" />
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-snug text-[var(--muted-2)]">
                  {isAllowed
                    ? modelInfo.description
                    : getLockedModelRequirement(model)}
                </span>
              </span>
              {isSelected && (
                <Icon name="check" className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              )}
            </button>
          );
        })}

        <div className="my-1 h-px bg-[var(--brand-deep)]/10" />

        {/* Baris "Upaya" — membuka submenu level Rendah..Ultra. */}
        <button
          type="button"
          onClick={() => setIsEffortMenuOpen((isOpen) => !isOpen)}
          aria-expanded={isEffortMenuOpen}
          className="flex w-full items-center justify-between gap-3 rounded-[12px] px-2.5 py-1.5 text-left transition hover:bg-[var(--surface-alt)]"
        >
          <span className="text-[13px] font-bold text-[var(--ink)]">Upaya</span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted-2)]">
            {getEffortLabel(effort)}
            <span aria-hidden="true">{isEffortMenuOpen ? "⌄" : "›"}</span>
          </span>
        </button>

        {isEffortMenuOpen && (
          <div className="mb-1 rounded-[12px] bg-[var(--surface-panel)] p-1">
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] leading-snug text-[var(--muted-2)]">
              Makin tinggi: makin menyeluruh, makin lama, makin boros kuota.
            </p>
            {effortLevels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setEffort(level.id)}
                className={
                  effort === level.id
                    ? "flex w-full items-center justify-between gap-2 rounded-[10px] bg-[var(--brand)]/10 px-2.5 py-1 text-left"
                    : "flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1 text-left transition hover:bg-[var(--surface-border)]"
                }
              >
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[var(--ink)]">
                    {level.label}
                  </span>
                  {level.isDefault && (
                    <span className="rounded-full bg-[var(--brand-deep)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted-2)]">
                      Bawaan
                    </span>
                  )}
                </span>
                {effort === level.id && (
                  <Icon name="check" className="h-3.5 w-3.5 text-[var(--brand)]" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Toggle "Pemikiran" — mematikannya memaksa upaya minimal (hemat kuota). */}
        <div className="flex items-center justify-between gap-2 rounded-[12px] px-2.5 py-1.5">
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-[var(--ink)]">
              Pemikiran
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-snug text-[var(--muted-2)]">
              Berpikir untuk tugas yang lebih kompleks
            </span>
          </span>
          <button
            type="button"
            onClick={toggleThinking}
            role="switch"
            aria-checked={isThinkingEnabled}
            aria-label="Pemikiran"
            className={
              isThinkingEnabled
                ? "relative h-5 w-9 shrink-0 rounded-full bg-[var(--brand)] transition"
                : "relative h-5 w-9 shrink-0 rounded-full bg-[var(--c-c7ccc8)] transition"
            }
          >
            <span
              className={
                isThinkingEnabled
                  ? "absolute left-[18px] top-0.5 h-4 w-4 rounded-full bg-[var(--pure-white)] transition-all"
                  : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--pure-white)] transition-all"
              }
            />
          </button>
        </div>

        <div className="my-1 h-px bg-[var(--brand-deep)]/10" />

        {/* AI Discussion — belum aktif, ditampilkan jujur sebagai "segera hadir". */}
        <div
          aria-disabled="true"
          className="flex cursor-not-allowed items-center justify-between gap-2 rounded-[12px] px-2.5 py-1.5 opacity-70"
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-[var(--ink)]">
              {aiDiscussion.label}
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-snug text-[var(--muted-2)]">
              {aiDiscussion.description}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--gold-ink-2)]">
            {aiDiscussion.comingSoonLabel}
          </span>
        </div>
      </div>
    );
  }

  function renderSkillMenu() {
    if (!isStudyModeMenuOpen) {
      return null;
    }

    return (
      <div className="scroll absolute bottom-full right-0 z-30 mb-2 max-h-[min(60vh,340px)] w-[min(88vw,300px)] overflow-y-auto overscroll-contain rounded-[18px] bg-[var(--pure-white)] p-1.5 text-sm shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10">
        {skillsLoading && !skills.length && (
          <div className="px-2.5 py-2 text-[11px] font-semibold text-[var(--muted-3)]">
            Memuat skill...
          </div>
        )}
        {skills.map((skill) => {
          const isAllowed = canAccessTier(usageSnapshot?.tier, skill.minTier);
          const isSelected = selectedSkillId === skill.id;

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => selectSkill(skill.id)}
              title={
                isAllowed
                  ? (skill.category ?? skill.name)
                  : getLockedSkillRequirement(skill)
              }
              className={
                isSelected
                  ? "flex w-full items-center gap-2 rounded-[10px] bg-[var(--brand)]/10 px-2.5 py-1.5 text-left"
                  : "flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition hover:bg-[var(--surface-alt)]"
              }
            >
              <span className="truncate text-[13px] font-semibold text-[var(--ink)]">
                {skill.name}
              </span>
              {skill.slashCommand && (
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted-3)]">
                  {skill.slashCommand}
                </span>
              )}
              <span className="ml-auto flex shrink-0 items-center gap-1">
                {!isAllowed && (
                  <Icon name="lock" className="h-3 w-3 text-[var(--gold-ink-2)]" />
                )}
                {isSelected && (
                  <Icon name="check" className="h-3.5 w-3.5 text-[var(--brand)]" />
                )}
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
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)]/10 px-3 py-1 text-xs font-bold text-[var(--brand)]">
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
              <span className="text-[10px] font-bold text-[var(--muted-2)]">
                {selectedSkillBadge}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSkillId(null)}
            className="transition hover:text-[var(--brand-hover-text)]"
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
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pure-white)] px-3 py-1 text-xs font-bold text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)]"
          aria-label="Pilih model AI"
          aria-expanded={isModelMenuOpen}
        >
          <Icon name="idea" className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {selectedModelInfo.shortLabel}
          </span>
          <span className="text-[10px] text-[var(--muted-3)]">⌄</span>
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
      <div className="scroll absolute bottom-full left-0 z-30 mb-2 max-h-[min(60vh,340px)] w-[min(88vw,320px)] overflow-y-auto overscroll-contain rounded-[18px] bg-[var(--pure-white)] p-1.5 text-sm shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10">
        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3)]">
          Skill sekali pakai
        </div>
        {slashMatches.length === 0 ? (
          <div className="px-2.5 py-2 text-[11px] font-semibold text-[var(--muted-3)]">
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
                title={
                  isAllowed
                    ? (skill.category ?? skill.name)
                    : getLockedSkillRequirement(skill)
                }
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition hover:bg-[var(--surface-alt)]"
              >
                <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--brand)]">
                  {skill.slashCommand}
                </span>
                <span className="truncate text-[13px] text-[var(--ink)]">
                  {skill.name}
                </span>
                {!isAllowed && (
                  <Icon name="lock" className="ml-auto h-3 w-3 shrink-0 text-[var(--gold-ink-2)]" />
                )}
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
      <div className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-ink-2)]">
        <Icon name="idea" className="h-4 w-4" />
        <span className="max-w-[160px] truncate">
          Sekali pakai: {messageSkillOverride.name}
        </span>
        <button
          type="button"
          onClick={() => setMessageSkillOverrideId(null)}
          className="transition hover:text-[var(--ink)]"
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
      <div className="w-full rounded-[20px] bg-[var(--surface)] p-4 shadow-[0_8px_24px_-20px_rgba(11,61,42,0.5)] ring-1 ring-[var(--brand-deep-line)]/14 focus-within:ring-[var(--brand)]">
        {renderAttachmentChips("mb-3")}
        {renderComposerInput(
          "h-20 w-full bg-transparent text-xl text-[var(--ink)] outline-none placeholder:text-[var(--muted-3)]",
          "w-full",
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[var(--muted-2)]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="inline-flex items-center gap-2 rounded-full px-2 py-2 font-bold transition hover:bg-[var(--surface-border)]"
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
            className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand)]/40"
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
    <div className="bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent p-3 sm:p-4">
      {renderAttachmentChips("mb-2")}
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {renderModelTrigger()}
          {renderSkillChip()}
          {renderOverrideChip()}
        </div>

        <div className="flex items-center gap-2 rounded-[16px] bg-[var(--surface)] px-3 py-2 shadow-[0_8px_24px_-20px_rgba(11,61,42,0.5)] ring-1 ring-[var(--brand-deep-line)]/14 focus-within:ring-[var(--brand)] sm:gap-3 sm:px-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--surface-border)]"
              title="Add photos & files"
              aria-label="Add photos & files"
            >
              <span aria-hidden="true" className="text-2xl leading-none">+</span>
            </button>
            {renderAttachMenu()}
          </div>

          {renderComposerInput(
            "w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-3)] sm:text-base",
            "min-w-0 flex-1",
          )}

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim() || !hasMessageQuota}
            aria-label="Kirim pesan"
            title="Kirim pesan"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand)]/40"
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

        {contextUsage && contextUsage.percentUsed >= 1 && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-semibold">
            <span
              className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--brand-deep)]/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={contextUsage.percentUsed}
              aria-label="Context window terpakai"
            >
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${
                  contextUsage.isNearLimit ? "bg-[var(--gold-ink)]" : "bg-[var(--brand)]"
                }`}
                style={{ width: `${Math.max(contextUsage.percentUsed, 2)}%` }}
              />
            </span>
            <span
              className={
                contextUsage.isNearLimit ? "text-[var(--gold-ink)]" : "text-[var(--muted)]"
              }
            >
              Konteks {contextUsage.percentUsed}% ·{" "}
              {formatTokenCount(contextUsage.usedTokens)}/
              {formatTokenCount(contextUsage.windowTokens)} token
              {contextUsage.isNearLimit
                ? " · pesan terlama mulai dilepas"
                : ""}
            </span>
          </div>
        )}

        <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--muted-3)]">
          {CHAT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

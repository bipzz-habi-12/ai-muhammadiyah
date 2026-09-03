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
  modelEngines,
  modelProviderLabels,
  type EffortLevel,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";
import {
  formatTokenCount,
  type ContextUsage,
} from "@/lib/ai/context-window";

// Shared disclaimer copy (reused by the welcome hero and the active composer).
export const CHAT_DISCLAIMER =
  "M-Agent dapat keliru. Selalu verifikasi informasi penting, terutama dalam urusan ibadah & syariah.";

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
  // `keepMenuOpen` dipakai pemilih dua kolom: memilih nama model TIDAK menutup
  // menu, supaya pengguna bisa langsung memilih mesinnya di kolom kanan.
  selectModel: (model: PlanModelId, keepMenuOpen?: boolean) => void;
  allowedModels: string[];

  // mesin per model (Langkah 54)
  selectedProvider: ModelProviderId;
  selectProvider: (model: PlanModelId, provider: ModelProviderId) => void;
  availableProviders: ModelProviderId[];
  selectedEngineLabel: string;
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
  selectedProvider,
  selectProvider,
  availableProviders,
  selectedEngineLabel,
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
  // Model yang mesinnya sedang ditampilkan di kolom kanan. Tidak sama dengan
  // model terpilih: pengguna boleh mengintip mesin milik model lain sebelum
  // memutuskan.
  const [previewModel, setPreviewModel] = useState<PlanModelId>(selectedModel);

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

  // Arah buka menu (model / skill / slash picker).
  //
  // Varian "active" duduk menempel di kaki layar, jadi menunya harus membuka ke
  // ATAS. Varian "welcome" TIDAK: ia berada di tengah kolom sambutan yang bisa
  // di-scroll, sehingga menu yang membuka ke atas terpotong oleh tepi atas
  // kontainer scroll — bukan sekadar keluar viewport, jadi menggulung ke atas
  // pun tidak memunculkannya. Di sana menu membuka ke BAWAH, ke arah ruang yang
  // memang ada.
  const menuAnchor =
    variant === "welcome" ? "top-full mt-2" : "bottom-full mb-2";
  // Tingginya juga dibatasi berbeda: di varian sambutan menu harus muat di
  // ruang yang tersisa DI BAWAH composer sebelum tepi kontainer scroll, bukan
  // setinggi layar.
  const menuMaxHeight =
    variant === "welcome" ? "max-h-[min(42vh,300px)]" : "max-h-[min(56vh,340px)]";

  function toggleModelMenu() {
    setIsStudyModeMenuOpen(false);
    // Tiap kali menu dibuka, kolom kanan kembali ke model yang sedang dipakai.
    setPreviewModel(selectedModel);
    setIsModelMenuOpen((isOpen) => !isOpen);
  }

  function toggleSkillMenu() {
    setIsModelMenuOpen(false);
    setIsStudyModeMenuOpen((isOpen) => !isOpen);
  }

  // Popover model — DUA KOLOM MENYAMPING (Langkah 54).
  //
  // Kiri: nama model. Kanan: mesin yang menjalankan model yang sedang disorot.
  // Sengaja bukan akordeon yang membuka ke bawah: dengan 4 model x 3 mesin,
  // versi menurun jadi daftar 12 baris yang harus digulung, dan pengguna
  // kehilangan konteks "aku sedang melihat mesin milik model yang mana".
  //
  // Upaya / Pemikiran / AI Discussion tetap di kaki popover selebar penuh —
  // ketiganya berlaku lintas model, jadi tidak masuk kolom mana pun.
  function renderModelMenu() {
    if (!isModelMenuOpen) {
      return null;
    }

    const engines = modelEngines[previewModel];

    return (
      <div
        className={`scroll absolute ${menuAnchor} ${menuMaxHeight} left-0 z-30 w-[min(94vw,468px)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] text-sm shadow-xl`}
      >
        <div className="flex items-stretch">
          <div className="flex w-[150px] shrink-0 flex-col gap-0.5 border-r border-[var(--hairline)] p-1.5">
            <div className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
              Model
            </div>
            {modelOptions.map((model) => {
              const modelInfo = modelCatalog[model];
              const isAllowed = allowedModels.includes(model);
              const isPreviewed = previewModel === model;
              const isSelected = selectedModel === model;

              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => {
                    setPreviewModel(model);
                    selectModel(model, true);
                  }}
                  onMouseEnter={() => setPreviewModel(model)}
                  title={
                    isAllowed
                      ? modelInfo.description
                      : getLockedModelRequirement(model)
                  }
                  className={
                    isPreviewed
                      ? "flex items-center gap-1.5 rounded-[10px] bg-[var(--brand-soft)] px-2.5 py-2 text-left"
                      : "flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-[var(--surface-alt)]"
                  }
                >
                  <span
                    className={
                      isSelected
                        ? "min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--brand)]"
                        : "min-w-0 flex-1 truncate text-[13px] text-[var(--ink-soft)]"
                    }
                  >
                    {modelInfo.label}
                  </span>
                  {!isAllowed && (
                    <Icon
                      name="lock"
                      className="h-3 w-3 shrink-0 text-[var(--gold-ink-2)]"
                    />
                  )}
                  {isSelected && (
                    <Icon
                      name="check"
                      className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-1.5">
            <div className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-3)]">
              Mesin {modelCatalog[previewModel].label}
            </div>
            {engines.map((engine) => {
              const isReady = availableProviders.includes(engine.provider);
              const isCurrent =
                selectedModel === previewModel &&
                selectedProvider === engine.provider;

              return (
                <button
                  key={engine.provider}
                  type="button"
                  onClick={() => selectProvider(previewModel, engine.provider)}
                  disabled={!isReady}
                  title={
                    isReady
                      ? engine.engineLabel
                      : modelProviderLabels[engine.provider] +
                        " belum terpasang di server."
                  }
                  className={
                    isCurrent
                      ? "flex items-center gap-2 rounded-[10px] bg-[var(--brand-soft)] px-2.5 py-2 text-left"
                      : isReady
                        ? "flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-[var(--surface-alt)]"
                        : "flex cursor-not-allowed items-center gap-2 rounded-[10px] px-2.5 py-2 text-left opacity-55"
                  }
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium text-[var(--ink)]">
                      {engine.engineLabel}
                    </span>
                    <span className="truncate text-[10.5px] text-[var(--muted-3)]">
                      {modelProviderLabels[engine.provider]}
                    </span>
                  </span>
                  {!isReady && (
                    <span className="shrink-0 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--gold-ink-2)]">
                      Belum tersedia
                    </span>
                  )}
                  {isCurrent && (
                    <Icon
                      name="check"
                      className="h-4 w-4 shrink-0 text-[var(--brand)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--hairline)] p-1.5">
          {/* Baris "Upaya" — membuka submenu level Rendah..Ultra. */}
          <button
            type="button"
            onClick={() => setIsEffortMenuOpen((isOpen) => !isOpen)}
            aria-expanded={isEffortMenuOpen}
            className="flex w-full items-center justify-between gap-3 rounded-[12px] px-2.5 py-1.5 text-left transition hover:bg-[var(--surface-alt)]"
          >
            <span className="text-[13px] font-medium text-[var(--ink)]">Upaya</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted-2)]">
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
                      ? "flex w-full items-center justify-between gap-2 rounded-[10px] bg-[var(--brand-soft)] px-2.5 py-1 text-left"
                      : "flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1 text-left transition hover:bg-[var(--surface-border)]"
                  }
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--ink)]">
                      {level.label}
                    </span>
                    {level.isDefault && (
                      <span className="rounded-full bg-[var(--surface-border)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted-2)]">
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
              <span className="block text-[13px] font-medium text-[var(--ink)]">
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
                  ? "relative h-6 w-11 shrink-0 rounded-full bg-[var(--brand)] transition"
                  : "relative h-6 w-11 shrink-0 rounded-full bg-[var(--surface-border)] transition"
              }
            >
              <span
                className={
                  isThinkingEnabled
                    ? "absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-[var(--pure-white)] transition-all"
                    : "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--pure-white)] transition-all"
                }
              />
            </button>
          </div>

          <div className="my-1 h-px bg-[var(--hairline)]" />

          {/* AI Discussion — belum aktif, ditampilkan jujur sebagai "segera hadir". */}
          <div
            aria-disabled="true"
            className="flex cursor-not-allowed items-center justify-between gap-2 rounded-[12px] px-2.5 py-1.5 opacity-70"
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[var(--ink)]">
                {aiDiscussion.label}
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-[var(--muted-2)]">
                {aiDiscussion.description}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--gold-ink-2)]">
              {aiDiscussion.comingSoonLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  function renderSkillMenu() {
    if (!isStudyModeMenuOpen) {
      return null;
    }

    return (
      <div className={`scroll absolute ${menuAnchor} ${menuMaxHeight} right-0 z-30 w-[min(88vw,300px)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 text-sm shadow-xl`}>
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
                  ? "flex w-full items-center gap-2 rounded-[10px] bg-[var(--brand-soft)] px-2.5 py-1.5 text-left"
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
        <div className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[var(--hairline)] pl-3.5 pr-2.5 text-[13.5px] font-medium text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]">
          <button
            type="button"
            onClick={toggleSkillMenu}
            className="inline-flex items-center gap-1.5"
            aria-label="Pilih skill"
          >
            <Icon name="book" className="h-[15px] w-[15px] text-[var(--muted-2)]" />
            <span className="max-w-[120px] truncate">
              {selectedSkill ? selectedSkill.name : "Memuat..."}
            </span>
            {selectedSkillBadge && (
              <span className="text-[10px] text-[var(--muted-3)]">
                {selectedSkillBadge}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSkillId(null)}
            className="grid h-6 w-6 place-items-center rounded-full text-[var(--muted-3)] transition hover:text-[var(--ink)]"
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
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3.5 text-[13.5px] font-medium text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]"
          aria-label="Pilih model AI"
          aria-expanded={isModelMenuOpen}
        >
          <span className="max-w-[150px] truncate">
            {selectedModelInfo.shortLabel}
          </span>
          <span className="hidden max-w-[130px] truncate text-[11px] text-[var(--muted-3)] sm:inline">
            {selectedEngineLabel}
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3 w-3 text-[var(--muted-3)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
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
      <div className={`scroll absolute ${menuAnchor} ${menuMaxHeight} left-0 z-30 w-[min(88vw,320px)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 text-sm shadow-xl`}>
        <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-3)]">
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
                <span className="shrink-0 font-mono text-[11px] font-medium text-[var(--brand)]">
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

  // Pil skill sekali-pakai saat "/" mengarmingkan satu skill untuk pesan
  // berikutnya. Dulu emas — sekarang hijau lembut: emas turun pangkat jadi
  // penanda kategori saja, dan hijau adalah satu-satunya warna "aktif".
  function renderOverrideChip() {
    if (!messageSkillOverride) {
      return null;
    }

    return (
      <div className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[var(--brand-soft)] pl-3.5 pr-2.5 text-[13.5px] font-semibold text-[var(--brand)]">
        <span className="max-w-[160px] truncate font-mono text-[13px]">
          {messageSkillOverride.slashCommand ?? messageSkillOverride.name}
        </span>
        <button
          type="button"
          onClick={() => setMessageSkillOverrideId(null)}
          className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-[var(--surface-alt)]"
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
              : "Tanyakan apa saja kepada M-Agent... (ketik / untuk skill)"
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
      <div className="w-full rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 transition focus-within:border-[var(--brand)]">
        {renderAttachmentChips("mb-3")}
        {renderComposerInput(
          "h-12 w-full bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted-3)]",
          "w-full",
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--hairline)] text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)]"
              title="Lampirkan foto & file"
              aria-label="Lampirkan foto & file"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[19px] w-[19px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
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
            className="ml-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand)]/40"
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
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1 sm:px-4">
      {renderAttachmentChips("mb-2")}
      <div className="mx-auto w-full max-w-[720px]">
        {/* Kontrol model/skill pindah KE DALAM kartu composer: dulu ia baris
            terpisah di atas kartu, jadi ada dua blok bersaing di kaki layar. */}
        <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-3.5 transition focus-within:border-[var(--brand)]">
          {renderComposerInput(
            "w-full bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted-3)]",
            "w-full",
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen((isOpen) => !isOpen)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--hairline)] text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)]"
                title="Lampirkan foto & file"
                aria-label="Lampirkan foto & file"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-[19px] w-[19px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
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
              className="ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand)]/40"
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
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        {contextUsage && contextUsage.percentUsed >= 1 && (
          <div className="mt-2.5 flex items-center justify-center gap-2 text-[11.5px]">
            <span
              className="h-1 w-24 overflow-hidden rounded-full bg-[var(--surface-border)]"
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

        <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-[var(--muted-3)]">
          {CHAT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

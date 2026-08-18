"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Icon } from "@/components/icons";
import { useBilling } from "@/hooks/useBilling";
import { describeBillingSubscription } from "@/lib/subscriptions/billing";
import type { SettingsTab } from "@/lib/mappers/types";
import { type UserMemory } from "@/lib/memory/user-memory";
import type { KnowledgeSource } from "@/lib/knowledge";
import {
  FREE_CUSTOM_SKILL_LIMIT,
  getSkillBadge,
  type Skill,
} from "@/lib/skills";
import {
  modelCatalog,
  type PlanModelId,
  type SubscriptionPlan,
} from "@/lib/subscriptions/plans";
import { formatTokenCount } from "@/lib/ai/context-window";
import {
  formatResetCountdown,
  type UsageSnapshot,
} from "@/lib/usage/limits";

const settingsTabs: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "personalization", label: "Personalization" },
  { id: "skills", label: "Skill saya" },
  { id: "subscription", label: "Subscription" },
  { id: "data", label: "Data Controls" },
  { id: "security", label: "Security" },
  { id: "documents", label: "Documents" },
  { id: "knowledge", label: "Knowledge Base" },
];

const emptySkillForm = {
  name: "",
  slashCommand: "",
  category: "",
  systemPrompt: "",
};

const languageOptions = [
  { label: "Auto", value: "" },
  { label: "Indonesian", value: "Bahasa Indonesia sederhana" },
  { label: "English", value: "English" },
];

interface SettingsModalProps {
  isSettingsOpen: boolean;
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>;
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: Dispatch<SetStateAction<SettingsTab>>;

  // General tab
  profileDraft: UserMemory;
  updateProfileDraft: <K extends keyof UserMemory>(
    key: K,
    value: UserMemory[K],
  ) => void;
  modelOptions: PlanModelId[];
  skills: Skill[];
  usageSnapshot: UsageSnapshot | null;

  // Skills ("Skill saya") tab
  userId: string | null;
  createCustomSkill: (payload: Record<string, unknown>) => Promise<boolean>;
  updateCustomSkill: (
    id: string,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  deleteCustomSkill: (id: string) => Promise<boolean>;
  isMutatingSkill: boolean;
  skillMutationError: string;
  setSkillMutationError: Dispatch<SetStateAction<string>>;

  // Personalization tab
  favoriteSubjectsDraft: string;
  setFavoriteSubjectsDraft: Dispatch<SetStateAction<string>>;

  // Subscription tab
  currentPlan: SubscriptionPlan | null;
  currentTierLabel: string;

  // Data tab
  resetMemory: () => void;
  deleteAllChatHistory: () => Promise<void>;
  exportChatHistoryPlaceholder: () => void;
  settingsDataMessage: string;

  // Security tab
  userEmail: string;
  handleLogout: () => Promise<void>;
  isLoggingOut: boolean;

  // Knowledge tab
  isLoadingKnowledge: boolean;
  knowledgeSources: KnowledgeSource[];
  isKnowledgeAdmin: boolean;
  knowledgeTitle: string;
  setKnowledgeTitle: Dispatch<SetStateAction<string>>;
  knowledgeCategory: string;
  setKnowledgeCategory: Dispatch<SetStateAction<string>>;
  isUploadingKnowledge: boolean;
  handleKnowledgeUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  knowledgeError: string;
  knowledgeMessage: string;
  supportedDocumentAccept: string;

  // General/Personalization shared footer
  profileError: string;
  profileSavedMessage: string;
  saveLearningProfile: () => Promise<void>;
  isSavingProfile: boolean;
}

export default function SettingsModal({
  isSettingsOpen,
  setIsSettingsOpen,
  activeSettingsTab,
  setActiveSettingsTab,
  profileDraft,
  updateProfileDraft,
  modelOptions,
  skills,
  usageSnapshot,
  userId,
  createCustomSkill,
  updateCustomSkill,
  deleteCustomSkill,
  isMutatingSkill,
  skillMutationError,
  setSkillMutationError,
  favoriteSubjectsDraft,
  setFavoriteSubjectsDraft,
  currentPlan,
  currentTierLabel,
  resetMemory,
  deleteAllChatHistory,
  exportChatHistoryPlaceholder,
  settingsDataMessage,
  userEmail,
  handleLogout,
  isLoggingOut,
  isLoadingKnowledge,
  knowledgeSources,
  isKnowledgeAdmin,
  knowledgeTitle,
  setKnowledgeTitle,
  knowledgeCategory,
  setKnowledgeCategory,
  isUploadingKnowledge,
  handleKnowledgeUpload,
  knowledgeError,
  knowledgeMessage,
  supportedDocumentAccept,
  profileError,
  profileSavedMessage,
  saveLearningProfile,
  isSavingProfile,
}: SettingsModalProps) {
  const router = useRouter();
  const {
    billingState,
    loadBillingState,
    manageBilling,
    isPortalPending,
    billingError,
  } = useBilling();

  // "Skill saya" tab: local form + edit/delete state. Kept here (not threaded
  // through page.tsx) because it is only used inside this modal.
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [confirmDeleteSkillId, setConfirmDeleteSkillId] = useState<
    string | null
  >(null);

  const ownSkills = skills.filter(
    (skill) => skill.isCustom && skill.ownerId === userId,
  );
  const platformSkills = skills.filter((skill) => skill.ownerId === null);
  const isFreeTier = (usageSnapshot?.tier ?? "free") === "free";
  const isCustomLimitReached =
    isFreeTier && ownSkills.length >= FREE_CUSTOM_SKILL_LIMIT;
  const canSubmitSkill =
    Boolean(skillForm.name.trim()) &&
    Boolean(skillForm.systemPrompt.trim()) &&
    !isMutatingSkill &&
    (Boolean(editingSkillId) || !isCustomLimitReached);

  function resetSkillForm() {
    setSkillForm(emptySkillForm);
    setEditingSkillId(null);
    setSkillMutationError("");
  }

  function startEditSkill(skill: Skill) {
    setEditingSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      slashCommand: skill.slashCommand ?? "",
      category: skill.category ?? "",
      systemPrompt: skill.systemPrompt,
    });
    setConfirmDeleteSkillId(null);
    setSkillMutationError("");
  }

  async function submitSkill() {
    const payload = {
      name: skillForm.name,
      slashCommand: skillForm.slashCommand,
      category: skillForm.category,
      systemPrompt: skillForm.systemPrompt,
    };
    const ok = editingSkillId
      ? await updateCustomSkill(editingSkillId, payload)
      : await createCustomSkill(payload);
    if (ok) {
      resetSkillForm();
    }
  }

  async function removeSkill(id: string) {
    const ok = await deleteCustomSkill(id);
    if (ok) {
      setConfirmDeleteSkillId(null);
      if (editingSkillId === id) {
        resetSkillForm();
      }
    }
  }

  // Status langganan hanya diambil saat tab Subscription dibuka, bukan tiap
  // kali modal muncul.
  useEffect(() => {
    if (isSettingsOpen && activeSettingsTab === "subscription") {
      void loadBillingState();
    }
  }, [isSettingsOpen, activeSettingsTab, loadBillingState]);

  if (!isSettingsOpen) {
    return null;
  }

  const billingNote = describeBillingSubscription(billingState);
  const canManageSubscription = Boolean(
    billingState.isStripeConfigured && billingState.subscription,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[var(--scrim)]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[24px] bg-[var(--surface-panel)] shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10 sm:max-w-5xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--brand-deep-line)]/10 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-serif text-[26px] font-normal text-[var(--ink-deep)]">Settings</h2>
            <p className="mt-1 text-sm text-[var(--muted-2)]">
              Preferensi M-Agent, akun, data, dan dokumen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Tutup Settings"
            title="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--surface-border)]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              x
            </span>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[230px_1fr]">
          <nav className="flex gap-2 overflow-x-auto border-b border-[var(--brand-deep-line)]/10 bg-[var(--surface-alt)] p-3 md:block md:space-y-1 md:overflow-visible md:border-b-0 md:border-r">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={
                  activeSettingsTab === tab.id
                    ? "shrink-0 rounded-2xl bg-[var(--surface)] px-4 py-3 text-left text-sm font-bold text-[var(--brand)] ring-1 ring-[var(--brand-deep-line)]/10 md:w-full"
                    : "shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[var(--muted-2)] transition hover:bg-[var(--surface)] md:w-full"
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
            {activeSettingsTab === "general" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Theme
                  </span>
                  <select
                    value={profileDraft.themePreference}
                    onChange={(event) =>
                      updateProfileDraft(
                        "themePreference",
                        event.target.value as UserMemory["themePreference"],
                      )
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Language
                  </span>
                  <select
                    value={profileDraft.preferredLanguage}
                    onChange={(event) =>
                      updateProfileDraft("preferredLanguage", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Default AI model
                  </span>
                  <select
                    value={profileDraft.defaultModel}
                    onChange={(event) =>
                      updateProfileDraft(
                        "defaultModel",
                        event.target.value as UserMemory["defaultModel"],
                      )
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                  >
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {modelCatalog[model].label}
                      </option>
                    ))}
                  </select>
                </label>

              </div>
            )}

            {activeSettingsTab === "personalization" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Learning Profile
                  </span>
                  <input
                    value={profileDraft.displayName}
                    onChange={(event) =>
                      updateProfileDraft("displayName", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                    placeholder="Nama panggilan"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Jenjang sekolah
                  </span>
                  <input
                    value={profileDraft.schoolLevel}
                    onChange={(event) =>
                      updateProfileDraft("schoolLevel", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                    placeholder="Kelas 9 SMP"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Explanation style
                  </span>
                  <select
                    value={profileDraft.preferredExplanationStyle}
                    onChange={(event) =>
                      updateProfileDraft(
                        "preferredExplanationStyle",
                        event.target.value,
                      )
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                  >
                    <option value="">Default</option>
                    <option value="Singkat, langsung ke inti, lalu contoh.">
                      Singkat + contoh
                    </option>
                    <option value="Pelan-pelan dengan langkah berurutan.">
                      Langkah berurutan
                    </option>
                    <option value="Gunakan analogi sederhana dan latihan kecil.">
                      Analogi + latihan
                    </option>
                    <option value="Lebih mendalam, cocok untuk diskusi kajian.">
                      Mendalam
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Favorite subjects
                  </span>
                  <input
                    value={favoriteSubjectsDraft}
                    onChange={(event) =>
                      setFavoriteSubjectsDraft(event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                    placeholder="Matematika, Al-Islam"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[var(--ink)]">
                    Learning goals
                  </span>
                  <textarea
                    value={profileDraft.learningGoals}
                    onChange={(event) =>
                      updateProfileDraft("learningGoals", event.target.value)
                    }
                    className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                    placeholder="Ingin lebih paham matematika dan latihan menjawab soal."
                  />
                </label>
              </div>
            )}

            {activeSettingsTab === "skills" && (
              <div className="space-y-5">
                <div className="rounded-[24px] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10">
                  Skill adalah instruksi fokus yang bisa kamu aktifkan per pesan
                  lewat perintah{" "}
                  <span className="font-mono text-[var(--brand)]">/</span> di kolom
                  chat. Buat skill sendiri untuk gaya jawaban atau bidang yang
                  sering kamu pakai.{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    Setiap skill custom otomatis dijalankan dalam mode pakar
                    mendalam
                  </span>{" "}
                  — cukup tulis fokusnya, AI akan menambah metode, struktur, dan
                  kehati-hatian.
                </div>

                {/* Create / edit form */}
                <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[var(--ink)]">
                      {editingSkillId ? "Edit skill" : "Buat skill baru"}
                    </p>
                    {isFreeTier && (
                      <span
                        className={
                          isCustomLimitReached && !editingSkillId
                            ? "rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-ink-2)]"
                            : "rounded-full bg-[var(--brand)]/10 px-3 py-1 text-xs font-bold text-[var(--brand)]"
                        }
                      >
                        {ownSkills.length}/{FREE_CUSTOM_SKILL_LIMIT} skill custom
                      </span>
                    )}
                  </div>

                  {isCustomLimitReached && !editingSkillId ? (
                    <div className="mt-3 rounded-2xl bg-[var(--gold)]/25 p-3 text-sm font-semibold text-[var(--gold-ink-2)]">
                      Paket Free dibatasi {FREE_CUSTOM_SKILL_LIMIT} skill custom.
                      Hapus salah satu, atau{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/plans")}
                        className="underline underline-offset-2"
                      >
                        upgrade paket
                      </button>{" "}
                      untuk membuat lebih banyak.
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          Nama skill
                        </span>
                        <input
                          value={skillForm.name}
                          onChange={(event) =>
                            setSkillForm((form) => ({
                              ...form,
                              name: event.target.value,
                            }))
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[var(--pure-white)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                          placeholder="Analis Fiqih"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          Perintah slash{" "}
                          <span className="font-normal text-[var(--muted-3)]">
                            (opsional)
                          </span>
                        </span>
                        <input
                          value={skillForm.slashCommand}
                          onChange={(event) =>
                            setSkillForm((form) => ({
                              ...form,
                              slashCommand: event.target.value,
                            }))
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[var(--pure-white)] px-4 font-mono text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                          placeholder="/fiqih"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          Kategori{" "}
                          <span className="font-normal text-[var(--muted-3)]">
                            (opsional)
                          </span>
                        </span>
                        <input
                          value={skillForm.category}
                          onChange={(event) =>
                            setSkillForm((form) => ({
                              ...form,
                              category: event.target.value,
                            }))
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[var(--pure-white)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                          placeholder="Islamic Studies"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          Instruksi skill
                        </span>
                        <textarea
                          value={skillForm.systemPrompt}
                          onChange={(event) =>
                            setSkillForm((form) => ({
                              ...form,
                              systemPrompt: event.target.value,
                            }))
                          }
                          className="mt-2 min-h-32 w-full resize-y rounded-2xl bg-[var(--pure-white)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                          placeholder="Jawab sebagai analis fiqih: jelaskan dalil, sebutkan pandangan Majelis Tarjih bila relevan, dan bedakan mana yang ijtihad."
                        />
                      </label>

                      {skillMutationError && (
                        <p className="rounded-2xl bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger-ink)] sm:col-span-2">
                          {skillMutationError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 sm:col-span-2">
                        <button
                          type="button"
                          onClick={submitSkill}
                          disabled={!canSubmitSkill}
                          className="h-11 rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand)]/40"
                        >
                          {isMutatingSkill
                            ? "Menyimpan..."
                            : editingSkillId
                              ? "Simpan perubahan"
                              : "Buat skill"}
                        </button>
                        {editingSkillId && (
                          <button
                            type="button"
                            onClick={resetSkillForm}
                            disabled={isMutatingSkill}
                            className="h-11 rounded-full bg-[var(--pure-white)] px-6 text-sm font-bold text-[var(--ink)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)] disabled:opacity-60"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User's own custom skills */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Skill custom-mu ({ownSkills.length})
                  </p>
                  {ownSkills.length === 0 ? (
                    <div className="rounded-[22px] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10">
                      Belum ada skill custom. Buat satu di atas untuk mulai.
                    </div>
                  ) : (
                    ownSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-[22px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ink)]">
                              {skill.name}
                              {skill.slashCommand && (
                                <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--brand)]">
                                  {skill.slashCommand}
                                </span>
                              )}
                            </p>
                            {skill.category && (
                              <p className="mt-1 text-xs font-semibold text-[var(--muted-3)]">
                                {skill.category}
                              </p>
                            )}
                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted-2)]">
                              {skill.systemPrompt}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => startEditSkill(skill)}
                              className="rounded-full bg-[var(--pure-white)] px-4 py-2 text-xs font-bold text-[var(--brand)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)]"
                            >
                              Edit
                            </button>
                            {confirmDeleteSkillId === skill.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill.id)}
                                  disabled={isMutatingSkill}
                                  className="rounded-full bg-[var(--danger-solid)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--danger-solid-hover)] disabled:opacity-60"
                                >
                                  Ya, hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSkillId(null)}
                                  className="rounded-full bg-[var(--pure-white)] px-4 py-2 text-xs font-bold text-[var(--ink)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)]"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSkillId(skill.id)}
                                className="rounded-full bg-[var(--pure-white)] px-4 py-2 text-xs font-bold text-[var(--danger)] ring-1 ring-[var(--danger-bg)] transition hover:bg-[var(--danger-bg)]"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Platform-provided skills (read-only reference) */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Skill bawaan platform
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {platformSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-[18px] bg-[var(--surface)] p-3 ring-1 ring-[var(--brand-deep-line)]/10"
                      >
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ink)]">
                          {skill.name}
                          {skill.slashCommand && (
                            <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--brand)]">
                              {skill.slashCommand}
                            </span>
                          )}
                          <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--brand)]">
                            {getSkillBadge(skill, usageSnapshot?.tier)}
                          </span>
                        </p>
                        {skill.category && (
                          <p className="mt-1 text-xs font-semibold text-[var(--muted-3)]">
                            {skill.category}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === "subscription" && (
              <div className="space-y-4">
                <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                  <p className="text-sm font-bold text-[var(--brand)]">
                    Current plan
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-[var(--ink)]">
                    {currentPlan?.name ?? currentTierLabel}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                    {currentPlan?.tagline ?? "Status paket sedang dimuat."}
                  </p>
                  {billingNote && (
                    <p className="mt-3 rounded-2xl bg-[var(--brand)]/[0.07] px-3 py-2 text-sm font-semibold text-[var(--brand)]">
                      {billingNote}
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      { label: "Token · 5 jam", window: usageSnapshot?.tokens.session },
                      { label: "Token · mingguan", window: usageSnapshot?.tokens.weekly },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[22px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10"
                    >
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--brand)]">
                        {item.window ? `${item.window.percentRemaining}%` : "--"}
                      </p>
                      <p className="text-sm text-[var(--muted-2)]">tersisa</p>
                      <div
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--brand)]/10"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.window?.percentRemaining ?? 0}
                        aria-label={`Kuota tersisa ${item.label}`}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-500"
                          style={{ width: `${item.window?.percentRemaining ?? 0}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {item.window
                          ? `${formatTokenCount(item.window.used)}/${formatTokenCount(item.window.limit)} token · reset ${formatResetCountdown(item.window.resetsAt)}`
                          : "Memuat…"}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-[var(--muted)]">
                  Satu kuota untuk semuanya, dihitung dalam token apa adanya:
                  makin besar konteks yang dibawa percakapan (riwayat panjang,
                  dokumen), makin banyak token yang terpakai per pesan.
                </p>
                {billingError && (
                  <p
                    role="alert"
                    className="rounded-2xl bg-[var(--gold)]/25 px-4 py-3 text-sm font-semibold text-[var(--gold-ink-2)]"
                  >
                    {billingError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/plans")}
                    className="h-12 rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
                  >
                    {canManageSubscription ? "Lihat semua paket" : "Upgrade plan"}
                  </button>
                  {canManageSubscription && (
                    <button
                      type="button"
                      onClick={manageBilling}
                      disabled={isPortalPending}
                      className="h-12 rounded-full px-6 text-sm font-bold text-[var(--brand)] ring-1 ring-[var(--brand-deep-line)]/15 transition hover:bg-[var(--brand)]/[0.07] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPortalPending
                        ? "Membuka…"
                        : "Kelola langganan & invoice"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === "data" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={resetMemory}
                  className="flex w-full items-center justify-between rounded-[22px] bg-[var(--surface)] p-4 text-left ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-alt)]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[var(--ink)]">
                      Clear current chat
                    </span>
                    <span className="mt-1 block text-sm text-[var(--muted-2)]">
                      Mulai obrolan kosong tanpa menghapus riwayat.
                    </span>
                  </span>
                  <span className="text-xl text-[var(--brand)]">+</span>
                </button>
                <button
                  type="button"
                  onClick={deleteAllChatHistory}
                  className="flex w-full items-center justify-between rounded-[22px] bg-[var(--surface)] p-4 text-left ring-1 ring-[var(--danger-bg)] transition hover:bg-[var(--danger-bg)]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[var(--danger)]">
                      Delete all chat history
                    </span>
                    <span className="mt-1 block text-sm text-[var(--muted-2)]">
                      Menghapus semua conversation milik akun ini.
                    </span>
                  </span>
                  <Icon name="trash" className="h-5 w-5 text-[var(--danger)]" />
                </button>
                <button
                  type="button"
                  onClick={exportChatHistoryPlaceholder}
                  className="flex w-full items-center justify-between rounded-[22px] bg-[var(--surface)] p-4 text-left ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-alt)]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[var(--ink)]">
                      Export active chat
                    </span>
                    <span className="mt-1 block text-sm text-[var(--muted-2)]">
                      Unduh Markdown dengan format pesan tetap terjaga.
                    </span>
                  </span>
                  <span className="text-sm font-bold text-[var(--brand)]">MD</span>
                </button>
                {settingsDataMessage && (
                  <p className="rounded-2xl bg-[var(--brand)]/10 p-3 text-sm font-semibold text-[var(--brand)]">
                    {settingsDataMessage}
                  </p>
                )}
              </div>
            )}

            {activeSettingsTab === "security" && (
              <div className="space-y-4">
                <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Login email
                  </p>
                  <p className="mt-1 break-words text-sm text-[var(--muted-2)]">
                    {userEmail || "Memuat akun..."}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[var(--brand)]/10 p-4 text-sm leading-relaxed text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10">
                  Login memakai OTP email. M-Agent tidak menyimpan password di
                  aplikasi ini.
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="h-12 rounded-full bg-[var(--surface)] px-6 text-sm font-bold text-[var(--danger)] ring-1 ring-[var(--danger-bg)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Keluar..." : "Logout"}
                </button>
              </div>
            )}

            {activeSettingsTab === "documents" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Upload limits
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                    Maksimal 25 MB per file. Upload memakai kuota token yang
                    sama dengan pesan
                    {usageSnapshot
                      ? ` (sisa ${usageSnapshot.tokens.session.percentRemaining}% di jendela 5 jam ini)`
                      : ""}
                    .
                  </p>
                </div>
                <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Supported files
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                    PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, WEBP.
                  </p>
                </div>
                <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10 sm:col-span-2">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Storage info
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                    Dokumen diproses untuk mengambil teks, lalu konteksnya
                    dipakai pada chat aktif. File asli tidak ditampilkan
                    sebagai arsip permanen di UI saat ini.
                  </p>
                </div>
              </div>
            )}

            {activeSettingsTab === "knowledge" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                    <p className="text-sm font-bold text-[var(--ink)]">
                      Retrieval status
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                      {isLoadingKnowledge
                        ? "Memuat knowledge base..."
                        : `${knowledgeSources.length} source aktif terbaca.`}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                    <p className="text-sm font-bold text-[var(--ink)]">
                      Admin access
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                      {isKnowledgeAdmin
                        ? "Upload dan kelola manual aktif untuk akun ini."
                        : "Akun ini bisa membaca source publik aktif."}
                    </p>
                  </div>
                </div>

                {isKnowledgeAdmin && (
                  <div className="rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          Source title
                        </span>
                        <input
                          value={knowledgeTitle}
                          onChange={(event) =>
                            setKnowledgeTitle(event.target.value)
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                          placeholder="Pedoman ISMUBA"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          Category
                        </span>
                        <input
                          value={knowledgeCategory}
                          onChange={(event) =>
                            setKnowledgeCategory(event.target.value)
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none ring-1 ring-[var(--brand-deep-line)]/10 focus:ring-[var(--brand)]"
                          placeholder="kemuhammadiyahan"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]">
                        {isUploadingKnowledge
                          ? "Mengupload..."
                          : "Upload knowledge document"}
                        <input
                          type="file"
                          accept={supportedDocumentAccept}
                          onChange={handleKnowledgeUpload}
                          disabled={isUploadingKnowledge}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-sm text-[var(--muted-2)]">
                        PDF, DOCX, PPTX, XLSX. Teks dipotong otomatis untuk
                        pencarian full-text.
                      </p>
                    </div>
                  </div>
                )}

                {(knowledgeError || knowledgeMessage) && (
                  <p
                    className={
                      knowledgeError
                        ? "rounded-2xl bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger-ink)]"
                        : "rounded-2xl bg-[var(--brand)]/10 p-3 text-sm font-semibold text-[var(--brand)]"
                    }
                  >
                    {knowledgeError || knowledgeMessage}
                  </p>
                )}

                <div className="space-y-3">
                  {knowledgeSources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-[22px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-[var(--ink)]">
                            {source.title}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted-2)]">
                            {source.category} - {source.fileType.toUpperCase()}{" "}
                            - {source.chunkCount} chunks
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-[var(--brand)]/10 px-3 py-1 text-xs font-bold text-[var(--brand)]">
                          {source.status}
                        </span>
                      </div>
                      {source.originalFileName && (
                        <p className="mt-2 break-words text-xs text-[var(--muted-3)]">
                          {source.originalFileName}
                        </p>
                      )}
                    </div>
                  ))}

                  {!isLoadingKnowledge && knowledgeSources.length === 0 && (
                    <div className="rounded-[22px] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10">
                      Belum ada knowledge source aktif.
                    </div>
                  )}
                </div>
              </div>
            )}

            {(activeSettingsTab === "general" ||
              activeSettingsTab === "personalization") && (
              <>
                {(profileError || profileSavedMessage) && (
                  <p
                    className={
                      profileError
                        ? "mt-4 rounded-2xl bg-[var(--danger-bg)] p-3 text-sm font-semibold text-[var(--danger-ink)]"
                        : "mt-4 rounded-2xl bg-[var(--brand)]/10 p-3 text-sm font-semibold text-[var(--brand)]"
                    }
                  >
                    {profileError || profileSavedMessage}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="h-12 rounded-full bg-[var(--surface)] px-6 text-sm font-bold text-[var(--ink)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={saveLearningProfile}
                    disabled={isSavingProfile}
                    className="h-12 rounded-full bg-[var(--brand)] px-6 text-sm font-bold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--brand)]/40"
                  >
                    {isSavingProfile ? "Menyimpan..." : "Simpan settings"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

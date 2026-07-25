"use client";

import { useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Icon } from "@/components/icons";
import {
  skillNameToLegacyStudyMode,
  skillToLegacyStudyMode,
} from "@/lib/mappers/legacy-study-mode";
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
import type { UsageSnapshot } from "@/lib/usage/limits";

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

  if (!isSettingsOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#16211c]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[24px] bg-[#f7f5ee] shadow-2xl ring-1 ring-[#0b3d2a]/10 sm:max-w-5xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#0b3d2a]/10 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-serif text-[26px] font-normal text-[#12211b]">Settings</h2>
            <p className="mt-1 text-sm text-[#5d6862]">
              Preferensi AI-mu, akun, data, dan dokumen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Tutup Settings"
            title="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5d6862] transition hover:bg-[#ece9df]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              x
            </span>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[230px_1fr]">
          <nav className="flex gap-2 overflow-x-auto border-b border-[#0b3d2a]/10 bg-[#f0eee6] p-3 md:block md:space-y-1 md:overflow-visible md:border-b-0 md:border-r">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={
                  activeSettingsTab === tab.id
                    ? "shrink-0 rounded-2xl bg-[#fbfaf6] px-4 py-3 text-left text-sm font-bold text-[#0f5a3d] ring-1 ring-[#0b3d2a]/10 md:w-full"
                    : "shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#5d6862] transition hover:bg-[#fbfaf6] md:w-full"
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
                  <span className="text-sm font-bold text-[#16211c]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm font-semibold text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#16211c]">
                    Language
                  </span>
                  <select
                    value={profileDraft.preferredLanguage}
                    onChange={(event) =>
                      updateProfileDraft("preferredLanguage", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm font-semibold text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#16211c]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm font-semibold text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                  >
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {modelCatalog[model].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#16211c]">
                    Default study mode
                  </span>
                  <select
                    value={profileDraft.defaultStudyMode}
                    onChange={(event) =>
                      updateProfileDraft(
                        "defaultStudyMode",
                        event.target.value as UserMemory["defaultStudyMode"],
                      )
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm font-semibold text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                  >
                    {skills
                      .filter(
                        (skill) =>
                          skill.ownerId === null &&
                          skillNameToLegacyStudyMode[skill.name],
                      )
                      .map((skill) => (
                        <option
                          key={skill.id}
                          value={skillToLegacyStudyMode(skill)}
                        >
                          {skill.name} ({getSkillBadge(skill, usageSnapshot?.tier)})
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}

            {activeSettingsTab === "personalization" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[#16211c]">
                    Learning Profile
                  </span>
                  <input
                    value={profileDraft.displayName}
                    onChange={(event) =>
                      updateProfileDraft("displayName", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                    placeholder="Nama panggilan"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#16211c]">
                    Jenjang sekolah
                  </span>
                  <input
                    value={profileDraft.schoolLevel}
                    onChange={(event) =>
                      updateProfileDraft("schoolLevel", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                    placeholder="Kelas 9 SMP"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#16211c]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm font-semibold text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
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
                  <span className="text-sm font-bold text-[#16211c]">
                    Favorite subjects
                  </span>
                  <input
                    value={favoriteSubjectsDraft}
                    onChange={(event) =>
                      setFavoriteSubjectsDraft(event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                    placeholder="Matematika, Al-Islam"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#16211c]">
                    Learning goals
                  </span>
                  <textarea
                    value={profileDraft.learningGoals}
                    onChange={(event) =>
                      updateProfileDraft("learningGoals", event.target.value)
                    }
                    className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-[#fbfaf6] px-4 py-3 text-sm leading-relaxed text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                    placeholder="Ingin lebih paham matematika dan latihan menjawab soal."
                  />
                </label>
              </div>
            )}

            {activeSettingsTab === "skills" && (
              <div className="space-y-5">
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 text-sm leading-relaxed text-[#5d6862] ring-1 ring-[#0b3d2a]/10">
                  Skill adalah instruksi fokus yang bisa kamu aktifkan per pesan
                  lewat perintah{" "}
                  <span className="font-mono text-[#0f5a3d]">/</span> di kolom
                  chat. Buat skill sendiri untuk gaya jawaban atau bidang yang
                  sering kamu pakai.
                </div>

                {/* Create / edit form */}
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#16211c]">
                      {editingSkillId ? "Edit skill" : "Buat skill baru"}
                    </p>
                    {isFreeTier && (
                      <span
                        className={
                          isCustomLimitReached && !editingSkillId
                            ? "rounded-full bg-[#e7c77e] px-3 py-1 text-xs font-bold text-[#8a6a1f]"
                            : "rounded-full bg-[#0f5a3d]/10 px-3 py-1 text-xs font-bold text-[#0f5a3d]"
                        }
                      >
                        {ownSkills.length}/{FREE_CUSTOM_SKILL_LIMIT} skill custom
                      </span>
                    )}
                  </div>

                  {isCustomLimitReached && !editingSkillId ? (
                    <div className="mt-3 rounded-2xl bg-[#e7c77e]/25 p-3 text-sm font-semibold text-[#8a6a1f]">
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
                        <span className="text-sm font-bold text-[#16211c]">
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
                          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                          placeholder="Analis Fiqih"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-[#16211c]">
                          Perintah slash{" "}
                          <span className="font-normal text-[#8a9089]">
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
                          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 font-mono text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                          placeholder="/fiqih"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-bold text-[#16211c]">
                          Kategori{" "}
                          <span className="font-normal text-[#8a9089]">
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
                          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                          placeholder="Islamic Studies"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-bold text-[#16211c]">
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
                          className="mt-2 min-h-32 w-full resize-y rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                          placeholder="Jawab sebagai analis fiqih: jelaskan dalil, sebutkan pandangan Majelis Tarjih bila relevan, dan bedakan mana yang ijtihad."
                        />
                      </label>

                      {skillMutationError && (
                        <p className="rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a] sm:col-span-2">
                          {skillMutationError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 sm:col-span-2">
                        <button
                          type="button"
                          onClick={submitSkill}
                          disabled={!canSubmitSkill}
                          className="h-11 rounded-full bg-[#0f5a3d] px-6 text-sm font-bold text-white transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:bg-[#0f5a3d]/40"
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
                            className="h-11 rounded-full bg-white px-6 text-sm font-bold text-[#16211c] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df] disabled:opacity-60"
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
                  <p className="text-sm font-bold text-[#16211c]">
                    Skill custom-mu ({ownSkills.length})
                  </p>
                  {ownSkills.length === 0 ? (
                    <div className="rounded-[22px] bg-[#fbfaf6] p-4 text-sm leading-relaxed text-[#5d6862] ring-1 ring-[#0b3d2a]/10">
                      Belum ada skill custom. Buat satu di atas untuk mulai.
                    </div>
                  ) : (
                    ownSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-[22px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#16211c]">
                              {skill.name}
                              {skill.slashCommand && (
                                <span className="rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#0f5a3d]">
                                  {skill.slashCommand}
                                </span>
                              )}
                            </p>
                            {skill.category && (
                              <p className="mt-1 text-xs font-semibold text-[#8a9089]">
                                {skill.category}
                              </p>
                            )}
                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#5d6862]">
                              {skill.systemPrompt}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => startEditSkill(skill)}
                              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0f5a3d] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
                            >
                              Edit
                            </button>
                            {confirmDeleteSkillId === skill.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill.id)}
                                  disabled={isMutatingSkill}
                                  className="rounded-full bg-[#ba1a1a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#93000a] disabled:opacity-60"
                                >
                                  Ya, hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSkillId(null)}
                                  className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#16211c] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSkillId(skill.id)}
                                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#ba1a1a] ring-1 ring-[#ffdad6] transition hover:bg-[#ffdad6]"
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
                  <p className="text-sm font-bold text-[#16211c]">
                    Skill bawaan platform
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {platformSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-[18px] bg-[#fbfaf6] p-3 ring-1 ring-[#0b3d2a]/10"
                      >
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#16211c]">
                          {skill.name}
                          {skill.slashCommand && (
                            <span className="rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#0f5a3d]">
                              {skill.slashCommand}
                            </span>
                          )}
                          <span className="rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 text-[11px] font-bold text-[#0f5a3d]">
                            {getSkillBadge(skill, usageSnapshot?.tier)}
                          </span>
                        </p>
                        {skill.category && (
                          <p className="mt-1 text-xs font-semibold text-[#8a9089]">
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
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                  <p className="text-sm font-bold text-[#0f5a3d]">
                    Current plan
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-[#16211c]">
                    {currentPlan?.name ?? currentTierLabel}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
                    {currentPlan?.tagline ?? "Status paket sedang dimuat."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                    <p className="text-sm font-bold text-[#16211c]">
                      Usage quota
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#0f5a3d]">
                      {usageSnapshot
                        ? `${usageSnapshot.remainingMessagesToday}/${usageSnapshot.dailyMessageLimit}`
                        : "--"}
                    </p>
                    <p className="text-sm text-[#5d6862]">
                      pesan tersisa hari ini
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                    <p className="text-sm font-bold text-[#16211c]">
                      Document quota
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#0f5a3d]">
                      {usageSnapshot
                        ? `${usageSnapshot.remainingUploadsToday}/${usageSnapshot.dailyUploadLimit}`
                        : "--"}
                    </p>
                    <p className="text-sm text-[#5d6862]">
                      upload tersisa hari ini
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/plans")}
                  className="h-12 rounded-full bg-[#0f5a3d] px-6 text-sm font-bold text-white transition hover:bg-[#0a3d2a]"
                >
                  Upgrade plan
                </button>
              </div>
            )}

            {activeSettingsTab === "data" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={resetMemory}
                  className="flex w-full items-center justify-between rounded-[22px] bg-[#fbfaf6] p-4 text-left ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#f0eee6]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#16211c]">
                      Clear current chat
                    </span>
                    <span className="mt-1 block text-sm text-[#5d6862]">
                      Mulai obrolan kosong tanpa menghapus riwayat.
                    </span>
                  </span>
                  <span className="text-xl text-[#0f5a3d]">+</span>
                </button>
                <button
                  type="button"
                  onClick={deleteAllChatHistory}
                  className="flex w-full items-center justify-between rounded-[22px] bg-[#fbfaf6] p-4 text-left ring-1 ring-[#ffdad6] transition hover:bg-[#ffdad6]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#ba1a1a]">
                      Delete all chat history
                    </span>
                    <span className="mt-1 block text-sm text-[#5d6862]">
                      Menghapus semua conversation milik akun ini.
                    </span>
                  </span>
                  <Icon name="trash" className="h-5 w-5 text-[#ba1a1a]" />
                </button>
                <button
                  type="button"
                  onClick={exportChatHistoryPlaceholder}
                  className="flex w-full items-center justify-between rounded-[22px] bg-[#fbfaf6] p-4 text-left ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#f0eee6]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#16211c]">
                      Export active chat
                    </span>
                    <span className="mt-1 block text-sm text-[#5d6862]">
                      Unduh Markdown dengan format pesan tetap terjaga.
                    </span>
                  </span>
                  <span className="text-sm font-bold text-[#0f5a3d]">MD</span>
                </button>
                {settingsDataMessage && (
                  <p className="rounded-2xl bg-[#0f5a3d]/10 p-3 text-sm font-semibold text-[#0f5a3d]">
                    {settingsDataMessage}
                  </p>
                )}
              </div>
            )}

            {activeSettingsTab === "security" && (
              <div className="space-y-4">
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                  <p className="text-sm font-bold text-[#16211c]">
                    Login email
                  </p>
                  <p className="mt-1 break-words text-sm text-[#5d6862]">
                    {userEmail || "Memuat akun..."}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#0f5a3d]/10 p-4 text-sm leading-relaxed text-[#5d6862] ring-1 ring-[#0b3d2a]/10">
                  Login memakai OTP email. AI Muhammadiyah tidak menyimpan
                  password di aplikasi ini.
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="h-12 rounded-full bg-[#fbfaf6] px-6 text-sm font-bold text-[#ba1a1a] ring-1 ring-[#ffdad6] transition hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Keluar..." : "Logout"}
                </button>
              </div>
            )}

            {activeSettingsTab === "documents" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                  <p className="text-sm font-bold text-[#16211c]">
                    Upload limits
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
                    Maksimal 25 MB per file. Kuota harian mengikuti paket:{" "}
                    {usageSnapshot
                      ? `${usageSnapshot.dailyUploadLimit} upload/hari`
                      : "memuat kuota"}
                    .
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                  <p className="text-sm font-bold text-[#16211c]">
                    Supported files
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
                    PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, WEBP.
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10 sm:col-span-2">
                  <p className="text-sm font-bold text-[#16211c]">
                    Storage info
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
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
                  <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                    <p className="text-sm font-bold text-[#16211c]">
                      Retrieval status
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
                      {isLoadingKnowledge
                        ? "Memuat knowledge base..."
                        : `${knowledgeSources.length} source aktif terbaca.`}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                    <p className="text-sm font-bold text-[#16211c]">
                      Admin access
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
                      {isKnowledgeAdmin
                        ? "Upload dan kelola manual aktif untuk akun ini."
                        : "Akun ini bisa membaca source publik aktif."}
                    </p>
                  </div>
                </div>

                {isKnowledgeAdmin && (
                  <div className="rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-bold text-[#16211c]">
                          Source title
                        </span>
                        <input
                          value={knowledgeTitle}
                          onChange={(event) =>
                            setKnowledgeTitle(event.target.value)
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                          placeholder="Pedoman ISMUBA"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-[#16211c]">
                          Category
                        </span>
                        <input
                          value={knowledgeCategory}
                          onChange={(event) =>
                            setKnowledgeCategory(event.target.value)
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-[#fbfaf6] px-4 text-sm text-[#16211c] outline-none ring-1 ring-[#0b3d2a]/10 focus:ring-[#0f5a3d]"
                          placeholder="kemuhammadiyahan"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-[#0f5a3d] px-6 text-sm font-bold text-white transition hover:bg-[#0a3d2a]">
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
                      <p className="text-sm text-[#5d6862]">
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
                        ? "rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a]"
                        : "rounded-2xl bg-[#0f5a3d]/10 p-3 text-sm font-semibold text-[#0f5a3d]"
                    }
                  >
                    {knowledgeError || knowledgeMessage}
                  </p>
                )}

                <div className="space-y-3">
                  {knowledgeSources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-[22px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#16211c]">
                            {source.title}
                          </p>
                          <p className="mt-1 text-sm text-[#5d6862]">
                            {source.category} - {source.fileType.toUpperCase()}{" "}
                            - {source.chunkCount} chunks
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-[#0f5a3d]/10 px-3 py-1 text-xs font-bold text-[#0f5a3d]">
                          {source.status}
                        </span>
                      </div>
                      {source.originalFileName && (
                        <p className="mt-2 break-words text-xs text-[#8a9089]">
                          {source.originalFileName}
                        </p>
                      )}
                    </div>
                  ))}

                  {!isLoadingKnowledge && knowledgeSources.length === 0 && (
                    <div className="rounded-[22px] bg-[#fbfaf6] p-4 text-sm leading-relaxed text-[#5d6862] ring-1 ring-[#0b3d2a]/10">
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
                        ? "mt-4 rounded-2xl bg-[#ffdad6] p-3 text-sm font-semibold text-[#93000a]"
                        : "mt-4 rounded-2xl bg-[#0f5a3d]/10 p-3 text-sm font-semibold text-[#0f5a3d]"
                    }
                  >
                    {profileError || profileSavedMessage}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="h-12 rounded-full bg-[#fbfaf6] px-6 text-sm font-bold text-[#16211c] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={saveLearningProfile}
                    disabled={isSavingProfile}
                    className="h-12 rounded-full bg-[#0f5a3d] px-6 text-sm font-bold text-white transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:bg-[#0f5a3d]/40"
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

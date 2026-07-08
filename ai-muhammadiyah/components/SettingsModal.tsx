"use client";

import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { Icon } from "@/components/icons";
import {
  skillNameToLegacyStudyMode,
  skillToLegacyStudyMode,
} from "@/lib/mappers/legacy-study-mode";
import type { SettingsTab } from "@/lib/mappers/types";
import { type UserMemory } from "@/lib/memory/user-memory";
import type { KnowledgeSource } from "@/lib/knowledge";
import { getSkillBadge, type Skill } from "@/lib/skills";
import {
  modelCatalog,
  type PlanModelId,
  type SubscriptionPlan,
} from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";

const settingsTabs: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "personalization", label: "Personalization" },
  { id: "subscription", label: "Subscription" },
  { id: "data", label: "Data Controls" },
  { id: "security", label: "Security" },
  { id: "documents", label: "Documents" },
  { id: "knowledge", label: "Knowledge Base" },
];

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

  if (!isSettingsOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#04140b]/35 px-3 py-4 sm:items-center sm:justify-center">
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[28px] bg-[#fbfdfb] shadow-2xl ring-1 ring-[#d8eadf] sm:max-w-5xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#d9e9df] px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-2xl font-bold text-[#05150d]">Settings</h2>
            <p className="mt-1 text-sm text-[#4f665c]">
              Preferensi AI-mu, akun, data, dan dokumen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Tutup Settings"
            title="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#566d62] transition hover:bg-[#eef8f1]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              x
            </span>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[230px_1fr]">
          <nav className="flex gap-2 overflow-x-auto border-b border-[#d9e9df] bg-[#f7fbf8] p-3 md:block md:space-y-1 md:overflow-visible md:border-b-0 md:border-r">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={
                  activeSettingsTab === tab.id
                    ? "shrink-0 rounded-2xl bg-white px-4 py-3 text-left text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf] md:w-full"
                    : "shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#38534a] transition hover:bg-white md:w-full"
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
                  <span className="text-sm font-bold text-[#18392e]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#18392e]">
                    Language
                  </span>
                  <select
                    value={profileDraft.preferredLanguage}
                    onChange={(event) =>
                      updateProfileDraft("preferredLanguage", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#18392e]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                  >
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {modelCatalog[model].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#18392e]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
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
                  <span className="text-sm font-bold text-[#18392e]">
                    Learning Profile
                  </span>
                  <input
                    value={profileDraft.displayName}
                    onChange={(event) =>
                      updateProfileDraft("displayName", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                    placeholder="Nama panggilan"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#18392e]">
                    Jenjang sekolah
                  </span>
                  <input
                    value={profileDraft.schoolLevel}
                    onChange={(event) =>
                      updateProfileDraft("schoolLevel", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                    placeholder="Kelas 9 SMP"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#18392e]">
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
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm font-semibold text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
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
                  <span className="text-sm font-bold text-[#18392e]">
                    Favorite subjects
                  </span>
                  <input
                    value={favoriteSubjectsDraft}
                    onChange={(event) =>
                      setFavoriteSubjectsDraft(event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                    placeholder="Matematika, Al-Islam"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#18392e]">
                    Learning goals
                  </span>
                  <textarea
                    value={profileDraft.learningGoals}
                    onChange={(event) =>
                      updateProfileDraft("learningGoals", event.target.value)
                    }
                    className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                    placeholder="Ingin lebih paham matematika dan latihan menjawab soal."
                  />
                </label>
              </div>
            )}

            {activeSettingsTab === "subscription" && (
              <div className="space-y-4">
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                  <p className="text-sm font-bold text-[#008d54]">
                    Current plan
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-[#05150d]">
                    {currentPlan?.name ?? currentTierLabel}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                    {currentPlan?.tagline ?? "Status paket sedang dimuat."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#d8eadf]">
                    <p className="text-sm font-bold text-[#18392e]">
                      Usage quota
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#008d54]">
                      {usageSnapshot
                        ? `${usageSnapshot.remainingMessagesToday}/${usageSnapshot.dailyMessageLimit}`
                        : "--"}
                    </p>
                    <p className="text-sm text-[#4f665c]">
                      pesan tersisa hari ini
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white p-4 ring-1 ring-[#d8eadf]">
                    <p className="text-sm font-bold text-[#18392e]">
                      Document quota
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#008d54]">
                      {usageSnapshot
                        ? `${usageSnapshot.remainingUploadsToday}/${usageSnapshot.dailyUploadLimit}`
                        : "--"}
                    </p>
                    <p className="text-sm text-[#4f665c]">
                      upload tersisa hari ini
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/plans")}
                  className="h-12 rounded-full bg-[#009252] px-6 text-sm font-bold text-white transition hover:bg-[#007c46]"
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
                  className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left ring-1 ring-[#d8eadf] transition hover:bg-[#f7fbf8]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#18392e]">
                      Clear current chat
                    </span>
                    <span className="mt-1 block text-sm text-[#4f665c]">
                      Mulai obrolan kosong tanpa menghapus riwayat.
                    </span>
                  </span>
                  <span className="text-xl text-[#008d54]">+</span>
                </button>
                <button
                  type="button"
                  onClick={deleteAllChatHistory}
                  className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left ring-1 ring-[#f0c8be] transition hover:bg-[#fff1ed]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#8a3b2b]">
                      Delete all chat history
                    </span>
                    <span className="mt-1 block text-sm text-[#4f665c]">
                      Menghapus semua conversation milik akun ini.
                    </span>
                  </span>
                  <Icon name="trash" className="h-5 w-5 text-[#8a3b2b]" />
                </button>
                <button
                  type="button"
                  onClick={exportChatHistoryPlaceholder}
                  className="flex w-full items-center justify-between rounded-[22px] bg-white p-4 text-left ring-1 ring-[#d8eadf] transition hover:bg-[#f7fbf8]"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#18392e]">
                      Export active chat
                    </span>
                    <span className="mt-1 block text-sm text-[#4f665c]">
                      Unduh Markdown dengan format pesan tetap terjaga.
                    </span>
                  </span>
                  <span className="text-sm font-bold text-[#008d54]">MD</span>
                </button>
                {settingsDataMessage && (
                  <p className="rounded-2xl bg-[#eef8f1] p-3 text-sm font-semibold text-[#008d54]">
                    {settingsDataMessage}
                  </p>
                )}
              </div>
            )}

            {activeSettingsTab === "security" && (
              <div className="space-y-4">
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                  <p className="text-sm font-bold text-[#18392e]">
                    Login email
                  </p>
                  <p className="mt-1 break-words text-sm text-[#4f665c]">
                    {userEmail || "Memuat akun..."}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#eef8f1] p-4 text-sm leading-relaxed text-[#38534a] ring-1 ring-[#d8eadf]">
                  Login memakai OTP email. AI Muhammadiyah tidak menyimpan
                  password di aplikasi ini.
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="h-12 rounded-full bg-white px-6 text-sm font-bold text-[#8a3b2b] ring-1 ring-[#f0c8be] transition hover:bg-[#fff1ed] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Keluar..." : "Logout"}
                </button>
              </div>
            )}

            {activeSettingsTab === "documents" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                  <p className="text-sm font-bold text-[#18392e]">
                    Upload limits
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                    Maksimal 25 MB per file. Kuota harian mengikuti paket:{" "}
                    {usageSnapshot
                      ? `${usageSnapshot.dailyUploadLimit} upload/hari`
                      : "memuat kuota"}
                    .
                  </p>
                </div>
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                  <p className="text-sm font-bold text-[#18392e]">
                    Supported files
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                    PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, WEBP.
                  </p>
                </div>
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf] sm:col-span-2">
                  <p className="text-sm font-bold text-[#18392e]">
                    Storage info
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
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
                  <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                    <p className="text-sm font-bold text-[#18392e]">
                      Retrieval status
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                      {isLoadingKnowledge
                        ? "Memuat knowledge base..."
                        : `${knowledgeSources.length} source aktif terbaca.`}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                    <p className="text-sm font-bold text-[#18392e]">
                      Admin access
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                      {isKnowledgeAdmin
                        ? "Upload dan kelola manual aktif untuk akun ini."
                        : "Akun ini bisa membaca source publik aktif."}
                    </p>
                  </div>
                </div>

                {isKnowledgeAdmin && (
                  <div className="rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-bold text-[#18392e]">
                          Source title
                        </span>
                        <input
                          value={knowledgeTitle}
                          onChange={(event) =>
                            setKnowledgeTitle(event.target.value)
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                          placeholder="Pedoman ISMUBA"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-[#18392e]">
                          Category
                        </span>
                        <input
                          value={knowledgeCategory}
                          onChange={(event) =>
                            setKnowledgeCategory(event.target.value)
                          }
                          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-sm text-[#18392e] outline-none ring-1 ring-[#d8eadf] focus:ring-[#95d6b9]"
                          placeholder="kemuhammadiyahan"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-[#009252] px-6 text-sm font-bold text-white transition hover:bg-[#007c46]">
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
                      <p className="text-sm text-[#4f665c]">
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
                        ? "rounded-2xl bg-[#fff1ed] p-3 text-sm font-semibold text-[#8a3b2b]"
                        : "rounded-2xl bg-[#eef8f1] p-3 text-sm font-semibold text-[#008d54]"
                    }
                  >
                    {knowledgeError || knowledgeMessage}
                  </p>
                )}

                <div className="space-y-3">
                  {knowledgeSources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-[22px] bg-white p-4 ring-1 ring-[#d8eadf]"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#18392e]">
                            {source.title}
                          </p>
                          <p className="mt-1 text-sm text-[#4f665c]">
                            {source.category} - {source.fileType.toUpperCase()}{" "}
                            - {source.chunkCount} chunks
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-[#eef8f1] px-3 py-1 text-xs font-bold text-[#008d54]">
                          {source.status}
                        </span>
                      </div>
                      {source.originalFileName && (
                        <p className="mt-2 break-words text-xs text-[#6b8177]">
                          {source.originalFileName}
                        </p>
                      )}
                    </div>
                  ))}

                  {!isLoadingKnowledge && knowledgeSources.length === 0 && (
                    <div className="rounded-[22px] bg-white p-4 text-sm leading-relaxed text-[#4f665c] ring-1 ring-[#d8eadf]">
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
                        ? "mt-4 rounded-2xl bg-[#fff1ed] p-3 text-sm font-semibold text-[#8a3b2b]"
                        : "mt-4 rounded-2xl bg-[#eef8f1] p-3 text-sm font-semibold text-[#008d54]"
                    }
                  >
                    {profileError || profileSavedMessage}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="h-12 rounded-full bg-white px-6 text-sm font-bold text-[#18392e] ring-1 ring-[#d8eadf] transition hover:bg-[#eef8f1]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={saveLearningProfile}
                    disabled={isSavingProfile}
                    className="h-12 rounded-full bg-[#009252] px-6 text-sm font-bold text-white transition hover:bg-[#007c46] disabled:cursor-not-allowed disabled:bg-[#95d6b9]"
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

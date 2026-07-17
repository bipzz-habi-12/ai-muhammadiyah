"use client";

import { useState } from "react";
import { saveUserMemory, type UserMemory } from "@/lib/memory/user-memory";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Personalization.dc.html port, wired to the REAL learning profile
// (user_memory). Only fields that actually exist are rendered — the design's
// "role" pills and "memory facts" list have no backing columns, so they're
// dropped rather than faked. Saves via saveUserMemory (RLS-scoped upsert).

const explanationStyles: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "Singkat, langsung ke inti, lalu contoh.", label: "Singkat + contoh" },
  { value: "Pelan-pelan dengan langkah berurutan.", label: "Langkah berurutan" },
  { value: "Gunakan analogi sederhana dan latihan kecil.", label: "Analogi + latihan" },
  { value: "Lebih mendalam, cocok untuk diskusi kajian.", label: "Mendalam" },
];

const languages: { value: string; label: string }[] = [
  { value: "Indonesia", label: "Indonesia" },
  { value: "English", label: "English" },
  { value: "Bilingual (ID/EN)", label: "Bilingual" },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[#0f5a3d] px-[15px] py-2 text-[13.5px] font-semibold text-[#f5f3ec]"
          : "rounded-full bg-[#ece9df] px-[15px] py-2 text-[13.5px] font-semibold text-[#5d6862] transition hover:bg-[#e4e0d2]"
      }
    >
      {children}
    </button>
  );
}

const labelClass = "mb-2.5 block text-[13px] font-semibold text-[#3a453e]";
const fieldClass =
  "h-11 w-full rounded-[10px] border border-[#0b3d2a]/15 bg-[#f9f7f1] px-3.5 text-[15px] text-[#16211c] outline-none transition focus:border-[#0f5a3d]";
const cardClass =
  "rounded-[15px] border border-[#0b3d2a]/10 bg-[#fbfaf6] p-6";
const sectionLabel =
  "mb-4 text-[13px] font-bold uppercase tracking-[0.05em] text-[#7c857f]";

export default function PersonalizationForm({
  initial,
  userId,
}: {
  initial: UserMemory;
  userId: string;
}) {
  const [base, setBase] = useState<UserMemory>(initial);
  const [draft, setDraft] = useState<UserMemory>(initial);
  const [favoriteSubjectsText, setFavoriteSubjectsText] = useState(
    initial.favoriteSubjects.join(", "),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );

  function set<K extends keyof UserMemory>(key: K, value: UserMemory[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  async function save() {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setStatus(null);

    const supabase = createSupabaseBrowserClient();
    try {
      const saved = await saveUserMemory(supabase, userId, {
        ...draft,
        favoriteSubjects: favoriteSubjectsText,
      });
      setBase(saved);
      setDraft(saved);
      setFavoriteSubjectsText(saved.favoriteSubjects.join(", "));
      setStatus({ tone: "ok", text: "Tersimpan." });
    } catch (error) {
      console.error(error);
      setStatus({ tone: "err", text: "Belum bisa disimpan. Coba lagi." });
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    setDraft(base);
    setFavoriteSubjectsText(base.favoriteSubjects.join(", "));
    setStatus(null);
  }

  return (
    <div>
      {/* ABOUT YOU */}
      <section className="mb-8">
        <div className={sectionLabel}>Tentang kamu</div>
        <div className={cardClass}>
          <label>
            <span className={labelClass}>Nama panggilan</span>
            <input
              value={draft.displayName}
              onChange={(event) => set("displayName", event.target.value)}
              placeholder="mis. Fauzan"
              className={`${fieldClass} mb-5`}
            />
          </label>
          <label>
            <span className={labelClass}>Jenjang / peran</span>
            <input
              value={draft.schoolLevel}
              onChange={(event) => set("schoolLevel", event.target.value)}
              placeholder="mis. Guru SMA Muhammadiyah, Kelas 9 SMP"
              className={`${fieldClass} mb-5`}
            />
          </label>
          <label>
            <span className={labelClass}>Apa yang perlu AI ketahui tentangmu?</span>
            <textarea
              value={draft.learningGoals}
              onChange={(event) => set("learningGoals", event.target.value)}
              placeholder="mis. Saya mengajar Studi Islam. Lebih suka jawaban evidence-based dengan referensi yang bisa dicek, dan contoh berbahasa Indonesia."
              className="h-24 w-full resize-none rounded-[10px] border border-[#0b3d2a]/15 bg-[#f9f7f1] px-3.5 py-3 text-[14.5px] leading-relaxed text-[#25302a] outline-none transition focus:border-[#0f5a3d]"
            />
          </label>
        </div>
      </section>

      {/* RESPONSE STYLE */}
      <section className="mb-8">
        <div className={sectionLabel}>Gaya jawaban</div>
        <div className={cardClass}>
          <span className={labelClass}>Gaya penjelasan</span>
          <div className="mb-6 flex flex-wrap gap-2">
            {explanationStyles.map((option) => (
              <Pill
                key={option.value || "default"}
                active={draft.preferredExplanationStyle === option.value}
                onClick={() => set("preferredExplanationStyle", option.value)}
              >
                {option.label}
              </Pill>
            ))}
          </div>
          <span className={labelClass}>Bahasa default</span>
          <div className="flex flex-wrap gap-2">
            {languages.map((option) => (
              <Pill
                key={option.value}
                active={draft.preferredLanguage === option.value}
                onClick={() => set("preferredLanguage", option.value)}
              >
                {option.label}
              </Pill>
            ))}
          </div>
        </div>
      </section>

      {/* FAVORITE SUBJECTS */}
      <section className="mb-8">
        <div className={sectionLabel}>Minat</div>
        <div className={cardClass}>
          <label>
            <span className={labelClass}>Bidang favorit (pisahkan dengan koma)</span>
            <input
              value={favoriteSubjectsText}
              onChange={(event) => {
                setFavoriteSubjectsText(event.target.value);
                setStatus(null);
              }}
              placeholder="mis. Tafsir, Fikih, Matematika"
              className={fieldClass}
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="flex h-[46px] items-center rounded-[11px] bg-[#0f5a3d] px-6 text-[14.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Menyimpan…" : "Simpan perubahan"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex h-[46px] items-center rounded-[11px] border border-[#0b3d2a]/16 px-5 text-[14.5px] font-semibold text-[#25302a] transition hover:border-[#0f5a3d]"
        >
          Reset
        </button>
        {status && (
          <span
            className={
              status.tone === "ok"
                ? "text-sm font-semibold text-[#0f5a3d]"
                : "text-sm font-semibold text-[#ba1a1a]"
            }
          >
            {status.text}
          </span>
        )}
      </div>
    </div>
  );
}

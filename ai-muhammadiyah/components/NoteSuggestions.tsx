"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { parseNoteBlocks, type NoteDraft } from "@/lib/second-brain/parse";

// Usulan catatan "Otak Kedua" (Langkah 40 A4).
//
// Aturan yang tidak boleh dilanggar — ini inti keputusan produknya:
//   * Hanya dirender setelah streaming pesan SELESAI (dijaga pemanggil di
//     ChatArea lewat `isStreamingMessage`).
//   * Bukan modal, bukan toast. Inline, tenang, dan bisa diabaikan sepenuhnya
//     tanpa konsekuensi apa pun bagi pengguna yang sedang serius bekerja.
//   * Tidak pernah tersimpan tanpa klik eksplisit.

type SaveState =
  | "idle"
  | "saving"
  | "saved"
  | "saved_unindexed"
  | "exists"
  | "error";

interface NoteSuggestionsProps {
  messageText: string;
  conversationId: string | null;
  workspaceId: string | null;
}

// Alasan gagal yang datang dari server ditampilkan APA ADANYA. Versi pertama
// selalu menulis "Gagal menyimpan. Coba lagi." untuk semua kegagalan, jadi
// sesi yang gagal terus-menerus (belum login, migrasi belum di-apply, judul
// terlalu panjang, isi kosong) tidak bisa dibedakan sama sekali dari sisi
// pengguna — dan tidak bisa dilaporkan. Rute `/api/notes` sudah mengembalikan
// pesan berbahasa Indonesia yang spesifik untuk tiap kasus; ini hanya berhenti
// membuangnya.
const genericSaveError = "Gagal menyimpan. Coba lagi.";

export default function NoteSuggestions({
  messageText,
  conversationId,
  workspaceId,
}: NoteSuggestionsProps) {
  const drafts = useMemo(() => parseNoteBlocks(messageText), [messageText]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  if (!drafts.length || isDismissed) {
    return null;
  }

  const saveNote = async (draft: NoteDraft) => {
    setSaveStates((previous) => ({ ...previous, [draft.title]: "saving" }));
    setSaveErrors((previous) => ({ ...previous, [draft.title]: "" }));

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          source: "ai",
          workspaceId,
          originConversationId: conversationId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        indexed?: boolean;
      } | null;

      if (response.ok) {
        // `indexed: false` = catatannya SUDAH tersimpan, hanya embedding-nya
        // gagal (mis. OPENAI_API_KEY_EMBED kosong). Dulu ini tampil sebagai
        // "Tersimpan" biasa, jadi pencarian semantik yang diam-diam pincang
        // tidak pernah terlihat.
        setSaveStates((previous) => ({
          ...previous,
          [draft.title]:
            payload?.indexed === false ? "saved_unindexed" : "saved",
        }));
        return;
      }

      setSaveStates((previous) => ({
        ...previous,
        [draft.title]: response.status === 409 ? "exists" : "error",
      }));
      setSaveErrors((previous) => ({
        ...previous,
        [draft.title]:
          payload?.error ?? `${genericSaveError} (HTTP ${response.status})`,
      }));
    } catch {
      setSaveStates((previous) => ({ ...previous, [draft.title]: "error" }));
      setSaveErrors((previous) => ({
        ...previous,
        [draft.title]: "Jaringan terputus saat menyimpan. Coba lagi.",
      }));
    }
  };

  const savedCount = Object.values(saveStates).filter(
    (state) => state === "saved" || state === "saved_unindexed",
  ).length;

  return (
    <div className="mt-3 rounded-[10px] border border-[rgba(20,40,30,0.1)] bg-[var(--surface-panel)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon
          name="book"
          className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          aria-expanded={isOpen}
          className="min-w-0 flex-1 text-left text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--ink-soft)]"
        >
          {savedCount > 0
            ? `${savedCount} dari ${drafts.length} catatan tersimpan`
            : `${drafts.length} catatan diusulkan`}
          <span className="ml-1.5 text-[var(--brand)]">
            {isOpen ? "Tutup" : "Tinjau"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Abaikan usulan catatan"
          className="shrink-0 rounded p-0.5 text-[var(--muted-3)] transition-colors hover:text-[var(--ink-soft)]"
        >
          <Icon name="close" className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {isOpen && (
        <ul className="border-t border-[rgba(20,40,30,0.1)] px-3 py-2">
          {drafts.map((draft) => {
            const state = saveStates[draft.title] ?? "idle";

            return (
              <li
                key={draft.title}
                className="flex items-start gap-2.5 py-1.5 text-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {draft.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.5] text-[var(--muted)]">
                    {draft.content}
                  </p>
                  {(state === "exists" || state === "error") && (
                    <p className="mt-1 text-[11.5px] text-[var(--gold-ink)]">
                      {saveErrors[draft.title] ||
                        (state === "exists"
                          ? "Judul ini sudah ada di catatanmu."
                          : genericSaveError)}
                    </p>
                  )}
                  {state === "saved_unindexed" && (
                    <p className="mt-1 text-[11.5px] text-[var(--gold-ink)]">
                      Tersimpan, tapi belum terindeks — untuk sementara catatan
                      ini hanya ketemu lewat pencarian teks.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => saveNote(draft)}
                  disabled={
                    state === "saving" ||
                    state === "saved" ||
                    state === "saved_unindexed"
                  }
                  className="shrink-0 rounded-[6px] border border-[rgba(20,40,30,0.12)] px-2.5 py-1 text-[12px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--background)] disabled:cursor-default disabled:border-transparent disabled:text-[var(--muted)]"
                >
                  {state === "saved" || state === "saved_unindexed"
                    ? "Tersimpan"
                    : state === "saving"
                      ? "Menyimpan…"
                      : "Simpan"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

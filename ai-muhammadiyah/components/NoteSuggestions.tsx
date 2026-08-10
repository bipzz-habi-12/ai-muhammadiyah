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

type SaveState = "idle" | "saving" | "saved" | "exists" | "error";

interface NoteSuggestionsProps {
  messageText: string;
  conversationId: string | null;
  workspaceId: string | null;
}

export default function NoteSuggestions({
  messageText,
  conversationId,
  workspaceId,
}: NoteSuggestionsProps) {
  const drafts = useMemo(() => parseNoteBlocks(messageText), [messageText]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  if (!drafts.length || isDismissed) {
    return null;
  }

  const saveNote = async (draft: NoteDraft) => {
    setSaveStates((previous) => ({ ...previous, [draft.title]: "saving" }));

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

      if (response.ok) {
        setSaveStates((previous) => ({ ...previous, [draft.title]: "saved" }));
        return;
      }

      setSaveStates((previous) => ({
        ...previous,
        [draft.title]: response.status === 409 ? "exists" : "error",
      }));
    } catch {
      setSaveStates((previous) => ({ ...previous, [draft.title]: "error" }));
    }
  };

  const savedCount = Object.values(saveStates).filter(
    (state) => state === "saved",
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
                  {state === "exists" && (
                    <p className="mt-1 text-[11.5px] text-[var(--gold-ink)]">
                      Judul ini sudah ada di catatanmu.
                    </p>
                  )}
                  {state === "error" && (
                    <p className="mt-1 text-[11.5px] text-[var(--gold-ink)]">
                      Gagal menyimpan. Coba lagi.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => saveNote(draft)}
                  disabled={state === "saving" || state === "saved"}
                  className="shrink-0 rounded-[6px] border border-[rgba(20,40,30,0.12)] px-2.5 py-1 text-[12px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--background)] disabled:cursor-default disabled:border-transparent disabled:text-[var(--muted)]"
                >
                  {state === "saved"
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

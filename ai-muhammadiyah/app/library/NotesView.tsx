"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/formatting/text";
import SyncDevices from "./SyncDevices";

// Tampilan "Otak Kedua" di Library: daftar catatan pribadi + backlink ala
// Logseq. Berbeda dari grid Artifact di sebelahnya — artifact adalah keluaran
// AI per-percakapan, catatan adalah pengetahuan pengguna yang hidup lintas
// percakapan.

export type NoteLink = {
  title: string;
  noteId: string | null;
};

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  source: "user" | "ai" | "logseq_import";
  updatedAt: string;
  outgoingLinks: NoteLink[];
  backlinks: NoteLink[];
};

const sourceLabels: Record<NoteItem["source"], string> = {
  user: "Ditulis sendiri",
  ai: "Dari percakapan",
  logseq_import: "Impor Logseq",
};

/**
 * Rute impor membatasi 40 berkas per pengiriman supaya muat dalam
 * `maxDuration`. Graf Logseq bisa berisi ratusan halaman, jadi klien
 * mengirimnya bergelombang dan melaporkan kemajuannya.
 */
const importBatchSize = 40;

type ImportSummary = {
  created: number;
  updated: number;
  indexed: number;
  skipped: string[];
};

export default function NotesView({ notes }: { notes: NoteItem[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    const files = [...fileList].filter((file) => /\.md$/i.test(file.name));

    if (!files.length) {
      setImportError("Tidak ada berkas .md yang dipilih.");
      return;
    }

    setImportError(null);
    setImportSummary(null);

    const totals: ImportSummary = {
      created: 0,
      updated: 0,
      indexed: 0,
      skipped: [],
    };

    for (let start = 0; start < files.length; start += importBatchSize) {
      const batch = files.slice(start, start + importBatchSize);
      setImportProgress(
        `Mengimpor ${Math.min(start + batch.length, files.length)} dari ${files.length} berkas…`,
      );

      const formData = new FormData();
      for (const file of batch) {
        formData.append("files", file);
      }

      try {
        const response = await fetch("/api/notes/import", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok) {
          setImportError(payload.error ?? "Impor gagal.");
          setImportProgress(null);
          return;
        }

        totals.created += payload.created ?? 0;
        totals.updated += payload.updated ?? 0;
        totals.indexed += payload.indexed ?? 0;
        totals.skipped.push(...(payload.skipped ?? []));
      } catch {
        setImportError("Impor gagal. Periksa koneksi lalu coba lagi.");
        setImportProgress(null);
        return;
      }
    }

    setImportProgress(null);
    setImportSummary(totals);
    // Muat ulang data server supaya catatan baru dan backlink-nya tampil.
    router.refresh();
  };

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return notes;
    }

    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [notes, search]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13.5px] text-[#5d6862]">
          {notes.length} catatan tersimpan
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {/* Impor/ekspor Logseq: catatan bisa dibawa masuk dan keluar sebagai
              markdown biasa — tidak terkunci di database kami. */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleImport(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(importProgress)}
            className="h-10 rounded-[10px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-3.5 text-[13.5px] font-medium text-[#0f5a3d] transition hover:bg-[#f0eee5] disabled:text-[#8a9089]"
          >
            {importProgress ? "Mengimpor…" : "Impor Logseq"}
          </button>
          <a
            href="/api/notes/export"
            className={
              notes.length
                ? "flex h-10 items-center rounded-[10px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-3.5 text-[13.5px] font-medium text-[#0f5a3d] transition hover:bg-[#f0eee5]"
                : "pointer-events-none flex h-10 items-center rounded-[10px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-3.5 text-[13.5px] font-medium text-[#8a9089]"
            }
          >
            Ekspor .zip
          </a>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari catatan"
            className="h-10 w-[220px] rounded-[10px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-3.5 text-[13.5px] text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
          />
        </div>
      </div>

      <SyncDevices />

      {(importProgress || importSummary || importError) && (
        <div className="mb-5 rounded-[10px] border border-[rgba(20,40,30,0.1)] bg-[#f7f5ee] px-4 py-3 text-[13px]">
          {importProgress && <p className="text-[#5d6862]">{importProgress}</p>}
          {importError && <p className="text-[#93000a]">{importError}</p>}
          {importSummary && (
            <div className="text-[#25302a]">
              <p>
                {importSummary.created} catatan baru, {importSummary.updated}{" "}
                diperbarui, {importSummary.indexed} terindeks untuk pencarian.
              </p>
              {importSummary.skipped.length > 0 && (
                <p className="mt-1 text-[12px] text-[#b08833]">
                  {importSummary.skipped.length} berkas dilewati:{" "}
                  {importSummary.skipped.slice(0, 3).join(", ")}
                  {importSummary.skipped.length > 3 ? ", …" : ""}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-[15px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-12 text-center text-sm leading-relaxed text-[#6b746e]">
          {notes.length === 0
            ? "Otak Kedua-mu masih kosong. Saat percakapan menghasilkan sesuatu yang layak disimpan, AI akan menawarkan catatan — kamu yang memutuskan."
            : "Tidak ada catatan yang cocok dengan pencarianmu."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 [animation:fade_.35s_ease] sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((note) => {
            const isOpen = openNoteId === note.id;

            return (
              <article
                key={note.id}
                className={`overflow-hidden rounded-[15px] border bg-[#fbfaf6] transition duration-150 ${
                  isOpen
                    ? "border-[#0f5a3d]/35 sm:col-span-2 lg:col-span-3"
                    : "border-[#0b3d2a]/10 hover:-translate-y-[3px] hover:border-[#0f5a3d]/35 hover:shadow-[0_16px_34px_-26px_rgba(11,61,42,0.7)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenNoteId(isOpen ? null : note.id)}
                  aria-expanded={isOpen}
                  className="w-full px-[17px] py-[15px] text-left"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-md bg-[rgba(15,90,61,0.1)] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#0f5a3d]">
                      {sourceLabels[note.source]}
                    </span>
                    {note.backlinks.length > 0 && (
                      <span className="text-[11px] text-[#8a9089]">
                        {note.backlinks.length} tautan masuk
                      </span>
                    )}
                  </div>
                  <h3 className="mb-[7px] line-clamp-2 text-[14.5px] font-semibold leading-[1.35] text-[#1b2721]">
                    {note.title}
                  </h3>
                  {!isOpen && (
                    <p className="mb-2 line-clamp-3 text-[13px] leading-[1.55] text-[#5d6862]">
                      {note.content}
                    </p>
                  )}
                  <div className="text-xs text-[#8a9089]">
                    {formatRelativeTime(note.updatedAt)}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[#0b3d2a]/[0.07] px-[17px] py-[15px]">
                    <p className="whitespace-pre-wrap text-[14px] leading-[1.7] text-[#242e28]">
                      {note.content}
                    </p>

                    {note.outgoingLinks.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#8a9089]">
                          Menautkan ke
                        </h4>
                        <ul className="flex flex-wrap gap-1.5">
                          {note.outgoingLinks.map((link) => (
                            <li
                              key={link.title}
                              className={`rounded-md px-2 py-[3px] text-[12px] ${
                                link.noteId
                                  ? "bg-[rgba(15,90,61,0.1)] text-[#0f5a3d]"
                                  : "bg-[#ece9df] text-[#8a9089]"
                              }`}
                              // Tautan ke catatan yang belum ada tetap
                              // ditampilkan (redup) — itu perilaku Logseq.
                              title={
                                link.noteId
                                  ? undefined
                                  : "Catatan ini belum dibuat"
                              }
                            >
                              {link.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {note.backlinks.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#8a9089]">
                          Ditautkan dari
                        </h4>
                        <ul className="flex flex-wrap gap-1.5">
                          {note.backlinks.map((link) => (
                            <li
                              key={link.noteId ?? link.title}
                              className="rounded-md bg-[rgba(15,90,61,0.1)] px-2 py-[3px] text-[12px] text-[#0f5a3d]"
                            >
                              {link.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

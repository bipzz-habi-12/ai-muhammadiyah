"use client";

import { SparkIcon, Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { Doc } from "@/lib/docs";

interface DocEditorProps {
  doc: Doc | undefined;
  isSaving: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  activeConversationTitle: string | undefined;
  onChange: (patch: { title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}

export default function DocEditor({
  doc,
  isSaving,
  isGenerating,
  canGenerate,
  activeConversationTitle,
  onChange,
  onDelete,
  onGenerate,
  onClose,
}: DocEditorProps) {
  if (!doc) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-[#6f7a70]">
        <Icon name="book" className="h-8 w-8 text-[#bec9be]" />
        <p>Pilih dokumen dari daftar, atau buat dokumen baru.</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          title={
            canGenerate
              ? activeConversationTitle
                ? `Generate dari "${activeConversationTitle}"`
                : "Generate dari chat ini"
              : "Buka percakapan dulu untuk generate"
          }
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SparkIcon className="h-4 w-4" />
          {isGenerating ? "Menggenerate..." : "Generate dari chat ini"}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[#3f4940] hover:text-[#004d27] md:hidden"
        >
          <span aria-hidden="true">←</span>
          Kembali ke daftar
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6f7a70]">
          <span className="rounded-full bg-[#f3f4f5] px-3 py-1 font-bold text-[#3f4940]">
            {isSaving ? "Menyimpan..." : "Tersimpan"}
          </span>
          <span>{formatRelativeTime(doc.updatedAt)}</span>
        </div>

        <input
          value={doc.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Judul dokumen"
          className="w-full bg-transparent text-3xl font-bold text-[#191c1d] outline-none placeholder:text-[#6f7a70]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            title={
              canGenerate
                ? activeConversationTitle
                  ? `Generate dari "${activeConversationTitle}"`
                  : "Generate dari chat ini"
                : "Buka percakapan dulu untuk generate"
            }
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#004d27] ring-1 ring-[#bec9be] transition hover:bg-[#edeeef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparkIcon className="h-4 w-4" />
            {isGenerating ? "Menggenerate..." : "Generate dari chat ini"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(doc.id)}
            className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6]"
          >
            <Icon name="trash" className="h-4 w-4" />
            Hapus
          </button>
        </div>

        <textarea
          value={doc.content}
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder="Tulis dokumen di sini..."
          className="min-h-[50vh] flex-1 resize-none bg-transparent text-base leading-relaxed text-[#191c1d] outline-none placeholder:text-[#6f7a70]"
        />
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { Doc } from "@/lib/docs";

interface DocsListProps {
  docs: Doc[];
  selectedDocId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export default function DocsList({
  docs,
  selectedDocId,
  isLoading,
  onSelect,
  onCreate,
}: DocsListProps) {
  const [search, setSearch] = useState("");
  const filteredDocs = docs.filter((doc) =>
    doc.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-[#bec9be] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#bec9be] p-4">
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#004d27] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#006837]"
        >
          <span className="text-lg leading-none">+</span>
          Dokumen baru
        </button>

        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6f7a70]">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari dokumen..."
            className="w-full rounded-lg border border-[#bec9be] bg-white py-2 pl-8 pr-2 text-sm text-[#191c1d] outline-none transition focus:border-[#004d27]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <p className="px-2 py-3 text-sm font-semibold text-[#6f7a70]">
            Memuat dokumen...
          </p>
        )}

        {!isLoading && filteredDocs.length === 0 && (
          <p className="px-2 py-3 text-sm leading-relaxed text-[#6f7a70]">
            {docs.length === 0
              ? "Belum ada dokumen di workspace ini."
              : "Tidak ada dokumen yang cocok."}
          </p>
        )}

        <div className="space-y-1">
          {filteredDocs.map((doc) => {
            const isActive = doc.id === selectedDocId;
            const snippet = doc.content.split("\n").find((line) => line.trim());

            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelect(doc.id)}
                className={
                  isActive
                    ? "flex w-full flex-col gap-1 rounded-2xl bg-[#004d27]/10 p-3 text-left ring-1 ring-[#004d27]/30"
                    : "flex w-full flex-col gap-1 rounded-2xl p-3 text-left ring-1 ring-transparent transition hover:bg-[#f3f4f5]"
                }
              >
                <span className="flex items-center gap-2">
                  <Icon
                    name="book"
                    className="h-4 w-4 shrink-0 text-[#004d27]"
                  />
                  <span className="truncate text-sm font-bold text-[#191c1d]">
                    {doc.title}
                  </span>
                </span>
                <span className="text-[11px] text-[#6f7a70]">
                  {formatRelativeTime(doc.updatedAt)}
                </span>
                {snippet && (
                  <span className="truncate text-xs text-[#3f4940]">
                    {snippet}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

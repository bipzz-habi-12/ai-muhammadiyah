"use client";

import { useState } from "react";
import LibraryView, { type LibraryItem } from "./LibraryView";
import NotesView, { type NoteItem } from "./NotesView";

// Dua isi Library: Artifact (keluaran AI per-percakapan) dan Catatan
// (Otak Kedua — pengetahuan pengguna yang hidup lintas percakapan).
// Dipisah lewat tab supaya sitemap 10 halaman tetap utuh.

type Tab = "artifacts" | "notes";

export default function LibraryTabs({
  items,
  notes,
}: {
  items: LibraryItem[];
  notes: NoteItem[];
}) {
  const [tab, setTab] = useState<Tab>("artifacts");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "artifacts", label: "Artifact", count: items.length },
    { key: "notes", label: "Catatan", count: notes.length },
  ];

  return (
    <>
      <div
        role="tablist"
        aria-label="Isi Library"
        className="mb-6 flex gap-1 border-b border-[var(--brand-deep-line)]/10"
      >
        {tabs.map((def) => {
          const isActive = def.key === tab;

          return (
            <button
              key={def.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(def.key)}
              className={
                isActive
                  ? "-mb-px border-b-2 border-[var(--brand)] px-4 py-2.5 text-[14px] font-semibold text-[var(--brand)]"
                  : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-[14px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink-soft)]"
              }
            >
              {def.label}
              <span className="ml-1.5 font-medium opacity-60">{def.count}</span>
            </button>
          );
        })}
      </div>

      {tab === "artifacts" ? (
        <LibraryView items={items} />
      ) : (
        <NotesView notes={notes} />
      )}
    </>
  );
}

"use client";

import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { parseSourcesFromText } from "@/lib/web-search";

// Chip sumber web (rebrand fitur "AI bisa mencari di web, user bisa buka
// situsnya"). Sama seperti NoteSuggestions: hanya dirender setelah streaming
// SELESAI (dijaga pemanggil di ChatArea lewat isStreamingMessage) — marker
// [[AI_MU_SOURCES]] baru lengkap di akhir stream, jadi merender lebih awal
// hanya akan menampilkan daftar kosong lalu melompat.
//
// title dari Gemini grounding cuma nama domain ("wikipedia.org"), bukan
// judul artikel asli — lihat catatan di lib/web-search.ts. Chip ditampilkan
// apa adanya sebagai domain, bukan berpura-pura jadi judul halaman.
interface WebSourcesProps {
  messageText: string;
}

export default function WebSources({ messageText }: WebSourcesProps) {
  const parsed = useMemo(() => parseSourcesFromText(messageText), [messageText]);

  if (!parsed || !parsed.sources.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--muted-3)]">
        <Icon name="globe" className="h-3.5 w-3.5" aria-hidden />
        Ditelusuri dari web:
      </span>
      {parsed.sources.map((source, index) => (
        <a
          key={`${source.url}-${index}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[rgba(20,40,30,0.12)] bg-[var(--surface-panel)] px-2.5 py-1 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--background)] hover:text-[var(--brand)]"
        >
          {source.title}
          <Icon name="external" className="h-3 w-3 shrink-0" aria-hidden />
        </a>
      ))}
    </div>
  );
}

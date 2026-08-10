"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { KnowledgeSource } from "@/lib/knowledge";
import type { SettingsTab } from "@/lib/mappers/types";

// Static "Dari Muhammadiyah Hub" — no backend data source (hub_links deferred);
// hrefs hardcoded to official domains (reported to the user).
const hubLinks: { label: string; href: string }[] = [
  { label: "Ensiklopedia Muhammadiyah", href: "https://muhammadiyah.or.id" },
  { label: "Risalah Islam Berkemajuan", href: "https://muhammadiyah.or.id" },
  { label: "Arsip Suara Muhammadiyah", href: "https://suaramuhammadiyah.id" },
];

interface KnowledgeSidebarProps {
  knowledgeSources: KnowledgeSource[];
  isLoadingKnowledge: boolean;
  openSettings: (tab?: SettingsTab) => void;
}

export default function KnowledgeSidebar({
  knowledgeSources,
  isLoadingKnowledge,
  openSettings,
}: KnowledgeSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapsed rail — only the essentials remain (expand, add source).
  if (collapsed) {
    return (
      <aside className="hidden w-[52px] shrink-0 flex-col items-center border-l border-[var(--brand-deep-line)]/10 bg-[var(--surface-alt)] py-4 lg:flex">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Lebarkan Knowledge"
          aria-label="Lebarkan Knowledge"
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] text-base leading-none text-[var(--muted-2)] transition hover:border-[var(--brand)]"
        >
          ‹
        </button>
        <span className="mt-4 text-[var(--brand)]">
          <Icon name="book" className="h-5 w-5" />
        </span>
        <button
          type="button"
          onClick={() => openSettings("knowledge")}
          title="Tambah sumber"
          aria-label="Tambah sumber"
          className="mt-3 grid h-8 w-8 place-items-center rounded-lg border border-dashed border-[var(--brand-deep-line)]/20 text-lg leading-none text-[var(--muted-2)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          +
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-l border-[var(--brand-deep-line)]/10 bg-[var(--surface-alt)] lg:flex">
      <div className="flex items-center justify-between border-b border-[var(--brand-deep-line)]/10 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-2)]">
          Knowledge
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Ciutkan Knowledge"
          aria-label="Ciutkan Knowledge"
          className="grid h-6 w-6 place-items-center rounded-md text-base leading-none text-[var(--muted-2)] transition hover:bg-[var(--brand-deep)]/[0.07]"
        >
          ›
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-2)]">
            Sumber Aktif
          </h3>

          {isLoadingKnowledge && (
            <p className="text-xs font-semibold text-[var(--muted-3)]">Memuat...</p>
          )}

          {!isLoadingKnowledge && knowledgeSources.length === 0 && (
            <p className="text-xs leading-relaxed text-[var(--muted-3)]">
              Belum ada knowledge source aktif.
            </p>
          )}

          <div className="space-y-2">
            {knowledgeSources.map((source) => (
              <div
                key={source.id}
                className="flex items-start gap-2 rounded-lg border border-[var(--brand-deep-line)]/10 bg-[var(--pure-white)] p-2"
              >
                <Icon
                  name={source.originalFileName ? "book" : "link"}
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight text-[var(--ink)]">
                    {source.title}
                  </p>
                  <p className="text-[9px] text-[var(--muted-3)]">
                    {source.fileType.toUpperCase()} •{" "}
                    {source.status === "active" ? "Terindeks" : source.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-2)]">
            Dari Muhammadiyah Hub
          </h3>
          <ul className="space-y-2">
            {hubLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                >
                  <span>{link.label}</span>
                  <Icon name="external" className="h-3 w-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          onClick={() => openSettings("knowledge")}
          className="group mt-6 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--brand-deep-line)]/10 py-2 transition hover:border-[var(--brand)] hover:bg-[var(--brand)]/5"
        >
          <span className="text-lg leading-none text-[var(--muted-2)] group-hover:text-[var(--brand)]">
            +
          </span>
          <span className="text-[10px] font-bold text-[var(--muted-2)] group-hover:text-[var(--brand)]">
            Tambah sumber
          </span>
        </button>
      </div>

      {/* Model Context — static visual only (no real computation), per decision */}
      <div className="border-t border-[var(--brand-deep-line)]/10 bg-[var(--surface-border)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--ink)]">
            Model Context
          </span>
          <span className="text-[10px] font-bold text-[var(--brand)]">12%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--brand-deep)]/10">
          <div className="h-full w-[12%] bg-[var(--brand)]" />
        </div>
      </div>
    </aside>
  );
}

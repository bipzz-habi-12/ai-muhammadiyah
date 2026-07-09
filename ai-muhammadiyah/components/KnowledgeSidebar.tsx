"use client";

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
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-l border-[#bec9be] bg-[#f3f4f5] lg:flex">
      <div className="flex items-center justify-between border-b border-[#bec9be] px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#3f4940]">
          Knowledge
        </h2>
        <Icon name="info" className="h-4 w-4 text-[#3f4940]" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3f4940]">
            Sumber Aktif
          </h3>

          {isLoadingKnowledge && (
            <p className="text-xs font-semibold text-[#6f7a70]">Memuat...</p>
          )}

          {!isLoadingKnowledge && knowledgeSources.length === 0 && (
            <p className="text-xs leading-relaxed text-[#6f7a70]">
              Belum ada knowledge source aktif.
            </p>
          )}

          <div className="space-y-2">
            {knowledgeSources.map((source) => (
              <div
                key={source.id}
                className="flex items-start gap-2 rounded-lg border border-[#bec9be] bg-white p-2"
              >
                <Icon
                  name={source.originalFileName ? "book" : "link"}
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#004d27]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight text-[#191c1d]">
                    {source.title}
                  </p>
                  <p className="text-[9px] text-[#6f7a70]">
                    {source.fileType.toUpperCase()} •{" "}
                    {source.status === "active" ? "Terindeks" : source.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#3f4940]">
            Dari Muhammadiyah Hub
          </h3>
          <ul className="space-y-2">
            {hubLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-[#004d27] hover:underline"
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
          className="group mt-6 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#bec9be] py-2 transition hover:border-[#004d27] hover:bg-[#004d27]/5"
        >
          <span className="text-lg leading-none text-[#3f4940] group-hover:text-[#004d27]">
            +
          </span>
          <span className="text-[10px] font-bold text-[#3f4940] group-hover:text-[#004d27]">
            Tambah sumber
          </span>
        </button>
      </div>

      {/* Model Context — static visual only (no real computation), per decision */}
      <div className="border-t border-[#bec9be] bg-[#e1e3e4] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#191c1d]">
            Model Context
          </span>
          <span className="text-[10px] font-bold text-[#004d27]">12%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#bec9be]">
          <div className="h-full w-[12%] bg-[#004d27]" />
        </div>
      </div>
    </aside>
  );
}

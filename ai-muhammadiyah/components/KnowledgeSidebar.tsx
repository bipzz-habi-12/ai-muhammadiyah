"use client";

import { Icon } from "@/components/icons";
import type { KnowledgeSource } from "@/lib/knowledge";
import type { SettingsTab } from "@/lib/mappers/types";

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
      <div className="flex items-center justify-between border-b border-[#bec9be] px-4 py-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#3f4940]">
          Knowledge
        </h2>
        <Icon name="book" className="h-4 w-4 text-[#3f4940]" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#3f4940]">
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
                name="book"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#004d27]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium leading-tight text-[#191c1d]">
                  {source.title}
                </p>
                <p className="text-[9px] text-[#6f7a70]">
                  {source.fileType.toUpperCase()} - {source.status}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openSettings("knowledge")}
          className="group mt-4 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#bec9be] py-2 transition hover:border-[#004d27] hover:bg-[#004d27]/5"
        >
          <span className="text-lg leading-none text-[#3f4940] group-hover:text-[#004d27]">
            +
          </span>
          <span className="text-[10px] font-bold text-[#3f4940] group-hover:text-[#004d27]">
            Tambah sumber
          </span>
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { formatRelativeTime } from "@/lib/formatting/text";
import type { Canvas } from "@/lib/canvas";

interface CanvasListProps {
  canvases: Canvas[];
  selectedCanvasId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export default function CanvasList({
  canvases,
  selectedCanvasId,
  isLoading,
  onSelect,
  onCreate,
}: CanvasListProps) {
  const [search, setSearch] = useState("");
  const filteredCanvases = canvases.filter((canvas) =>
    canvas.title.toLowerCase().includes(search.trim().toLowerCase()),
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
          Canvas baru
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
            placeholder="Cari canvas..."
            className="w-full rounded-lg border border-[#bec9be] bg-white py-2 pl-8 pr-2 text-sm text-[#191c1d] outline-none transition focus:border-[#004d27]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <p className="px-2 py-3 text-sm font-semibold text-[#6f7a70]">
            Memuat canvas...
          </p>
        )}

        {!isLoading && filteredCanvases.length === 0 && (
          <p className="px-2 py-3 text-sm leading-relaxed text-[#6f7a70]">
            {canvases.length === 0
              ? "Belum ada canvas di workspace ini."
              : "Tidak ada canvas yang cocok."}
          </p>
        )}

        <div className="space-y-1">
          {filteredCanvases.map((canvas) => {
            const isActive = canvas.id === selectedCanvasId;

            return (
              <button
                key={canvas.id}
                type="button"
                onClick={() => onSelect(canvas.id)}
                className={
                  isActive
                    ? "flex w-full flex-col gap-1 rounded-2xl bg-[#004d27]/10 p-3 text-left ring-1 ring-[#004d27]/30"
                    : "flex w-full flex-col gap-1 rounded-2xl p-3 text-left ring-1 ring-transparent transition hover:bg-[#f3f4f5]"
                }
              >
                <span className="flex items-center gap-2">
                  <Icon
                    name="canvas"
                    className="h-4 w-4 shrink-0 text-[#004d27]"
                  />
                  <span className="truncate text-sm font-bold text-[#191c1d]">
                    {canvas.title}
                  </span>
                </span>
                <span className="text-[11px] text-[#6f7a70]">
                  {formatRelativeTime(canvas.updatedAt)}
                </span>
                <span className="truncate text-xs text-[#3f4940]">
                  {canvas.nodes.length} node · {canvas.edges.length} edge
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

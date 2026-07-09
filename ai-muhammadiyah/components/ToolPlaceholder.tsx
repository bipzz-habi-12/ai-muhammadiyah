"use client";

import { Icon } from "@/components/icons";
import type { ActiveTool } from "@/lib/mappers/types";

const toolMeta: Record<
  Exclude<ActiveTool, "chat">,
  { title: string; icon: string; description: string }
> = {
  docs: {
    title: "Docs",
    icon: "book",
    description: "Susun laporan, draft, dan ringkasan riset dari percakapan.",
  },
  tasks: {
    title: "Tasks",
    icon: "tasks",
    description: "Ubah percakapan jadi action items dan checklist.",
  },
  sheets: {
    title: "Sheets",
    icon: "sheets",
    description: "Kelola tabel data dan analisis sederhana.",
  },
  canvas: {
    title: "Canvas",
    icon: "canvas",
    description: "Gambar flowchart, arsitektur, atau diagram lainnya.",
  },
};

interface ToolPlaceholderProps {
  tool: Exclude<ActiveTool, "chat">;
}

export default function ToolPlaceholder({ tool }: ToolPlaceholderProps) {
  const meta = toolMeta[tool];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#004d27]/10 text-[#004d27]">
        <Icon name={meta.icon} className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-[#191c1d]">{meta.title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-[#3f4940]">
        {meta.description}
      </p>
      <p className="rounded-full bg-[#f3f4f5] px-4 py-2 text-sm font-bold text-[#6f7a70]">
        Fitur ini akan segera hadir
      </p>
    </div>
  );
}

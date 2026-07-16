"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/formatting/text";

// Design v2 Library grid: client-side category filter + instant search over the
// artifacts the server already fetched (RLS-scoped). Category slugs mirror the
// artifact types; mini-app types (html_app/react_app) surface here only if any
// exist, since they aren't produced yet.

export type LibraryItem = {
  id: string;
  conversationId: string;
  type: string;
  title: string;
  updatedAt: string;
  workspace: string;
};

type Category = "all" | "dokumen" | "visual" | "kode" | "miniapp";

const typePresentation: Record<
  string,
  { kind: string; icon: string; tint: string; thumbBg: string; tagBg: string; category: Category }
> = {
  document: { kind: "Dokumen", icon: "▤", tint: "#0F5A3D", thumbBg: "#EEF3EE", tagBg: "rgba(15,90,61,0.1)", category: "dokumen" },
  table: { kind: "Tabel", icon: "▦", tint: "#0F5A3D", thumbBg: "#EEF3EE", tagBg: "rgba(15,90,61,0.1)", category: "dokumen" },
  diagram: { kind: "Visual", icon: "◑", tint: "#2E6E8E", thumbBg: "#E8F0F4", tagBg: "rgba(46,110,142,0.14)", category: "visual" },
  code: { kind: "Kode", icon: "⌘", tint: "#3A453E", thumbBg: "#ECEBE4", tagBg: "rgba(20,40,30,0.09)", category: "kode" },
  html_app: { kind: "Mini app", icon: "◧", tint: "#B08833", thumbBg: "#F6EFDD", tagBg: "rgba(176,136,51,0.15)", category: "miniapp" },
  react_app: { kind: "Mini app", icon: "◧", tint: "#B08833", thumbBg: "#F6EFDD", tagBg: "rgba(176,136,51,0.15)", category: "miniapp" },
};

const fallbackPresentation = {
  kind: "Artifact",
  icon: "▤",
  tint: "#0F5A3D",
  thumbBg: "#EEF3EE",
  tagBg: "rgba(15,90,61,0.1)",
  category: "dokumen" as Category,
};

function present(type: string) {
  return typePresentation[type] ?? fallbackPresentation;
}

const filterDefs: { key: Category; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "dokumen", label: "Dokumen" },
  { key: "visual", label: "Visual" },
  { key: "kode", label: "Kode" },
  { key: "miniapp", label: "Mini app" },
];

export default function LibraryView({ items }: { items: LibraryItem[] }) {
  const [filter, setFilter] = useState<Category>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const item of items) {
      const category = present(item.type).category;
      map.set(category, (map.get(category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  // Only show category chips that actually have artifacts (plus "Semua").
  const filters = filterDefs.filter(
    (def) => def.key === "all" || (counts.get(def.key) ?? 0) > 0,
  );

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        filter === "all" || present(item.type).category === filter;
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.workspace.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, filter, search]);

  return (
    <>
      {/* FILTER BAR */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((def) => {
            const count = def.key === "all" ? items.length : counts.get(def.key) ?? 0;
            const isActive = def.key === filter;
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => setFilter(def.key)}
                className={
                  isActive
                    ? "inline-flex items-center gap-1.5 rounded-full bg-[#0f5a3d] px-[15px] py-2 text-[13.5px] font-semibold text-[#f5f3ec]"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[#ece9df] px-[15px] py-2 text-[13.5px] font-semibold text-[#5d6862] transition hover:bg-[#e4e0d2]"
                }
              >
                {def.label}
                <span className="font-medium opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari artifact"
            className="h-10 w-[220px] rounded-[10px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-3.5 text-[13.5px] text-[#16211c] outline-none transition focus:border-[#0f5a3d]"
          />
        </div>
      </div>

      {/* GRID */}
      {shown.length === 0 ? (
        <div className="rounded-[15px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-12 text-center text-sm leading-relaxed text-[#6b746e]">
          {items.length === 0
            ? "Belum ada artifact. Minta AI membuat dokumen, tabel, diagram, atau kode di chat — hasilnya otomatis tersimpan di sini."
            : "Tidak ada artifact yang cocok dengan filter atau pencarianmu."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 [animation:fade_.35s_ease] sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => {
            const style = present(item.type);
            return (
              <Link
                key={item.id}
                href={`/?conversationId=${item.conversationId}`}
                className="group overflow-hidden rounded-[15px] border border-[#0b3d2a]/10 bg-[#fbfaf6] transition duration-150 hover:-translate-y-[3px] hover:border-[#0f5a3d]/35 hover:shadow-[0_16px_34px_-26px_rgba(11,61,42,0.7)]"
              >
                <div
                  className="relative flex h-[120px] items-center justify-center border-b border-[#0b3d2a]/[0.07]"
                  style={{ background: style.thumbBg }}
                >
                  <span className="text-[30px]" style={{ color: style.tint }}>
                    {style.icon}
                  </span>
                  <span
                    className="absolute left-3 top-2.5 rounded-md px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em]"
                    style={{ color: style.tint, background: style.tagBg }}
                  >
                    {style.kind}
                  </span>
                </div>
                <div className="px-[17px] py-[15px]">
                  <div className="mb-[7px] line-clamp-2 text-[14.5px] font-semibold leading-[1.35] text-[#1b2721]">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8a9089]">
                    <span className="truncate">{item.workspace}</span>
                    <span>·</span>
                    <span className="shrink-0">
                      {formatRelativeTime(item.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

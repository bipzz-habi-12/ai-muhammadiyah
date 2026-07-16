"use client";

import { useMemo, useState } from "react";

// Design v2 Muhammadiyah Hub. The indexed, attach-to-chat knowledge base is
// still deferred (no backend yet — see CLAUDE.md hub_links), so this is an
// honest curated directory of the official Muhammadiyah portals the app already
// trusts. Real external links only; no invented documents or "+ Attach" (that
// action needs the deferred Hub↔chat integration). Search + category filter are
// real, operating over this curated list.

type Category = "tarjih" | "pendidikan" | "media" | "organisasi";

type HubResource = {
  title: string;
  meta: string;
  tag: string;
  href: string;
  category: Category;
  icon: string;
  tint: string;
  bg: string;
};

const featured: {
  eyebrow: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  variant: "green" | "cream";
}[] = [
  {
    eyebrow: "Koleksi unggulan",
    title: "Majelis Tarjih & Tajdid",
    desc: "Putusan, fatwa, dan tuntunan resmi Majelis Tarjih — rujukan utama untuk pertanyaan hukum & ibadah.",
    href: "https://tarjih.or.id",
    cta: "Buka portal Tarjih →",
    variant: "green",
  },
  {
    eyebrow: "Koleksi unggulan",
    title: "Portal Resmi Muhammadiyah",
    desc: "Berita, kebijakan, dan informasi resmi Persyarikatan Muhammadiyah.",
    href: "https://muhammadiyah.or.id",
    cta: "Buka muhammadiyah.or.id →",
    variant: "cream",
  },
];

const resources: HubResource[] = [
  {
    title: "Majelis Tarjih & Tajdid",
    meta: "tarjih.or.id · Putusan & fatwa resmi",
    tag: "Tarjih",
    href: "https://tarjih.or.id",
    category: "tarjih",
    icon: "۩",
    tint: "#0F5A3D",
    bg: "rgba(15,90,61,0.1)",
  },
  {
    title: "Portal Resmi Muhammadiyah",
    meta: "muhammadiyah.or.id · Persyarikatan",
    tag: "Organisasi",
    href: "https://muhammadiyah.or.id",
    category: "organisasi",
    icon: "◈",
    tint: "#3A453E",
    bg: "rgba(20,40,30,0.08)",
  },
  {
    title: "Majelis Diktilitbang",
    meta: "diktilitbang.muhammadiyah.or.id · Pendidikan tinggi & penelitian",
    tag: "Pendidikan",
    href: "https://diktilitbang.muhammadiyah.or.id",
    category: "pendidikan",
    icon: "✎",
    tint: "#B08833",
    bg: "rgba(176,136,51,0.14)",
  },
  {
    title: "Suara Muhammadiyah",
    meta: "suaramuhammadiyah.id · Media & literasi",
    tag: "Media",
    href: "https://suaramuhammadiyah.id",
    category: "media",
    icon: "◑",
    tint: "#2E6E8E",
    bg: "rgba(46,110,142,0.13)",
  },
];

const catDefs: { key: "all" | Category; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "tarjih", label: "Tarjih" },
  { key: "pendidikan", label: "Pendidikan" },
  { key: "media", label: "Media" },
  { key: "organisasi", label: "Organisasi" },
];

// Subtle diamond-grid hero texture (inline so it survives the artifact CSP).
const heroPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%23FFFFFF' stroke-opacity='.06' stroke-width='1'%3E%3Crect x='24' y='24' width='48' height='48'/%3E%3Crect x='24' y='24' width='48' height='48' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")";

export default function HubDirectory() {
  const [category, setCategory] = useState<"all" | Category>("all");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesCategory =
        category === "all" || resource.category === category;
      const matchesSearch =
        !query ||
        resource.title.toLowerCase().includes(query) ||
        resource.meta.toLowerCase().includes(query) ||
        resource.tag.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <div className="scroll flex-1 overflow-y-auto bg-[#f5f3ec]">
      {/* HERO BAND */}
      <div
        className="bg-[#0b3d2a] text-[#ede9dc]"
        style={{ backgroundImage: heroPattern, backgroundSize: "96px 96px" }}
      >
        <div className="mx-auto max-w-[1020px] px-6 pb-11 pt-14 sm:px-12">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#c7a560]">
              Muhammadiyah Hub
            </span>
            <span className="rounded-full bg-[#e7c77e] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#0b3d2a]">
              Selalu gratis
            </span>
          </div>
          <h1 className="max-w-[640px] font-serif text-[40px] font-normal leading-[1.14] tracking-[-0.015em] text-[#f3efe2]">
            Sumber pengetahuan resmi Muhammadiyah — terbuka untuk semua.
          </h1>
          <p className="mt-4 max-w-[600px] text-[16.5px] leading-relaxed text-[#b9c3b7]">
            Portal putusan Tarjih, dokumen resmi, dan rujukan Persyarikatan.
            Semuanya bisa kamu buka dan jadikan referensi.
          </p>
          <div className="mt-6 flex max-w-[560px] items-center gap-3 rounded-[13px] border border-white/12 bg-white/[0.06] px-4 py-3.5">
            <span className="text-[17px] text-[#c7a560]" aria-hidden="true">
              ⌕
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari portal, putusan, atau rujukan…"
              className="flex-1 bg-transparent text-[15px] text-[#f3efe2] outline-none placeholder:text-[#8fa091]"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1020px] px-6 pb-20 pt-8 sm:px-12">
        {/* CATEGORY TABS */}
        <div className="mb-7 flex flex-wrap gap-2.5">
          {catDefs.map((def) => {
            const isActive = def.key === category;
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => setCategory(def.key)}
                className={
                  isActive
                    ? "rounded-full bg-[#0f5a3d] px-4 py-2 text-[13.5px] font-semibold text-[#f5f3ec]"
                    : "rounded-full bg-[#ece9df] px-4 py-2 text-[13.5px] font-semibold text-[#5d6862] transition hover:bg-[#e4e0d2]"
                }
              >
                {def.label}
              </button>
            );
          })}
        </div>

        {/* FEATURED */}
        <div className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featured.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className={
                item.variant === "green"
                  ? "block overflow-hidden rounded-[16px] bg-[#0f5a3d] px-7 py-6 text-[#edf2ec] transition hover:brightness-[1.06]"
                  : "block overflow-hidden rounded-[16px] border border-[#0b3d2a]/11 bg-[#fbfaf6] px-7 py-6 transition hover:border-[#0f5a3d]/35"
              }
            >
              <div
                className={
                  item.variant === "green"
                    ? "mb-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#a8d3be]"
                    : "mb-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]"
                }
              >
                {item.eyebrow}
              </div>
              <div
                className={
                  item.variant === "green"
                    ? "mb-2 font-serif text-[23px] leading-[1.28] text-[#f3efe2]"
                    : "mb-2 font-serif text-[23px] leading-[1.28] text-[#12211b]"
                }
              >
                {item.title}
              </div>
              <p
                className={
                  item.variant === "green"
                    ? "text-sm leading-relaxed text-[#c3d3c6]"
                    : "text-sm leading-relaxed text-[#5d6862]"
                }
              >
                {item.desc}
              </p>
              <div
                className={
                  item.variant === "green"
                    ? "mt-4 text-[13px] font-semibold text-[#a8d3be]"
                    : "mt-4 text-[13px] font-semibold text-[#0f5a3d]"
                }
              >
                {item.cta}
              </div>
            </a>
          ))}
        </div>

        {/* DIRECTORY LIST */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
            Portal & sumber resmi
          </span>
          <span className="text-[13px] text-[#8a9089]">
            {shown.length} sumber
          </span>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-10 text-center text-sm leading-relaxed text-[#6b746e]">
            Tidak ada sumber yang cocok dengan pencarianmu.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 [animation:fade_.4s_ease]">
            {shown.map((resource) => (
              <a
                key={resource.href}
                href={resource.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-4 rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-5 py-[17px] transition duration-150 hover:-translate-y-0.5 hover:border-[#0f5a3d]/35"
              >
                <span
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] text-lg"
                  style={{ background: resource.bg, color: resource.tint }}
                >
                  {resource.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 text-[15.5px] font-semibold text-[#1b2721]">
                    {resource.title}
                  </div>
                  <div className="truncate text-[13px] text-[#8a9089]">
                    {resource.meta}
                  </div>
                </div>
                <span className="hidden shrink-0 rounded-full bg-[#0f5a3d]/[0.08] px-[11px] py-1 text-[11.5px] font-semibold text-[#0f5a3d] sm:inline">
                  {resource.tag}
                </span>
                <span className="shrink-0 text-sm font-semibold text-[#0f5a3d]">
                  Buka →
                </span>
              </a>
            ))}
          </div>
        )}

        <p className="mt-8 text-[12.5px] leading-relaxed text-[#8a9089]">
          Hub pengetahuan terindeks yang bisa dicari penuh dan dilampirkan
          langsung ke chat masih dalam pengembangan. Untuk sekarang, ini
          direktori portal resmi Muhammadiyah.
        </p>
      </div>
    </div>
  );
}

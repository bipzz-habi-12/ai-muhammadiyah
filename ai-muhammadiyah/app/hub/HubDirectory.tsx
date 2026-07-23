"use client";

import { useMemo, useState } from "react";
import {
  HUB_CATEGORY_LABELS,
  hubCategoryLabel,
  scoreHubResource,
  type HubResource,
} from "@/lib/hub";
import MarkdownMessage from "@/components/MarkdownMessage";

// Design v2 Muhammadiyah Hub. The directory is backed by the admin-curated
// hub_resources table (fetched server-side in app/hub/page.tsx and passed in).
// Public visitors get search + category filter over that list. Admins
// (isHubAdmin) additionally get an inline CRUD layer wired to /api/hub, so the
// directory can be curated from the app itself — no SQL required.

const HERO_EYEBROW = "Koleksi unggulan";

// Subtle diamond-grid hero texture (inline so it survives the artifact CSP).
const heroPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%23FFFFFF' stroke-opacity='.06' stroke-width='1'%3E%3Crect x='24' y='24' width='48' height='48'/%3E%3Crect x='24' y='24' width='48' height='48' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")";

type HubAskSource = { n: number; title: string; url: string; tag: string | null };
type HubAskRelated = {
  title: string;
  url: string;
  tag: string | null;
  category: string;
};
type HubAskResult = {
  question: string;
  answer: string;
  aiContext: string;
  grounded: boolean;
  sources: HubAskSource[];
  related: HubAskRelated[];
  note?: "no_match" | "no_fetch";
};

type FormState = {
  title: string;
  url: string;
  category: string;
  tag: string;
  meta: string;
  description: string;
  icon: string;
  keywords: string;
  isFeatured: boolean;
  featuredVariant: "green" | "cream";
  featuredCta: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  url: "",
  category: "organisasi",
  tag: "",
  meta: "",
  description: "",
  icon: "",
  keywords: "",
  isFeatured: false,
  featuredVariant: "cream",
  featuredCta: "",
};

function resourceToForm(resource: HubResource): FormState {
  return {
    title: resource.title,
    url: resource.url,
    category: resource.category,
    tag: resource.tag ?? "",
    meta: resource.meta ?? "",
    description: resource.description ?? "",
    icon: resource.icon ?? "",
    keywords: resource.keywords.join(", "),
    isFeatured: resource.isFeatured,
    featuredVariant: resource.featuredVariant ?? "cream",
    featuredCta: resource.featuredCta ?? "",
  };
}

// Rows sourced from the code fallback (table empty / not migrated) carry a
// "fallback-" id and are not real DB rows, so they can't be edited or deleted.
function isRealRow(resource: HubResource) {
  return !resource.id.startsWith("fallback-");
}

// scoreHubResource lives in lib/hub.ts (shared with the Tanya Hub server route).

export default function HubDirectory({
  resources,
  isAdmin,
}: {
  resources: HubResource[];
  isAdmin: boolean;
}) {
  const [list, setList] = useState<HubResource[]>(resources);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  // "Tanya Hub" (ask) state.
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<HubAskResult | null>(null);

  // Admin CRUD state.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const hasFallback = useMemo(
    () => list.some((resource) => !isRealRow(resource)),
    [list],
  );

  const catDefs = useMemo(() => {
    const present = new Set(list.map((resource) => resource.category));
    const knownKeys = Object.keys(HUB_CATEGORY_LABELS).filter((key) =>
      present.has(key),
    );
    const extraKeys = [...present]
      .filter((key) => !(key in HUB_CATEGORY_LABELS))
      .sort();

    return [
      { key: "all", label: "Semua" },
      ...knownKeys.map((key) => ({ key, label: hubCategoryLabel(key) })),
      ...extraKeys.map((key) => ({ key, label: hubCategoryLabel(key) })),
    ];
  }, [list]);

  const featured = useMemo(
    () => list.filter((resource) => resource.isFeatured),
    [list],
  );

  const searching = search.trim().length > 0;

  const shown = useMemo(() => {
    const base = list.filter(
      (resource) => category === "all" || resource.category === category,
    );
    const query = search.trim().toLowerCase();
    if (!query) {
      return base;
    }
    const tokens = query.split(/\s+/).filter(Boolean);
    return base
      .map((resource) => ({
        resource,
        score: scoreHubResource(resource, tokens),
      }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.resource.sortOrder - b.resource.sortOrder,
      )
      .map((entry) => entry.resource);
  }, [list, category, search]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(resource: HubResource) {
    setEditingId(resource.id);
    setForm(resourceToForm(resource));
    setFormError(null);
    setFormOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);

    const payload = {
      title: form.title,
      url: form.url,
      category: form.category,
      tag: form.tag,
      meta: form.meta,
      description: form.description,
      icon: form.icon,
      keywords: form.keywords
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean),
      isFeatured: form.isFeatured,
      featuredVariant: form.isFeatured ? form.featuredVariant : null,
      featuredCta: form.isFeatured ? form.featuredCta : "",
    };

    try {
      const response = await fetch(
        editingId ? `/api/hub/${editingId}` : "/api/hub",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        resource?: HubResource;
      };

      if (!response.ok || !data.resource) {
        setFormError(data.error ?? "Sumber belum bisa disimpan.");
        return;
      }

      const saved = data.resource;
      setList((prev) =>
        editingId
          ? prev.map((resource) =>
              resource.id === saved.id ? saved : resource,
            )
          : [...prev, saved],
      );
      setFormOpen(false);
    } catch {
      setFormError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(resource: HubResource) {
    setBusy(true);
    setRowError(null);
    try {
      const response = await fetch(`/api/hub/${resource.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setRowError(data.error ?? "Sumber belum bisa dihapus.");
        return;
      }
      setList((prev) => prev.filter((item) => item.id !== resource.id));
      setPendingDeleteId(null);
    } catch {
      setRowError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function runAsk() {
    const question = search.trim();
    if (question.length < 8) {
      setAskError("Tulis pertanyaan minimal 8 karakter untuk bertanya.");
      setAnswer(null);
      return;
    }
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const response = await fetch("/api/hub/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json()) as HubAskResult & { error?: string };
      if (!response.ok) {
        setAskError(data.error ?? "Jawaban belum bisa dimuat.");
        return;
      }
      setAnswer(data);
    } catch {
      setAskError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setAsking(false);
    }
  }

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
            {isAdmin && (
              <span className="rounded-full border border-[#e7c77e]/50 px-2.5 py-[3px] text-[11.5px] font-semibold text-[#e7c77e]">
                Mode admin
              </span>
            )}
          </div>
          <h1 className="max-w-[640px] font-serif text-[40px] font-normal leading-[1.14] tracking-[-0.015em] text-[#f3efe2]">
            Sumber pengetahuan resmi Muhammadiyah — terbuka untuk semua.
          </h1>
          <p className="mt-4 max-w-[600px] text-[16.5px] leading-relaxed text-[#b9c3b7]">
            Portal putusan Tarjih, dokumen resmi, dan rujukan Persyarikatan.
            Semuanya bisa kamu buka dan jadikan referensi.
          </p>
          <div className="mt-6 flex max-w-[620px] items-center gap-2 rounded-[13px] border border-white/12 bg-white/[0.06] py-2 pl-4 pr-2">
            <span className="text-[17px] text-[#c7a560]" aria-hidden="true">
              ⌕
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runAsk();
                }
              }}
              placeholder="Cari sumber, atau tanya sesuatu…"
              className="flex-1 bg-transparent text-[15px] text-[#f3efe2] outline-none placeholder:text-[#8fa091]"
            />
            <button
              type="button"
              onClick={runAsk}
              disabled={asking}
              className="shrink-0 rounded-[9px] bg-[#e7c77e] px-3.5 py-1.5 text-[13.5px] font-semibold text-[#0b3d2a] transition hover:brightness-[1.05] disabled:opacity-60"
            >
              {asking ? "…" : "✦ Tanya"}
            </button>
          </div>
          <p className="mt-2 max-w-[620px] text-[12.5px] text-[#8fa091]">
            Ketik lalu tekan Enter untuk mencari daftar sumber, atau{" "}
            <b className="text-[#c7a560]">✦ Tanya</b> untuk jawaban ringkas
            berdasar rujukan Tarjih (pandangan Muhammadiyah).
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1020px] px-6 pb-20 pt-8 sm:px-12">
        {/* TANYA HUB — answer panel */}
        {(asking || askError || answer) && (
          <div className="mb-8 rounded-[18px] border border-[#0b3d2a]/12 bg-[#fbfaf6] p-6 [animation:fade_.4s_ease]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]">
                  ✦ Tanya Hub
                </div>
                {answer?.question && (
                  <div className="mt-1 font-serif text-[19px] leading-snug text-[#16211c]">
                    {answer.question}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAnswer(null);
                  setAskError(null);
                }}
                className="shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold text-[#8a9089] transition hover:bg-[#ece9df]"
              >
                Tutup
              </button>
            </div>

            {asking && (
              <div className="flex items-center gap-2 py-3 text-[14px] text-[#5d6862]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#0f5a3d]" />
                Menyusun jawaban dari rujukan Tarjih…
              </div>
            )}

            {askError && !asking && (
              <div className="rounded-[11px] border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-4 py-3 text-[13px] text-[#93000a]">
                {askError}
              </div>
            )}

            {answer && !asking && (
              <div>
                <div
                  className={
                    answer.grounded
                      ? "mb-3 inline-flex rounded-full bg-[#0f5a3d]/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0f5a3d]"
                      : "mb-3 inline-flex rounded-full bg-[#e7c77e]/20 px-2.5 py-1 text-[11.5px] font-semibold text-[#8a6a1f]"
                  }
                >
                  {answer.grounded
                    ? "Berdasarkan rujukan Tarjih di bawah"
                    : "Dari pengetahuan AI — verifikasi ke sumber resmi"}
                </div>

                {answer.answer && (
                  <div className="text-[15px] leading-relaxed text-[#25302a]">
                    <MarkdownMessage text={answer.answer} />
                  </div>
                )}

                {answer.aiContext && (
                  <div className="mt-4 rounded-[13px] border border-[#e7c77e]/40 bg-[#e7c77e]/10 p-4">
                    <div className="mb-1.5 text-[12px] font-semibold text-[#8a6a1f]">
                      ✦ Konteks dari pengetahuan AI (bukan dari sumber —
                      verifikasi mandiri)
                    </div>
                    <div className="text-[14px] leading-relaxed text-[#3f4940]">
                      <MarkdownMessage text={answer.aiContext} />
                    </div>
                  </div>
                )}

                {(answer.sources.length > 0 || answer.related.length > 0) && (
                  <div className="mt-5">
                    <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
                      {answer.grounded ? "Rujukan" : "Sumber terkait"}
                    </div>
                    <div className="flex flex-col gap-2">
                      {answer.grounded
                        ? answer.sources.map((source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex items-center gap-3 rounded-[11px] border border-[#0b3d2a]/10 bg-[#f7f5ee] px-4 py-2.5 transition hover:border-[#0f5a3d]/35"
                            >
                              <span className="shrink-0 text-[13px] font-bold text-[#0f5a3d]">
                                [{source.n}]
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#1b2721]">
                                {source.title}
                              </span>
                              {source.tag && (
                                <span className="hidden shrink-0 rounded-full bg-[#0f5a3d]/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f5a3d] sm:inline">
                                  {source.tag}
                                </span>
                              )}
                              <span className="shrink-0 text-[13px] font-semibold text-[#0f5a3d]">
                                Buka →
                              </span>
                            </a>
                          ))
                        : answer.related.map((source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex items-center gap-3 rounded-[11px] border border-[#0b3d2a]/10 bg-[#f7f5ee] px-4 py-2.5 transition hover:border-[#0f5a3d]/35"
                            >
                              <span className="shrink-0 text-[13px] text-[#0f5a3d]">
                                ◆
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#1b2721]">
                                {source.title}
                              </span>
                              {source.tag && (
                                <span className="hidden shrink-0 rounded-full bg-[#0f5a3d]/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f5a3d] sm:inline">
                                  {source.tag}
                                </span>
                              )}
                              <span className="shrink-0 text-[13px] font-semibold text-[#0f5a3d]">
                                Buka →
                              </span>
                            </a>
                          ))}
                    </div>
                  </div>
                )}

                <p className="mt-4 text-[12px] leading-relaxed text-[#8a9089]">
                  Jawaban dirangkai AI dan bisa keliru — untuk keputusan
                  hukum/ibadah, rujuk langsung sumber resmi Tarjih di atas.
                </p>
              </div>
            )}
          </div>
        )}

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

        {/* FEATURED — hidden during an active search so results stay focused */}
        {featured.length > 0 && !searching && (
          <div className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featured.map((item) => {
              const variant = item.featuredVariant ?? "cream";
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={
                    variant === "green"
                      ? "block overflow-hidden rounded-[16px] bg-[#0f5a3d] px-7 py-6 text-[#edf2ec] transition hover:brightness-[1.06]"
                      : "block overflow-hidden rounded-[16px] border border-[#0b3d2a]/11 bg-[#fbfaf6] px-7 py-6 transition hover:border-[#0f5a3d]/35"
                  }
                >
                  <div
                    className={
                      variant === "green"
                        ? "mb-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#a8d3be]"
                        : "mb-3 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]"
                    }
                  >
                    {HERO_EYEBROW}
                  </div>
                  <div
                    className={
                      variant === "green"
                        ? "mb-2 font-serif text-[23px] leading-[1.28] text-[#f3efe2]"
                        : "mb-2 font-serif text-[23px] leading-[1.28] text-[#12211b]"
                    }
                  >
                    {item.title}
                  </div>
                  <p
                    className={
                      variant === "green"
                        ? "text-sm leading-relaxed text-[#c3d3c6]"
                        : "text-sm leading-relaxed text-[#5d6862]"
                    }
                  >
                    {item.description ?? item.meta ?? ""}
                  </p>
                  <div
                    className={
                      variant === "green"
                        ? "mt-4 text-[13px] font-semibold text-[#a8d3be]"
                        : "mt-4 text-[13px] font-semibold text-[#0f5a3d]"
                    }
                  >
                    {item.featuredCta ?? "Buka →"}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* DIRECTORY LIST */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
            Portal & sumber resmi
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#8a9089]">
              {shown.length} sumber
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-full bg-[#0f5a3d] px-3.5 py-1.5 text-[13px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
              >
                + Tambah sumber
              </button>
            )}
          </div>
        </div>

        {isAdmin && hasFallback && (
          <div className="mb-4 rounded-[11px] border border-[#b08833]/30 bg-[#e7c77e]/12 px-4 py-3 text-[12.5px] leading-relaxed text-[#8a6a1f]">
            Sebagian item di bawah masih data bawaan (belum dari database).
            Jalankan migrasi <code>20260722000000_hub_resources.sql</code> +
            seed-nya agar semua sumber bisa dikelola dari sini.
          </div>
        )}

        {rowError && (
          <div className="mb-4 rounded-[11px] border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-4 py-3 text-[12.5px] text-[#93000a]">
            {rowError}
          </div>
        )}

        {shown.length === 0 ? (
          <div className="rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-10 text-center text-sm leading-relaxed text-[#6b746e]">
            Tidak ada sumber yang cocok dengan pencarianmu.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 [animation:fade_.4s_ease]">
            {shown.map((resource) => {
              const editable = isAdmin && isRealRow(resource);
              return (
                <div
                  key={resource.id}
                  className="flex items-center gap-4 rounded-[13px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-5 py-[17px] transition duration-150 hover:border-[#0f5a3d]/35"
                >
                  <span
                    className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] text-lg"
                    style={{
                      background: resource.bg ?? "rgba(15,90,61,0.1)",
                      color: resource.tint ?? "#0F5A3D",
                    }}
                  >
                    {resource.icon ?? "◆"}
                  </span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 flex-1"
                  >
                    <div className="mb-0.5 text-[15.5px] font-semibold text-[#1b2721]">
                      {resource.title}
                    </div>
                    <div className="truncate text-[13px] text-[#8a9089]">
                      {resource.meta ?? resource.url}
                    </div>
                  </a>
                  {resource.tag && (
                    <span className="hidden shrink-0 rounded-full bg-[#0f5a3d]/[0.08] px-[11px] py-1 text-[11.5px] font-semibold text-[#0f5a3d] sm:inline">
                      {resource.tag}
                    </span>
                  )}

                  {editable ? (
                    pendingDeleteId === resource.id ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="hidden text-[12px] text-[#8a9089] sm:inline">
                          Hapus?
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => confirmDelete(resource)}
                          className="rounded-full bg-[#ba1a1a] px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-[#93000a] disabled:opacity-50"
                        >
                          Ya
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-full bg-[#ece9df] px-2.5 py-1 text-[12px] font-semibold text-[#5d6862] transition hover:bg-[#e4e0d2]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(resource)}
                          className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-[#0f5a3d] transition hover:bg-[#0f5a3d]/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRowError(null);
                            setPendingDeleteId(resource.id);
                          }}
                          className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-[#93000a] transition hover:bg-[#ba1a1a]/10"
                        >
                          Hapus
                        </button>
                      </div>
                    )
                  ) : (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 text-sm font-semibold text-[#0f5a3d]"
                    >
                      Buka →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-[12.5px] leading-relaxed text-[#8a9089]">
          Hub pengetahuan terindeks yang bisa dicari penuh dan dilampirkan
          langsung ke chat masih dalam pengembangan. Untuk sekarang, ini
          direktori portal resmi Muhammadiyah.
        </p>
      </div>

      {/* ADMIN FORM MODAL */}
      {isAdmin && formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#16211c]/40 px-4 py-10"
          onClick={() => !busy && setFormOpen(false)}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={submitForm}
            className="w-full max-w-[520px] rounded-[20px] border border-[#0b3d2a]/12 bg-[#f7f5ee] p-6 shadow-[0_16px_48px_rgba(20,40,30,0.18)]"
          >
            <div className="mb-1 font-serif text-[22px] text-[#16211c]">
              {editingId ? "Edit sumber Hub" : "Tambah sumber Hub"}
            </div>
            <p className="mb-5 text-[13px] text-[#8a9089]">
              Sumber tersimpan ke direktori publik Muhammadiyah Hub.
            </p>

            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#5d6862]">
                  Judul <span className="text-[#ba1a1a]">*</span>
                </span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                  placeholder="Majelis Tarjih & Tajdid"
                  className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#5d6862]">
                  URL <span className="text-[#ba1a1a]">*</span>
                </span>
                <input
                  value={form.url}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, url: event.target.value }))
                  }
                  required
                  inputMode="url"
                  placeholder="https://tarjih.or.id"
                  className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[12.5px] font-semibold text-[#5d6862]">
                    Kategori
                  </span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                    className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                  >
                    {Object.keys(HUB_CATEGORY_LABELS).map((key) => (
                      <option key={key} value={key}>
                        {hubCategoryLabel(key)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[12.5px] font-semibold text-[#5d6862]">
                    Label (tag)
                  </span>
                  <input
                    value={form.tag}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, tag: event.target.value }))
                    }
                    placeholder="Tarjih"
                    className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#5d6862]">
                  Subjudul kecil (meta)
                </span>
                <input
                  value={form.meta}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, meta: event.target.value }))
                  }
                  placeholder="tarjih.or.id · Putusan & fatwa resmi"
                  className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#5d6862]">
                  Deskripsi
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Ringkasan singkat isi portal ini…"
                  className="resize-none rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#5d6862]">
                  Ikon (1 karakter, opsional)
                </span>
                <input
                  value={form.icon}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, icon: event.target.value }))
                  }
                  maxLength={4}
                  placeholder="۩"
                  className="w-24 rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] font-semibold text-[#5d6862]">
                  Kata kunci pencarian (pisahkan koma)
                </span>
                <input
                  value={form.keywords}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      keywords: event.target.value,
                    }))
                  }
                  placeholder="sholat, salat, gerhana, kusufain"
                  className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
                <span className="text-[11.5px] text-[#8a9089]">
                  Bantu sumber ini muncul walau ejaannya beda (sholat/salat/shalat).
                </span>
              </label>

              <label className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isFeatured: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#0f5a3d]"
                />
                <span className="text-[13px] font-semibold text-[#5d6862]">
                  Tampilkan sebagai kartu unggulan
                </span>
              </label>

              {form.isFeatured && (
                <div className="grid grid-cols-2 gap-3.5 rounded-[11px] bg-[#0f5a3d]/[0.05] p-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[12.5px] font-semibold text-[#5d6862]">
                      Warna kartu
                    </span>
                    <select
                      value={form.featuredVariant}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          featuredVariant: event.target.value as
                            | "green"
                            | "cream",
                        }))
                      }
                      className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                    >
                      <option value="cream">Krem</option>
                      <option value="green">Hijau</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12.5px] font-semibold text-[#5d6862]">
                      Teks tombol
                    </span>
                    <input
                      value={form.featuredCta}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          featuredCta: event.target.value,
                        }))
                      }
                      placeholder="Buka portal →"
                      className="rounded-[10px] border border-[#0b3d2a]/12 bg-[#fbfaf6] px-3 py-2 text-[14px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                    />
                  </label>
                </div>
              )}
            </div>

            {formError && (
              <div className="mt-4 rounded-[10px] border border-[#ba1a1a]/25 bg-[#ffdad6]/50 px-3 py-2 text-[12.5px] text-[#93000a]">
                {formError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={busy}
                className="rounded-full px-4 py-2 text-[13.5px] font-semibold text-[#5d6862] transition hover:bg-[#ece9df] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[#0f5a3d] px-5 py-2 text-[13.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:opacity-50"
              >
                {busy ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Tambah"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

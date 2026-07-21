"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MarkdownMessage from "@/components/MarkdownMessage";

// Research workbench. Flow: ask -> OpenAlex literature + grounded synthesis.
// The user can then CURATE the evidence base — add their own sources, remove
// ones they don't want — and re-run the synthesis ("Simpulkan ulang"), and can
// EDIT the synthesis prose directly before saving it as an artifact. Citations
// always map to the numbered sources shown; nothing is fabricated.

type FindingSignal = "up" | "mixed" | "caution";
type KeyFinding = { signal: FindingSignal; text: string };

type ResearchSource = {
  n: number;
  title: string;
  authors: string;
  venue: string;
  year: number | null;
  url: string;
  citedByCount: number;
  abstract: string;
  userAdded?: boolean;
};

type ResearchResponse = {
  question: string;
  synthesis: string;
  keyFindings: KeyFinding[];
  sources: ResearchSource[];
  note?: "no_sources";
  error?: string;
};

const signalStyles: Record<FindingSignal, { glyph: string; color: string }> = {
  up: { glyph: "↑", color: "#3A9D6B" },
  mixed: { glyph: "≈", color: "#B08833" },
  caution: { glyph: "!", color: "#C0553F" },
};

function renumber(sources: ResearchSource[]): ResearchSource[] {
  return sources.map((source, index) => ({ ...source, n: index + 1 }));
}

export default function ResearchWorkbench() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "idle",
  );
  const [error, setError] = useState("");
  const [noSources, setNoSources] = useState(false);

  const [inquiryQuestion, setInquiryQuestion] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [keyFindings, setKeyFindings] = useState<KeyFinding[]>([]);
  const [sourcesDirty, setSourcesDirty] = useState(false);
  const [resynthesizing, setResynthesizing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // add-source form
  const [addOpen, setAddOpen] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aAuthors, setAAuthors] = useState("");
  const [aYear, setAYear] = useState("");
  const [aContent, setAContent] = useState("");

  function applyResult(data: ResearchResponse) {
    setInquiryQuestion(data.question);
    setSources(data.sources ?? []);
    setSynthesis(data.synthesis ?? "");
    setKeyFindings(data.keyFindings ?? []);
    setSourcesDirty(false);
    setEditing(false);
    setSavedId(null);
  }

  async function callSynthesis(
    payload: { question: string; sources?: ResearchSource[] },
  ): Promise<ResearchResponse | null> {
    const response = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as ResearchResponse;
    if (!response.ok) {
      setError(data.error ?? "Riset gagal. Coba lagi.");
      return null;
    }
    return data;
  }

  async function runInquiry() {
    const text = question.trim();
    if (text.length < 8 || status === "loading") {
      return;
    }
    setStatus("loading");
    setError("");
    setNoSources(false);

    try {
      const data = await callSynthesis({ question: text });
      if (!data) {
        setStatus("error");
        return;
      }
      if (data.note === "no_sources") {
        setNoSources(true);
        setInquiryQuestion(text);
        setSources([]);
        setSynthesis("");
        setKeyFindings([]);
        setStatus("ready");
        return;
      }
      applyResult(data);
      setStatus("ready");
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
      setStatus("error");
    }
  }

  async function resynthesize() {
    if (resynthesizing || sources.length === 0) {
      return;
    }
    setResynthesizing(true);
    setError("");
    try {
      const data = await callSynthesis({
        question: inquiryQuestion,
        sources,
      });
      if (data && data.note !== "no_sources") {
        applyResult(data);
      }
    } catch {
      setError("Gagal menyusun ulang. Coba lagi.");
    } finally {
      setResynthesizing(false);
    }
  }

  function addSource() {
    const title = aTitle.trim();
    if (!title) {
      return;
    }
    const yearNum = Number.parseInt(aYear.trim(), 10);
    const next: ResearchSource = {
      n: sources.length + 1,
      title,
      authors: aAuthors.trim(),
      venue: "",
      year: Number.isFinite(yearNum) ? yearNum : null,
      url: "",
      citedByCount: 0,
      abstract: aContent.trim(),
      userAdded: true,
    };
    setSources((prev) => renumber([...prev, next]));
    setSourcesDirty(true);
    setATitle("");
    setAAuthors("");
    setAYear("");
    setAContent("");
    setAddOpen(false);
  }

  function removeSource(n: number) {
    setSources((prev) => renumber(prev.filter((source) => source.n !== n)));
    setSourcesDirty(true);
  }

  function startEdit() {
    setDraft(synthesis);
    setEditing(true);
  }

  function saveEdit() {
    setSynthesis(draft);
    setEditing(false);
  }

  async function saveArtifact() {
    if (saving || sources.length === 0 || !synthesis.trim()) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/research/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: inquiryQuestion, synthesis, sources }),
      });
      const data = await response.json();
      if (response.ok && data.conversationId) {
        setSavedId(data.conversationId as string);
      } else {
        setError(data.error ?? "Gagal menyimpan.");
      }
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  function exportCitations() {
    const lines = sources.map((source) => {
      const meta = [source.venue, source.year].filter(Boolean).join(", ");
      return `[${source.n}] ${source.authors}. ${source.title}.${
        meta ? ` ${meta}.` : ""
      }${source.url ? ` ${source.url}` : ""}`;
    });
    const blob = new Blob([`# ${inquiryQuestion}\n\n${lines.join("\n")}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sitasi-riset.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const userAddedCount = sources.filter((source) => source.userAdded).length;
  const hasResult = status === "ready" && sources.length > 0;

  return (
    <div>
      {/* ASK BAR */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runInquiry();
        }}
        className="mb-8 flex items-center gap-3.5 rounded-[16px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-4 py-3.5 shadow-[0_10px_30px_-26px_rgba(11,61,42,0.6)] transition focus-within:border-[#0f5a3d]"
      >
        <span className="flex text-[#0f5a3d]" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
        </span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ajukan pertanyaan riset — sintesis kembali dengan sitasi bernomor…"
          className="min-w-0 flex-1 bg-transparent text-[15.5px] text-[#16211c] outline-none placeholder:text-[#9aa099]"
        />
        <span className="hidden shrink-0 rounded-full bg-[#0f5a3d]/[0.08] px-[11px] py-1.5 text-xs font-semibold text-[#0f5a3d] [font-family:ui-monospace,monospace] sm:inline">
          OpenAlex
        </span>
        <button
          type="submit"
          disabled={question.trim().length < 8 || status === "loading"}
          aria-label="Mulai riset"
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[#0f5a3d] text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "…" : "↑"}
        </button>
      </form>

      {status === "loading" && (
        <div className="mb-8 flex items-center gap-3 rounded-[14px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-5 py-4 text-sm text-[#5d6862]">
          <span className="inline-flex gap-1" aria-hidden="true">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f5a3d]" />
          </span>
          Mencari literatur nyata &amp; menyusun sintesis…
        </div>
      )}

      {status === "error" && (
        <p className="mb-8 rounded-[14px] bg-[#ffdad6] px-5 py-4 text-sm font-semibold text-[#93000a]">
          {error}
        </p>
      )}

      {status === "ready" && noSources && (
        <div className="mb-6 rounded-[14px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-6 py-8 text-center text-sm leading-relaxed text-[#6b746e]">
          Tidak ada literatur otomatis yang cocok. Kamu masih bisa menambah
          sumbermu sendiri di bawah, lalu tekan{" "}
          <span className="font-semibold text-[#0f5a3d]">Simpulkan ulang</span>.
        </div>
      )}

      {(hasResult || (status === "ready" && noSources)) && (
        <div className="grid gap-7 lg:grid-cols-[1.55fr_1fr]">
          {/* FINDINGS */}
          <div>
            {hasResult ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full bg-[#0f5a3d]/[0.09] px-[11px] py-1 text-xs font-semibold text-[#0f5a3d]">
                    Disintesis
                  </span>
                  <span className="text-[12.5px] text-[#8a9089]">
                    {sources.length} sumber
                    {userAddedCount > 0
                      ? ` · ${userAddedCount} ditambahkan olehmu`
                      : " nyata dari OpenAlex"}
                  </span>
                </div>
                <h2 className="mb-5 font-serif text-[24px] font-medium leading-snug tracking-[-0.01em] text-[#12211b] sm:text-[26px]">
                  {inquiryQuestion}
                </h2>

                {editing ? (
                  <div>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className="h-64 w-full resize-y rounded-[12px] border border-[#0b3d2a]/16 bg-[#fbfaf6] px-4 py-3 text-[15px] leading-relaxed text-[#25302a] outline-none transition focus:border-[#0f5a3d]"
                    />
                    <div className="mt-2.5 flex gap-2.5">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="h-9 rounded-[10px] bg-[#0f5a3d] px-4 text-[13.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
                      >
                        Simpan edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="h-9 rounded-[10px] border border-[#0b3d2a]/16 px-4 text-[13.5px] font-semibold text-[#25302a]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[15.5px] leading-relaxed text-[#2a342e] [&_a]:text-[#0f5a3d] [&_strong]:font-semibold">
                    <MarkdownMessage text={synthesis} />
                  </div>
                )}

                {keyFindings.length > 0 && !editing && (
                  <div className="mt-7">
                    <div className="mb-3.5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
                      Temuan utama
                    </div>
                    <div className="flex flex-col gap-3">
                      {keyFindings.map((finding, index) => (
                        <div
                          key={index}
                          className="flex gap-3 rounded-[12px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3.5"
                        >
                          <span
                            className="shrink-0 font-bold"
                            style={{ color: signalStyles[finding.signal].color }}
                            aria-hidden="true"
                          >
                            {signalStyles[finding.signal].glyph}
                          </span>
                          <div className="text-[14.5px] leading-relaxed text-[#2a342e]">
                            {finding.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!editing && (
                  <div className="mt-6 flex flex-wrap items-center gap-2.5">
                    {savedId ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/?conversationId=${savedId}`)}
                        className="flex h-10 items-center gap-2 rounded-[10px] bg-[#0f5a3d] px-4 text-[13.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a]"
                      >
                        Buka di chat →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={saveArtifact}
                        disabled={saving}
                        className="flex h-10 items-center gap-2 rounded-[10px] bg-[#0f5a3d] px-4 text-[13.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        ◧ {saving ? "Menyimpan…" : "Simpan sebagai artifact"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={startEdit}
                      className="flex h-10 items-center gap-2 rounded-[10px] border border-[#0b3d2a]/14 bg-[#fbfaf6] px-4 text-[13.5px] font-semibold text-[#25302a] transition hover:border-[#0f5a3d]"
                    >
                      Edit sintesis
                    </button>
                    <button
                      type="button"
                      onClick={exportCitations}
                      className="flex h-10 items-center gap-2 rounded-[10px] border border-[#0b3d2a]/14 bg-[#fbfaf6] px-4 text-[13.5px] font-semibold text-[#25302a] transition hover:border-[#0f5a3d]"
                    >
                      Export sitasi
                    </button>
                    {savedId && (
                      <span className="text-[13px] font-medium text-[#0f5a3d]">
                        Tersimpan ke Library.
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <h2 className="mb-5 font-serif text-[24px] font-medium leading-snug tracking-[-0.01em] text-[#12211b]">
                {inquiryQuestion}
              </h2>
            )}
          </div>

          {/* SOURCES */}
          <div>
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
                Sumber · {sources.length}
              </span>
              <button
                type="button"
                onClick={() => setAddOpen((open) => !open)}
                className="rounded-lg border border-[#0b3d2a]/14 bg-[#fbfaf6] px-2.5 py-1 text-[12px] font-semibold text-[#0f5a3d] transition hover:border-[#0f5a3d]"
              >
                + Tambah sumber
              </button>
            </div>

            {sourcesDirty && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-[11px] border border-[#b08833]/30 bg-[#e7c77e]/15 px-3.5 py-2.5">
                <span className="text-[12.5px] font-medium text-[#8a6a1f]">
                  Sumber berubah — simpulkan ulang agar sintesis akurat.
                </span>
                <button
                  type="button"
                  onClick={resynthesize}
                  disabled={resynthesizing}
                  className="shrink-0 rounded-lg bg-[#0f5a3d] px-3 py-1.5 text-[12.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:opacity-60"
                >
                  {resynthesizing ? "Menyusun…" : "Simpulkan ulang"}
                </button>
              </div>
            )}

            {addOpen && (
              <div className="mb-3 rounded-[12px] border border-[#0b3d2a]/12 bg-[#fbfaf6] p-3.5">
                <input
                  value={aTitle}
                  onChange={(event) => setATitle(event.target.value)}
                  placeholder="Judul sumber *"
                  className="mb-2 h-9 w-full rounded-lg border border-[#0b3d2a]/14 bg-white px-3 text-[13px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                />
                <div className="mb-2 flex gap-2">
                  <input
                    value={aAuthors}
                    onChange={(event) => setAAuthors(event.target.value)}
                    placeholder="Penulis"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[#0b3d2a]/14 bg-white px-3 text-[13px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                  />
                  <input
                    value={aYear}
                    onChange={(event) => setAYear(event.target.value)}
                    placeholder="Tahun"
                    inputMode="numeric"
                    className="h-9 w-20 shrink-0 rounded-lg border border-[#0b3d2a]/14 bg-white px-3 text-[13px] text-[#16211c] outline-none focus:border-[#0f5a3d]"
                  />
                </div>
                <textarea
                  value={aContent}
                  onChange={(event) => setAContent(event.target.value)}
                  placeholder="Kutipan / abstrak / catatan yang harus dibaca AI…"
                  className="h-24 w-full resize-none rounded-lg border border-[#0b3d2a]/14 bg-white px-3 py-2 text-[13px] leading-relaxed text-[#25302a] outline-none focus:border-[#0f5a3d]"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={addSource}
                    disabled={!aTitle.trim()}
                    className="h-8 rounded-lg bg-[#0f5a3d] px-3.5 text-[12.5px] font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:opacity-50"
                  >
                    Tambah
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="h-8 rounded-lg border border-[#0b3d2a]/16 px-3.5 text-[12.5px] font-semibold text-[#25302a]"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {sources.map((source) => {
                const meta = [source.authors, source.venue, source.year]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={source.n}
                    className="group relative rounded-[12px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3.5"
                  >
                    <div className="flex gap-2.5">
                      <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-[#0f5a3d]/10 text-[11px] font-bold text-[#0f5a3d]">
                        {source.n}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start gap-2">
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[13.5px] font-semibold leading-snug text-[#25302a] hover:text-[#0f5a3d]"
                            >
                              {source.title}
                            </a>
                          ) : (
                            <span className="text-[13.5px] font-semibold leading-snug text-[#25302a]">
                              {source.title}
                            </span>
                          )}
                          {source.userAdded && (
                            <span className="mt-0.5 shrink-0 rounded-full bg-[#b08833]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a6a1f]">
                              Milikmu
                            </span>
                          )}
                        </div>
                        {meta && (
                          <div className="text-[12px] text-[#8a9089]">{meta}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSource(source.n)}
                        aria-label={`Hapus sumber ${source.n}`}
                        title="Hapus sumber"
                        className="shrink-0 rounded-md px-1.5 text-[#9aa099] opacity-0 transition hover:bg-[#0b3d2a]/[0.06] hover:text-[#c0553f] focus:opacity-100 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
              {sources.length === 0 && (
                <p className="rounded-[12px] border border-dashed border-[#0b3d2a]/15 px-4 py-6 text-center text-[13px] text-[#8a9089]">
                  Belum ada sumber. Tambahkan sumbermu lalu simpulkan ulang.
                </p>
              )}
            </div>

            {sources.length > 0 && (
              <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-[#9aa099]">
                Sintesis mengutip abstrak/kutipan sumber di atas — verifikasi teks
                penuh sebelum dikutip resmi.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

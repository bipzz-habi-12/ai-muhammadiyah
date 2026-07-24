"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MarkdownMessage from "@/components/MarkdownMessage";

// Deep-research workbench. Not a one-shot Q&A: each question runs a 3-stage
// funnel server-side (plan sub-queries -> sweep a few hundred real works ->
// screen down to the abstracts actually read), and answers accumulate into a
// research THREAD. Follow-up questions sweep again and carry the working source
// set forward, so the bibliography grows. The user can add/remove sources and
// re-synthesise, and edit the prose. Citations always map to the numbered
// sources of that turn; the AI's own uncited knowledge is a separate block.

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
  aiContext: string;
  keyFindings: KeyFinding[];
  sources: ResearchSource[];
  searchedCount: number;
  readCount: number;
  subQueries: string[];
  note?: "no_sources";
  error?: string;
};

type Turn = {
  id: string;
  question: string;
  synthesis: string;
  aiContext: string;
  keyFindings: KeyFinding[];
  sources: ResearchSource[];
  searchedCount: number;
  readCount: number;
  subQueries: string[];
};

const signalStyles: Record<FindingSignal, { glyph: string; color: string }> = {
  up: { glyph: "↑", color: "#3A9D6B" },
  mixed: { glyph: "≈", color: "#B08833" },
  caution: { glyph: "!", color: "#C0553F" },
};

function renumber(sources: ResearchSource[]): ResearchSource[] {
  return sources.map((source, index) => ({ ...source, n: index + 1 }));
}

function sourceKey(source: ResearchSource): string {
  return (source.url || source.title).toLowerCase().trim();
}

function citationLine(source: ResearchSource): string {
  const meta = [source.venue, source.year].filter(Boolean).join(", ");
  return `[${source.n}] ${source.authors}. ${source.title}.${
    meta ? ` ${meta}.` : ""
  }${source.url ? ` ${source.url}` : ""}`;
}

export default function ResearchWorkbench() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const [turns, setTurns] = useState<Turn[]>([]);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [seenKeys, setSeenKeys] = useState<string[]>([]);
  const [sourcesDirty, setSourcesDirty] = useState(false);
  const [resynthesizing, setResynthesizing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aAuthors, setAAuthors] = useState("");
  const [aYear, setAYear] = useState("");
  const [aContent, setAContent] = useState("");

  const latest = turns.at(-1) ?? null;
  const hasThread = turns.length > 0;

  function mergeSeen(next: ResearchSource[]) {
    setSeenKeys((prev) => [
      ...new Set([...prev, ...next.map((source) => sourceKey(source))]),
    ]);
  }

  async function callResearch(payload: {
    question: string;
    sources?: ResearchSource[];
    mode: "deep" | "resynthesize";
  }): Promise<ResearchResponse | null> {
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

  async function ask() {
    const text = question.trim();
    if (text.length < 8 || status === "loading") {
      return;
    }
    setStatus("loading");
    setError("");

    try {
      const data = await callResearch({
        question: text,
        sources, // carry the working set forward
        mode: "deep",
      });
      if (!data) {
        setStatus("error");
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          question: data.question,
          synthesis: data.synthesis ?? "",
          aiContext: data.aiContext ?? "",
          keyFindings: data.keyFindings ?? [],
          sources: data.sources ?? [],
          searchedCount: data.searchedCount ?? 0,
          readCount: data.readCount ?? 0,
          subQueries: data.subQueries ?? [],
        },
      ]);
      setSources(data.sources ?? []);
      mergeSeen(data.sources ?? []);
      setQuestion("");
      setSourcesDirty(false);
      setEditing(false);
      setSavedId(null);
      setStatus("idle");
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
      setStatus("error");
    }
  }

  async function resynthesize() {
    if (!latest || resynthesizing || sources.length === 0) {
      return;
    }
    setResynthesizing(true);
    setError("");
    try {
      const data = await callResearch({
        question: latest.question,
        sources,
        mode: "resynthesize",
      });
      if (data) {
        setTurns((prev) =>
          prev.map((turn, index) =>
            index === prev.length - 1
              ? {
                  ...turn,
                  synthesis: data.synthesis ?? "",
                  aiContext: data.aiContext ?? "",
                  keyFindings: data.keyFindings ?? [],
                  sources: data.sources ?? [],
                  readCount: data.readCount ?? 0,
                }
              : turn,
          ),
        );
        setSources(data.sources ?? []);
        mergeSeen(data.sources ?? []);
        setSourcesDirty(false);
        setSavedId(null);
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
    setSources((prev) =>
      renumber([
        ...prev,
        {
          n: prev.length + 1,
          title,
          authors: aAuthors.trim(),
          venue: "",
          year: Number.isFinite(yearNum) ? yearNum : null,
          url: "",
          citedByCount: 0,
          abstract: aContent.trim(),
          userAdded: true,
        },
      ]),
    );
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
    setDraft(latest?.synthesis ?? "");
    setEditing(true);
  }

  function saveEdit() {
    setTurns((prev) =>
      prev.map((turn, index) =>
        index === prev.length - 1 ? { ...turn, synthesis: draft } : turn,
      ),
    );
    setEditing(false);
  }

  // The saved artifact is the WHOLE thread, not just the last answer.
  function buildReport(): string {
    return turns
      .map((turn, index) => {
        const parts = [
          `## ${index + 1}. ${turn.question}`,
          `*Ditelusuri ${turn.searchedCount} sumber · dibaca mendalam ${turn.readCount}.*`,
          turn.synthesis,
          turn.keyFindings.length
            ? `**Temuan utama**\n${turn.keyFindings
                .map((finding) => `- ${finding.text}`)
                .join("\n")}`
            : "",
          turn.aiContext
            ? `**Konteks dari pengetahuan AI (tanpa sitasi)**\n\n${turn.aiContext}`
            : "",
        ];
        return parts.filter(Boolean).join("\n\n");
      })
      .join("\n\n---\n\n");
  }

  async function saveArtifact() {
    if (!latest || saving) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/research/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: turns[0]?.question ?? latest.question,
          synthesis: buildReport(),
          aiContext: "",
          sources,
        }),
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
    const blob = new Blob(
      [
        `# ${turns[0]?.question ?? ""}\n\n${sources
          .map(citationLine)
          .join("\n")}\n`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sitasi-riset.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetThread() {
    setTurns([]);
    setSources([]);
    setSeenKeys([]);
    setQuestion("");
    setError("");
    setStatus("idle");
    setSavedId(null);
    setEditing(false);
  }

  const totalSearched = turns.reduce((sum, turn) => sum + turn.searchedCount, 0);
  const userAddedCount = sources.filter((source) => source.userAdded).length;

  return (
    <div>
      {/* ASK BAR — first question, then follow-ups */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
        className="mb-6 flex items-center gap-3.5 rounded-[16px] border border-[#0b3d2a]/13 bg-[#fbfaf6] px-4 py-3.5 shadow-[0_10px_30px_-26px_rgba(11,61,42,0.6)] transition focus-within:border-[#0f5a3d]"
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
          placeholder={
            hasThread
              ? "Pertanyaan lanjutan — menelusuri lagi & menambah sumber…"
              : "Ajukan pertanyaan riset — ditelusuri ratusan sumber…"
          }
          className="min-w-0 flex-1 bg-transparent text-[15.5px] text-[#16211c] outline-none placeholder:text-[#9aa099]"
        />
        {hasThread && (
          <button
            type="button"
            onClick={resetThread}
            className="hidden shrink-0 rounded-lg border border-[#0b3d2a]/14 px-2.5 py-1 text-[12px] font-semibold text-[#5d6862] transition hover:border-[#0f5a3d] sm:inline"
          >
            Riset baru
          </button>
        )}
        <button
          type="submit"
          disabled={question.trim().length < 8 || status === "loading"}
          aria-label={hasThread ? "Tanya lanjutan" : "Mulai riset"}
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[#0f5a3d] text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "…" : "↑"}
        </button>
      </form>

      {status === "loading" && (
        <div className="mb-6 flex items-center gap-3 rounded-[14px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-5 py-4 text-sm text-[#5d6862]">
          <span className="inline-flex gap-1" aria-hidden="true">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f5a3d] [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0f5a3d]" />
          </span>
          Merencanakan sub-kueri, menyapu ratusan sumber, lalu membaca yang
          paling relevan… (butuh waktu)
        </div>
      )}

      {status === "error" && (
        <p className="mb-6 rounded-[14px] bg-[#ffdad6] px-5 py-4 text-sm font-semibold text-[#93000a]">
          {error}
        </p>
      )}

      {hasThread && (
        <div className="grid gap-7 lg:grid-cols-[1.55fr_1fr]">
          {/* RESEARCH THREAD */}
          <div>
            {turns.map((turn, index) => {
              const isLatest = index === turns.length - 1;
              return (
                <article
                  key={turn.id}
                  className={
                    isLatest
                      ? ""
                      : "mb-8 border-b border-[#0b3d2a]/10 pb-8 opacity-90"
                  }
                >
                  <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                    <span className="rounded-full bg-[#0f5a3d]/[0.09] px-[11px] py-1 text-xs font-semibold text-[#0f5a3d]">
                      {index + 1}
                    </span>
                    <span className="text-[12.5px] text-[#8a9089]">
                      Ditelusuri <strong className="font-semibold text-[#5d6862]">{turn.searchedCount}</strong> sumber · dibaca mendalam{" "}
                      <strong className="font-semibold text-[#5d6862]">{turn.readCount}</strong>
                    </span>
                  </div>
                  <h2 className="mb-4 font-serif text-[22px] font-medium leading-snug tracking-[-0.01em] text-[#12211b] sm:text-[25px]">
                    {turn.question}
                  </h2>

                  {turn.subQueries.length > 0 && (
                    <details className="mb-4 rounded-[10px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-3.5 py-2">
                      <summary className="cursor-pointer text-[12px] font-semibold text-[#5d6862]">
                        Sudut pencarian yang dipakai ({turn.subQueries.length})
                      </summary>
                      <ul className="mt-2 flex flex-col gap-1">
                        {turn.subQueries.map((sub) => (
                          <li
                            key={sub}
                            className="text-[12px] text-[#7c857f] [font-family:ui-monospace,monospace]"
                          >
                            › {sub}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {isLatest && editing ? (
                    <div className="mb-5">
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
                    turn.synthesis.trim() !== "" && (
                      <div className="text-[15.5px] leading-relaxed text-[#2a342e] [&_a]:text-[#0f5a3d] [&_strong]:font-semibold">
                        <MarkdownMessage text={turn.synthesis} />
                      </div>
                    )
                  )}

                  {turn.keyFindings.length > 0 && !(isLatest && editing) && (
                    <div className="mt-6">
                      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
                        Temuan utama
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {turn.keyFindings.map((finding, findingIndex) => (
                          <div
                            key={findingIndex}
                            className="flex gap-3 rounded-[12px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3"
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

                  {turn.aiContext.trim() !== "" && !(isLatest && editing) && (
                    <div className="mt-6 rounded-[14px] border border-[#b08833]/25 bg-[#e7c77e]/[0.09] px-5 py-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[15px]" aria-hidden="true">✦</span>
                        <span className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#8a6a1f]">
                          Konteks dari pengetahuan AI
                        </span>
                      </div>
                      <div className="text-[14.5px] leading-relaxed text-[#3a342a] [&_strong]:font-semibold">
                        <MarkdownMessage text={turn.aiContext} />
                      </div>
                      <p className="mt-2.5 text-[11.5px] leading-relaxed text-[#9a8250]">
                        Bukan dari sumber terindeks — pengetahuan model yang perlu
                        kamu verifikasi sendiri.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}

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
                    ◧ {saving ? "Menyimpan…" : `Simpan riset (${turns.length} tahap)`}
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
                  disabled={sources.length === 0}
                  className="flex h-10 items-center gap-2 rounded-[10px] border border-[#0b3d2a]/14 bg-[#fbfaf6] px-4 text-[13.5px] font-semibold text-[#25302a] transition hover:border-[#0f5a3d] disabled:opacity-50"
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
          </div>

          {/* WORKING SOURCE SET */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#7c857f]">
                Sumber dibaca · {sources.length}
              </span>
              <button
                type="button"
                onClick={() => setAddOpen((open) => !open)}
                className="rounded-lg border border-[#0b3d2a]/14 bg-[#fbfaf6] px-2.5 py-1 text-[12px] font-semibold text-[#0f5a3d] transition hover:border-[#0f5a3d]"
              >
                + Tambah sumber
              </button>
            </div>
            <p className="mb-3.5 text-[11.5px] text-[#9aa099]">
              {totalSearched} sumber ditelusuri di {turns.length} tahap ·{" "}
              {seenKeys.length} unik terkumpul
              {userAddedCount > 0 ? ` · ${userAddedCount} milikmu` : ""}
            </p>

            {sourcesDirty && sources.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-[11px] border border-[#b08833]/30 bg-[#e7c77e]/15 px-3.5 py-2.5">
                <span className="text-[12.5px] font-medium text-[#8a6a1f]">
                  Sumber berubah — simpulkan ulang.
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

            <div className="flex max-h-[70vh] flex-col gap-2.5 overflow-y-auto pr-1">
              {sources.map((source) => {
                const meta = [source.authors, source.venue, source.year]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={`${source.n}-${sourceKey(source)}`}
                    className="group relative rounded-[12px] border border-[#0b3d2a]/10 bg-[#fbfaf6] px-4 py-3"
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
                              className="text-[13px] font-semibold leading-snug text-[#25302a] hover:text-[#0f5a3d]"
                            >
                              {source.title}
                            </a>
                          ) : (
                            <span className="text-[13px] font-semibold leading-snug text-[#25302a]">
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
                          <div className="text-[11.5px] text-[#8a9089]">{meta}</div>
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
                  Belum ada sumber dibaca. Tambahkan sumbermu lalu simpulkan
                  ulang.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

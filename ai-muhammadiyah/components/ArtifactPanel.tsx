"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import MermaidDiagram from "@/components/MermaidDiagram";
import SandboxedAppFrame from "@/components/SandboxedAppFrame";
import {
  artifactTypeLabels,
  type Artifact,
  type ArtifactType,
} from "@/lib/artifacts";
import { formatRelativeTime } from "@/lib/formatting/text";

interface ArtifactPanelProps {
  artifacts: Artifact[];
  isLoadingArtifacts: boolean;
  activeArtifact: Artifact | null;
  setActiveArtifactId: (artifactId: string | null) => void;
  onClose: () => void;
  deleteArtifact: (artifactId: string) => Promise<void>;
}

// Mini aplikasi diunduh sebagai berkas yang bisa langsung dibuka/dipakai lagi,
// bukan .md — html_app jadi halaman yang tinggal dobel-klik.
const downloadExtensionByArtifactType: Partial<Record<ArtifactType, string>> = {
  html_app: "html",
  react_app: "jsx",
  diagram: "mmd",
};

const downloadExtensionByLanguage: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  bash: "sh",
  shell: "sh",
  php: "php",
  cpp: "cpp",
  c: "c",
  csharp: "cs",
  go: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
  ruby: "rb",
  dart: "dart",
};

// Minimal markdown-table renderer (MarkdownMessage has no table support): rows
// of |cell|cell|, an optional |---|---| separator after the header. Falls back
// to a mono block when the content doesn't look like a table.
function renderMarkdownTable(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  const bodyRows = rows.filter(
    (cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)),
  );

  if (bodyRows.length < 2) {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface-alt)] p-4 text-xs leading-relaxed text-[var(--ink)]">
        {text}
      </pre>
    );
  }

  const [headerCells, ...dataRows] = bodyRows;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--hairline)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[var(--surface-panel)]">
            {headerCells.map((cell, index) => (
              <th
                key={index}
                className="px-3 py-2 text-[12.5px] font-semibold text-[var(--ink)]"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((cells, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-t border-[var(--hairline)]"
            >
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 text-[13.5px] text-[var(--ink-soft)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// "Berdampingan" hanya masuk akal saat panel diperlebar — di lebar 460px tidak
// ada ruang untuk dua kolom.
type ArtifactView = "preview" | "code" | "split";

function ExpandGlyph({ isExpanded }: { isExpanded: boolean }) {
  return isExpanded ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h5V5" />
      <path d="M20 14h-5v5" />
      <path d="M9 10 3 4" />
      <path d="m15 14 6 6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H4v5" />
      <path d="M15 20h5v-5" />
      <path d="m4 4 6 6" />
      <path d="m20 20-6-6" />
    </svg>
  );
}

export default function ArtifactPanel({
  artifacts,
  isLoadingArtifacts,
  activeArtifact,
  setActiveArtifactId,
  onClose,
  deleteArtifact,
}: ArtifactPanelProps) {
  const [copyNotice, setCopyNotice] = useState("");
  // Disimpan per-artifact, bukan satu state global yang di-reset lewat effect:
  // berpindah artifact otomatis kembali ke "preview" tanpa setState di effect
  // (aturan lint react-hooks/set-state-in-effect), dan pilihan tab tiap
  // artifact tetap diingat selama panel terbuka.
  const [viewById, setViewById] = useState<Record<string, ArtifactView>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const hasRuntime = Boolean(activeArtifact?.runtime);
  const storedView: ArtifactView = activeArtifact
    ? viewById[activeArtifact.id] ?? "preview"
    : "preview";
  // Menutup panel yang diperlebar saat "Berdampingan" aktif tidak boleh
  // menyisakan tampilan dua kolom di panel selebar 460px.
  const view: ArtifactView =
    storedView === "split" && !isExpanded ? "preview" : storedView;
  const activeIndex = activeArtifact
    ? artifacts.findIndex((artifact) => artifact.id === activeArtifact.id)
    : -1;

  function handleClose() {
    setIsExpanded(false);
    setIsMenuOpen(false);
    setIsSwitcherOpen(false);
    onClose();
  }

  function setView(nextView: ArtifactView) {
    if (!activeArtifact) {
      return;
    }

    setViewById((previous) => ({ ...previous, [activeArtifact.id]: nextView }));
  }

  async function copyActiveContent() {
    if (!activeArtifact) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeArtifact.content.text);
      setCopyNotice("Tersalin");
      window.setTimeout(() => setCopyNotice(""), 1600);
    } catch (error) {
      console.error(error);
      setCopyNotice("Gagal menyalin");
      window.setTimeout(() => setCopyNotice(""), 1600);
    }
  }

  function downloadActiveContent() {
    if (!activeArtifact) {
      return;
    }

    const extension =
      downloadExtensionByArtifactType[activeArtifact.type] ??
      (activeArtifact.type === "code"
        ? downloadExtensionByLanguage[activeArtifact.content.language ?? ""] ??
          "txt"
        : "md");
    const safeTitle =
      activeArtifact.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() ||
      "artifact";
    const blob = new Blob([activeArtifact.content.text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeTitle}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // `fill` hanya untuk tampilan berdampingan: di sana kolom kode punya tinggi
  // sendiri. Di panel biasa kontainer luar yang menggulung, jadi h-full malah
  // membuat blok kodenya terpotong.
  function renderCodeBlock(fill = false) {
    return (
      <pre
        className={
          fill
            ? "scroll h-full overflow-auto p-4 text-xs leading-[1.85] text-[var(--ink-soft)]"
            : "overflow-x-auto p-4 text-xs leading-[1.85] text-[var(--ink-soft)]"
        }
      >
        <code>{activeArtifact?.content.text}</code>
      </pre>
    );
  }

  // Isi non-runtime: dokumen, tabel, diagram, dan potongan kode biasa.
  function renderTypedBody() {
    if (!activeArtifact) {
      return null;
    }

    if (activeArtifact.type === "document") {
      return (
        <div className="mx-auto w-full max-w-[680px] px-5 py-6 text-[14px] leading-[1.72] text-[var(--ink-soft)]">
          <MarkdownMessage text={activeArtifact.content.text} />
        </div>
      );
    }

    if (activeArtifact.type === "table") {
      return (
        <div className="p-5">
          {renderMarkdownTable(activeArtifact.content.text)}
        </div>
      );
    }

    if (activeArtifact.type === "diagram") {
      return <MermaidDiagram code={activeArtifact.content.text} />;
    }

    return renderCodeBlock();
  }

  function renderBody() {
    if (!activeArtifact) {
      return (
        <p className="p-5 text-sm leading-relaxed text-[var(--muted-3)]">
          {isLoadingArtifacts
            ? "Memuat artifact..."
            : "Belum ada artifact di percakapan ini."}
        </p>
      );
    }

    if (hasRuntime && activeArtifact.runtime) {
      if (view === "split") {
        return (
          <div className="flex h-full min-h-0">
            <div className="flex w-1/2 min-w-0 flex-col border-r border-[var(--hairline)] bg-[var(--surface-panel)]">
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--hairline)] px-4 py-2.5">
                <span className="font-mono text-[11.5px] text-[var(--muted-2)]">
                  {activeArtifact.runtime === "react" ? "app.jsx" : "index.html"}
                </span>
              </div>
              {renderCodeBlock(true)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--hairline)] px-4 py-2.5">
                <span className="text-[11.5px] text-[var(--muted-2)]">
                  Pratinjau
                </span>
              </div>
              <div className="min-h-0 flex-1">
                <SandboxedAppFrame
                  key={`${activeArtifact.id}-split`}
                  runtime={activeArtifact.runtime}
                  code={activeArtifact.content.text}
                />
              </div>
            </div>
          </div>
        );
      }

      if (view === "preview") {
        return (
          <SandboxedAppFrame
            key={activeArtifact.id}
            runtime={activeArtifact.runtime}
            code={activeArtifact.content.text}
          />
        );
      }

      return renderCodeBlock();
    }

    return renderTypedBody();
  }

  function renderIconButton(
    label: string,
    onClick: () => void,
    glyph: React.ReactNode,
  ) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--muted-2)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--ink)] lg:h-[34px] lg:w-[34px] lg:rounded-[10px]"
      >
        {glyph}
      </button>
    );
  }

  return (
    // Below lg the layout has no room for a side column, so the panel becomes a
    // full-screen sheet over the chat instead of being hidden entirely (that
    // left mobile users with artifacts they could never open). From lg up it is
    // an in-flow column — kecuali saat diperlebar, yang menutup seluruh layar
    // supaya kode dan pratinjau muat berdampingan.
    <aside
      className={
        isExpanded
          ? "fixed inset-0 z-50 flex w-full flex-col bg-[var(--surface)]"
          : "fixed inset-0 z-40 flex w-full flex-col bg-[var(--surface)] lg:static lg:z-auto lg:w-[460px] lg:shrink-0 lg:border-l lg:border-[var(--hairline)]"
      }
    >
      <div className="relative flex shrink-0 flex-col gap-2.5 border-b border-[var(--hairline)] px-2 py-2 lg:px-3.5 lg:py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Kembali ke chat"
            title="Kembali ke chat"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)] lg:hidden"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-[15px] font-medium text-[var(--ink)]">
              {activeArtifact?.title ?? "Artifact"}
            </h2>
            <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--muted-3)]">
              {activeArtifact && (
                <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-[var(--brand-soft)] px-[7px] text-[10.5px] font-semibold text-[var(--brand)]">
                  {artifactTypeLabels[activeArtifact.type]}
                </span>
              )}
              {copyNotice ? (
                <span className="truncate text-[var(--brand)]">{copyNotice}</span>
              ) : (
                <span className="truncate">
                  {activeArtifact
                    ? [
                        activeArtifact.content.language,
                        formatRelativeTime(activeArtifact.updatedAt),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Belum ada artifact"}
                </span>
              )}
            </div>
          </div>

          {activeArtifact && (
            <div className="flex shrink-0 items-center gap-0.5">
              <div className="hidden lg:flex lg:items-center lg:gap-0.5">
                {renderIconButton(
                  "Salin isi",
                  () => void copyActiveContent(),
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V6a2 2 0 0 1 2-2h8" />
                  </svg>,
                )}
                {renderIconButton(
                  "Unduh",
                  downloadActiveContent,
                  <Icon name="download" className="h-[18px] w-[18px]" />,
                )}
              </div>

              {renderIconButton(
                "Aksi lain",
                () => setIsMenuOpen((isOpen) => !isOpen),
                <Icon name="dots" className="h-[18px] w-[18px]" />,
              )}

              <div className="mx-1 hidden h-[18px] w-px bg-[var(--hairline)] lg:block" />

              <div className="hidden lg:block">
                {renderIconButton(
                  isExpanded ? "Kecilkan" : "Perlebar",
                  () => setIsExpanded((expanded) => !expanded),
                  <ExpandGlyph isExpanded={isExpanded} />,
                )}
              </div>

              <div className="hidden lg:block">
                {renderIconButton(
                  "Tutup panel artifact",
                  handleClose,
                  <Icon name="close" className="h-[18px] w-[18px]" />,
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pemilih artifact — dulu deretan pil yang meluber begitu artifact-nya
            banyak; sekarang satu baris dengan daftar yang bisa digulung. */}
        {artifacts.length > 1 && (
          <div className="relative px-1 lg:px-0">
            <button
              type="button"
              onClick={() => setIsSwitcherOpen((isOpen) => !isOpen)}
              aria-expanded={isSwitcherOpen}
              className="flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--surface-panel)] px-3 text-left transition hover:bg-[var(--surface-alt)] lg:h-[34px]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 text-[var(--muted-2)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="7" height="7" rx="1.4" />
                <rect x="14" y="4" width="7" height="7" rx="1.4" />
                <rect x="3" y="14" width="7" height="7" rx="1.4" />
                <rect x="14" y="14" width="7" height="7" rx="1.4" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink-soft)]">
                Artifact {activeIndex >= 0 ? activeIndex + 1 : 1} dari{" "}
                {artifacts.length}
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0 text-[var(--muted-3)]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isSwitcherOpen && (
              <div className="scroll absolute left-1 right-1 top-full z-30 mt-1 max-h-[min(50vh,320px)] overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 shadow-xl lg:left-0 lg:right-0">
                {artifacts.map((artifact, index) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => {
                      setActiveArtifactId(artifact.id);
                      setIsSwitcherOpen(false);
                    }}
                    className={
                      artifact.id === activeArtifact?.id
                        ? "flex w-full items-center gap-2.5 rounded-xl bg-[var(--brand-soft)] px-3 py-2.5 text-left"
                        : "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-alt)]"
                    }
                  >
                    <span className="w-4 shrink-0 text-[11px] text-[var(--muted-3)]">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={
                          artifact.id === activeArtifact?.id
                            ? "truncate text-[13.5px] font-medium text-[var(--brand)]"
                            : "truncate text-[13.5px] text-[var(--ink-soft)]"
                        }
                      >
                        {artifact.title}
                      </span>
                      <span className="truncate text-[11px] text-[var(--muted-3)]">
                        {artifactTypeLabels[artifact.type]} ·{" "}
                        {formatRelativeTime(artifact.updatedAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasRuntime && (
          <div className="flex items-center gap-2 px-1 lg:px-0">
            <div className="inline-flex gap-0.5 rounded-full bg-[var(--surface-alt)] p-0.5">
              {(
                [
                  ["preview", "Pratinjau"],
                  ["code", "Kode"],
                  ...(isExpanded
                    ? ([["split", "Berdampingan"]] as const)
                    : []),
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setView(tab)}
                  aria-pressed={view === tab}
                  className={
                    view === tab
                      ? "inline-flex h-8 items-center rounded-full bg-[var(--surface)] px-3.5 text-[12.5px] font-semibold text-[var(--brand)]"
                      : "inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-medium text-[var(--muted-2)] transition hover:text-[var(--ink)]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-[var(--hairline)] px-2.5 text-[10.5px] font-medium text-[var(--muted-2)]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 text-[var(--gold-ink-2)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
                <path d="M7.5 10.5V7.2a4.5 4.5 0 0 1 9 0v3.3" />
              </svg>
              Sandbox
            </span>
          </div>
        )}

        {isMenuOpen && activeArtifact && (
          <div className="absolute right-2 top-[calc(100%-6px)] z-40 w-[min(84vw,240px)] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 shadow-xl lg:right-3.5">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                void deleteArtifact(activeArtifact.id);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--danger)] transition hover:bg-[var(--danger-bg)]"
            >
              <Icon name="trash" className="h-[18px] w-[18px]" />
              Hapus artifact
            </button>
          </div>
        )}
      </div>

      <div className="scroll min-h-0 flex-1 overflow-y-auto">{renderBody()}</div>

      {/* Aksi utama di layar kecil. Di lg ke atas keduanya sudah jadi ikon di
          header, jadi baris ini tidak perlu dan isinya dapat tinggi penuh. */}
      {activeArtifact && (
        <div className="flex shrink-0 items-center gap-2.5 border-t border-[var(--hairline)] px-4 pb-5 pt-3 lg:hidden">
          <button
            type="button"
            onClick={() => void copyActiveContent()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-[14.5px] font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h8" />
            </svg>
            {copyNotice || "Salin"}
          </button>
          <button
            type="button"
            onClick={downloadActiveContent}
            aria-label="Unduh"
            title="Unduh"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--hairline)] text-[var(--ink-soft)] transition hover:bg-[var(--surface-alt)]"
          >
            <Icon name="download" className="h-[19px] w-[19px]" />
          </button>
        </div>
      )}
    </aside>
  );
}

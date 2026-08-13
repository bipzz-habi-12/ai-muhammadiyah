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
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[16px] bg-[var(--surface-alt)] p-4 text-xs leading-relaxed text-[var(--ink)]">
        {text}
      </pre>
    );
  }

  const [headerCells, ...dataRows] = bodyRows;

  return (
    <div className="overflow-x-auto rounded-[16px] ring-1 ring-[var(--brand-deep-line)]/10">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[var(--brand)]/10">
            {headerCells.map((cell, index) => (
              <th
                key={index}
                className="px-3 py-2 font-bold text-[var(--brand)]"
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
              className="border-t border-[var(--brand-deep-line)]/10 odd:bg-[var(--pure-white)] even:bg-[var(--background)]"
            >
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-[var(--ink)]">
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

type MiniAppTab = "preview" | "code";

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
  const [miniAppTabById, setMiniAppTabById] = useState<
    Record<string, MiniAppTab>
  >({});
  const miniAppTab: MiniAppTab = activeArtifact
    ? miniAppTabById[activeArtifact.id] ?? "preview"
    : "preview";

  async function copyActiveContent() {
    if (!activeArtifact) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeArtifact.content.text);
      setCopyNotice("Tersalin!");
      window.setTimeout(() => setCopyNotice(""), 1600);
    } catch (error) {
      console.error(error);
      setCopyNotice("Gagal menyalin.");
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

  function renderActiveContent() {
    if (!activeArtifact) {
      return (
        <p className="p-4 text-sm leading-relaxed text-[var(--muted-3)]">
          {isLoadingArtifacts
            ? "Memuat artifact..."
            : "Belum ada artifact di percakapan ini."}
        </p>
      );
    }

    if (activeArtifact.type === "document") {
      return (
        <div className="p-4 text-sm leading-relaxed text-[var(--ink)]">
          <MarkdownMessage text={activeArtifact.content.text} />
        </div>
      );
    }

    if (activeArtifact.type === "table") {
      return <div className="p-4">{renderMarkdownTable(activeArtifact.content.text)}</div>;
    }

    if (activeArtifact.type === "diagram") {
      return <MermaidDiagram code={activeArtifact.content.text} />;
    }

    // runtime terisi = mini aplikasi; jalankan di iframe sandbox, kecuali user
    // sedang melihat tab Kode.
    if (activeArtifact.runtime && miniAppTab === "preview") {
      return (
        <SandboxedAppFrame
          key={activeArtifact.id}
          runtime={activeArtifact.runtime}
          code={activeArtifact.content.text}
        />
      );
    }

    return (
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-[var(--ink)]">
        <code>{activeArtifact.content.text}</code>
      </pre>
    );
  }

  return (
    // Below lg the layout has no room for a side column, so the panel becomes a
    // full-screen sheet over the chat instead of being hidden entirely (that
    // left mobile users with artifacts they could never open). From lg up it is
    // the same in-flow column as before.
    <aside className="fixed inset-0 z-40 flex w-full flex-col bg-[var(--surface-panel)] lg:static lg:z-auto lg:w-[420px] lg:shrink-0 lg:border-l lg:border-[var(--brand-deep-line)]/10">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--brand-deep-line)]/10 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--brand)]">
          Artifact
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel artifact"
          title="Tutup panel artifact"
          className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--surface-border)]"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {artifacts.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--brand-deep-line)]/10 px-4 py-2">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => setActiveArtifactId(artifact.id)}
              className={
                artifact.id === activeArtifact?.id
                  ? "shrink-0 rounded-full bg-[var(--brand)]/10 px-3 py-1 text-xs font-bold text-[var(--brand)]"
                  : "shrink-0 rounded-full px-3 py-1 text-xs font-bold text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-alt)]"
              }
            >
              <span className="block max-w-[140px] truncate">
                {artifact.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {activeArtifact && (
        <div className="shrink-0 border-b border-[var(--brand-deep-line)]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              {artifactTypeLabels[activeArtifact.type]}
            </span>
            {activeArtifact.content.language && (
              <span className="rounded-full bg-[var(--c-e0e0ff)] px-2 py-0.5 text-[10px] font-bold text-[var(--c-343d96)]">
                {activeArtifact.content.language}
              </span>
            )}
            <span className="ml-auto text-[10px] font-semibold text-[var(--muted-3)]">
              {formatRelativeTime(activeArtifact.updatedAt)}
            </span>
          </div>
          <h3 className="mt-1 break-words text-base font-bold text-[var(--ink)]">
            {activeArtifact.title}
          </h3>

          {activeArtifact.runtime && (
            <div className="mt-3 inline-flex rounded-full bg-[var(--surface-border)] p-0.5">
              {(
                [
                  ["preview", "Pratinjau"],
                  ["code", "Kode"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setMiniAppTabById((previous) => ({
                      ...previous,
                      [activeArtifact.id]: tab,
                    }))
                  }
                  aria-pressed={miniAppTab === tab}
                  className={
                    miniAppTab === tab
                      ? "rounded-full bg-[var(--pure-white)] px-3 py-1 text-[11px] font-bold text-[var(--brand)]"
                      : "rounded-full px-3 py-1 text-[11px] font-bold text-[var(--muted-2)] transition hover:text-[var(--ink)]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">{renderActiveContent()}</div>

      {activeArtifact && (
        <div className="flex shrink-0 items-center gap-2 border-t border-[var(--brand-deep-line)]/10 px-4 py-3">
          <button
            type="button"
            onClick={copyActiveContent}
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]"
          >
            {copyNotice || "Salin"}
          </button>
          <button
            type="button"
            onClick={downloadActiveContent}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10 transition hover:bg-[var(--surface-border)]"
          >
            <Icon name="download" className="h-4 w-4" />
            Unduh
          </button>
          <button
            type="button"
            onClick={() => void deleteArtifact(activeArtifact.id)}
            className="ml-auto rounded-full px-3 py-2 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger-bg)]"
          >
            Hapus
          </button>
        </div>
      )}
    </aside>
  );
}

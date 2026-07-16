"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import { artifactTypeLabels, type Artifact } from "@/lib/artifacts";
import { formatRelativeTime } from "@/lib/formatting/text";

interface ArtifactPanelProps {
  artifacts: Artifact[];
  isLoadingArtifacts: boolean;
  activeArtifact: Artifact | null;
  setActiveArtifactId: (artifactId: string | null) => void;
  onClose: () => void;
  deleteArtifact: (artifactId: string) => Promise<void>;
}

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
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[16px] bg-[#f0eee6] p-4 text-xs leading-relaxed text-[#16211c]">
        {text}
      </pre>
    );
  }

  const [headerCells, ...dataRows] = bodyRows;

  return (
    <div className="overflow-x-auto rounded-[16px] ring-1 ring-[#0b3d2a]/10">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[#0f5a3d]/10">
            {headerCells.map((cell, index) => (
              <th
                key={index}
                className="px-3 py-2 font-bold text-[#0f5a3d]"
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
              className="border-t border-[#0b3d2a]/10 odd:bg-white even:bg-[#f5f3ec]"
            >
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-[#16211c]">
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

export default function ArtifactPanel({
  artifacts,
  isLoadingArtifacts,
  activeArtifact,
  setActiveArtifactId,
  onClose,
  deleteArtifact,
}: ArtifactPanelProps) {
  const [copyNotice, setCopyNotice] = useState("");

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

    const isCode = activeArtifact.type === "code";
    const extension = isCode
      ? downloadExtensionByLanguage[activeArtifact.content.language ?? ""] ??
        "txt"
      : "md";
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
        <p className="p-4 text-sm leading-relaxed text-[#8a9089]">
          {isLoadingArtifacts
            ? "Memuat artifact..."
            : "Belum ada artifact di percakapan ini."}
        </p>
      );
    }

    if (activeArtifact.type === "document") {
      return (
        <div className="p-4 text-sm leading-relaxed text-[#16211c]">
          <MarkdownMessage text={activeArtifact.content.text} />
        </div>
      );
    }

    if (activeArtifact.type === "table") {
      return <div className="p-4">{renderMarkdownTable(activeArtifact.content.text)}</div>;
    }

    // diagram (Mermaid source, rendered as mono text in v1) + code
    return (
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-[#16211c]">
        <code>{activeArtifact.content.text}</code>
      </pre>
    );
  }

  return (
    <aside className="hidden w-[420px] shrink-0 flex-col border-l border-[#0b3d2a]/10 bg-[#f7f5ee] lg:flex">
      <div className="flex shrink-0 items-center justify-between border-b border-[#0b3d2a]/10 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0f5a3d]">
          Artifact
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel artifact"
          title="Tutup panel artifact"
          className="grid h-8 w-8 place-items-center rounded-full text-[#5d6862] transition hover:bg-[#ece9df]"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {artifacts.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#0b3d2a]/10 px-4 py-2">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => setActiveArtifactId(artifact.id)}
              className={
                artifact.id === activeArtifact?.id
                  ? "shrink-0 rounded-full bg-[#0f5a3d]/10 px-3 py-1 text-xs font-bold text-[#0f5a3d]"
                  : "shrink-0 rounded-full px-3 py-1 text-xs font-bold text-[#5d6862] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#f0eee6]"
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
        <div className="shrink-0 border-b border-[#0b3d2a]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f5a3d]">
              {artifactTypeLabels[activeArtifact.type]}
            </span>
            {activeArtifact.content.language && (
              <span className="rounded-full bg-[#e0e0ff] px-2 py-0.5 text-[10px] font-bold text-[#343d96]">
                {activeArtifact.content.language}
              </span>
            )}
            <span className="ml-auto text-[10px] font-semibold text-[#8a9089]">
              {formatRelativeTime(activeArtifact.updatedAt)}
            </span>
          </div>
          <h3 className="mt-1 break-words text-base font-bold text-[#16211c]">
            {activeArtifact.title}
          </h3>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">{renderActiveContent()}</div>

      {activeArtifact && (
        <div className="flex shrink-0 items-center gap-2 border-t border-[#0b3d2a]/10 px-4 py-3">
          <button
            type="button"
            onClick={copyActiveContent}
            className="rounded-full bg-[#0f5a3d] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0a3d2a]"
          >
            {copyNotice || "Salin"}
          </button>
          <button
            type="button"
            onClick={downloadActiveContent}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[#5d6862] ring-1 ring-[#0b3d2a]/10 transition hover:bg-[#ece9df]"
          >
            <Icon name="download" className="h-4 w-4" />
            Unduh
          </button>
          <button
            type="button"
            onClick={() => void deleteArtifact(activeArtifact.id)}
            className="ml-auto rounded-full px-3 py-2 text-xs font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6]"
          >
            Hapus
          </button>
        </div>
      )}
    </aside>
  );
}

import { memo, type ReactNode } from "react";
import { renderInlineMarkdown } from "@/lib/formatting/markdown";

// Renderer markdown untuk balasan AI, halaman Hub, Research, dan panel Artifact.
//
// Sengaja ditulis tangan (bukan react-markdown) karena teksnya dirender SAAT
// MASIH STREAMING: blok yang penanda penutupnya belum datang harus tetap tampil
// rapi, bukan menunggu sampai lengkap. Itu sebabnya blok kode yang belum
// tertutup tetap dirender, dan tabel yang baris pemisahnya belum tiba jatuh
// dulu ke paragraf biasa lalu berubah jadi tabel begitu pemisahnya sampai.
//
// KONTRAK: daftar sintaks di bawah HARUS sama dengan blok "SUPPORTED MARKDOWN"
// di `responseStyleSystemPrompt` (`lib/ai/chat.ts`). Menambah dukungan di sini
// tanpa memberi tahu model = fitur mati; menghapus dukungan di sini tanpa
// memperbarui prompt = markup bocor mentah ke layar pengguna.
//
// Didukung: ## / ### / #### judul, "- " bullet, "1. " langkah, --- garis,
// **tebal**, `kode`, [teks](url), ```blok kode```, dan tabel |a|b|.

const headingPattern = /^(#{2,4})\s+(.+)$/;
const bulletPattern = /^[-*]\s+(.+)$/;
const orderedPattern = /^\d+\.\s+(.+)$/;
const fencePattern = /^```\s*([A-Za-z0-9+#._-]*)\s*$/;
const tableSeparatorPattern = /^\|(?:\s*:?-{2,}:?\s*\|)+$/;

function isTableRow(line: string) {
  return line.length > 2 && line.startsWith("|") && line.endsWith("|");
}

function splitTableRow(line: string) {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

const MarkdownMessage = memo(function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let orderedItems: ReactNode[] = [];

  function flushLists() {
    if (listItems.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-3 list-disc space-y-1 pl-5">
          {listItems}
        </ul>,
      );
      listItems = [];
    }

    if (orderedItems.length) {
      elements.push(
        <ol
          key={`ol-${elements.length}`}
          className="my-3 list-decimal space-y-1 pl-5"
        >
          {orderedItems}
        </ol>,
      );
      orderedItems = [];
    }
  }

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushLists();
      index += 1;
      continue;
    }

    // --- Blok kode berpagar ----------------------------------------------
    const fence = trimmedLine.match(fencePattern);

    if (fence) {
      flushLists();

      const language = fence[1];
      const codeLines: string[] = [];
      let cursor = index + 1;

      while (cursor < lines.length && !/^```/.test(lines[cursor].trim())) {
        codeLines.push(lines[cursor]);
        cursor += 1;
      }

      // Pagar penutup dilewati kalau ada; kalau tidak ada (masih streaming),
      // cursor sudah di akhir teks dan isinya tetap tampil.
      index = cursor < lines.length ? cursor + 1 : cursor;

      elements.push(
        <div
          key={`code-${elements.length}`}
          className="my-3 overflow-hidden rounded-[12px] ring-1 ring-[var(--brand-deep-line)]/10"
        >
          {language && (
            <div className="border-b border-[var(--brand-deep-line)]/10 bg-[var(--surface-alt)] px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.05em] text-[var(--muted)]">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto bg-[var(--surface-alt)] px-3.5 py-3">
            <code className="font-mono text-[13px] leading-relaxed text-[var(--ink)]">
              {codeLines.join("\n")}
            </code>
          </pre>
        </div>,
      );
      continue;
    }

    // --- Tabel ------------------------------------------------------------
    // Butuh baris pemisah |---|---| tepat di bawah header. Tanpa itu, teks
    // ber-pipa biasa (mis. notasi "a | b") tidak salah dikira tabel.
    const nextLine = lines[index + 1]?.trim() ?? "";

    if (
      isTableRow(trimmedLine) &&
      isTableRow(nextLine) &&
      tableSeparatorPattern.test(nextLine.replace(/\s+/g, ""))
    ) {
      flushLists();

      const headerCells = splitTableRow(trimmedLine);
      const bodyRows: string[][] = [];
      let cursor = index + 2;

      while (cursor < lines.length && isTableRow(lines[cursor].trim())) {
        bodyRows.push(splitTableRow(lines[cursor].trim()));
        cursor += 1;
      }

      index = cursor;

      elements.push(
        <div
          key={`table-${elements.length}`}
          className="my-3 overflow-x-auto rounded-[12px] ring-1 ring-[var(--brand-deep-line)]/10"
        >
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-[var(--brand)]/10">
                {headerCells.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="px-3 py-2 font-semibold text-[var(--brand)]"
                  >
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((cells, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-t border-[var(--brand-deep-line)]/10"
                >
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-[var(--ink)]">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // --- Judul ------------------------------------------------------------
    const heading = trimmedLine.match(headingPattern);

    if (heading) {
      flushLists();
      const levelClass = heading[1].length === 2 ? "mt-4 text-lg" : "mt-3 text-base";

      elements.push(
        <h3
          key={`h-${index}`}
          className={`${levelClass} font-bold leading-snug text-[var(--c-0f3025)] first:mt-0`}
        >
          {renderInlineMarkdown(heading[2])}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (trimmedLine === "---") {
      flushLists();
      elements.push(
        <hr key={`hr-${index}`} className="my-4 border-[var(--c-d8eadf)]" />,
      );
      index += 1;
      continue;
    }

    const bullet = trimmedLine.match(bulletPattern);

    if (bullet) {
      orderedItems = [];
      listItems.push(
        <li key={`li-${index}`} className="pl-1">
          {renderInlineMarkdown(bullet[1])}
        </li>,
      );
      index += 1;
      continue;
    }

    const ordered = trimmedLine.match(orderedPattern);

    if (ordered) {
      listItems = [];
      orderedItems.push(
        <li key={`oli-${index}`} className="pl-1">
          {renderInlineMarkdown(ordered[1])}
        </li>,
      );
      index += 1;
      continue;
    }

    flushLists();
    elements.push(
      <p key={`p-${index}`} className="my-2 first:mt-0 last:mb-0">
        {renderInlineMarkdown(trimmedLine)}
      </p>,
    );
    index += 1;
  }

  flushLists();

  return <div className="space-y-1">{elements}</div>;
});

export default MarkdownMessage;

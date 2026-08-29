import type { ReactNode } from "react";
import { normalizeMathText } from "./math";

// Markdown sebaris untuk satu baris teks balasan AI.
//
// URUTANNYA PENTING: potongan `kode` dan [tautan](url) diamankan LEBIH DULU,
// baru sisa teksnya dinormalisasi `normalizeMathText`. Kalau dibalik, pembersih
// matematika merusak isi keduanya — ia membuang backtick, mengubah " / " jadi
// " ÷ " dan "*" jadi "×", yang di dalam kode maupun URL jelas salah.
//
// Normalisasi tetap dijalankan atas SELURUH baris (bukan per-potongan) karena
// `normalizeMathText` diakhiri `.trim()`; kalau dipanggil per-potongan, spasi
// antar potongan ikut hilang dan kata-katanya menempel.

const codeSpanSource = "`[^`\\n]+`";
const linkSource =
  "\\[[^\\]\\n]{1,200}\\]\\((?:https?://|mailto:)[^\\s)]{1,500}\\)";
const boldSource = "\\*\\*[^*\\n]+\\*\\*";

// Rumus yang terlanjur dibungkus backtick tetap dilepas oleh normalizeMathText
// (perilaku lama yang dipertahankan: model masih sering melakukannya walau
// prompt melarang). Jadi yang diamankan hanya code span yang TIDAK terlihat
// seperti rumus.
const mathInsideCodePattern = /(\\frac|\\sqrt|sqrt\(|\^|\s\/\s|\*)/;

// Private Use Area: tidak pernah muncul di teks model, dan bukan karakter kata
// sehingga tidak mengganggu satu pun `\b` di normalizeMathText.
const placeholderOpen = "\uE000";
const placeholderClose = "\uE001";

type ProtectedPart = { kind: "code" | "link"; value: string };

function protectInlineParts(text: string) {
  const parts: ProtectedPart[] = [];
  const pattern = new RegExp(`${codeSpanSource}|${linkSource}`, "g");

  const masked = text.replace(pattern, (match) => {
    const isCode = match.startsWith("`");

    if (isCode && mathInsideCodePattern.test(match)) {
      return match;
    }

    const index = parts.length;
    parts.push({ kind: isCode ? "code" : "link", value: match });

    return `${placeholderOpen}${index}${placeholderClose}`;
  });

  return { masked, parts };
}

function renderProtectedPart(part: ProtectedPart, key: number) {
  if (part.kind === "code") {
    return (
      <code
        key={key}
        className="rounded-[5px] bg-[var(--surface-alt)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--ink)]"
      >
        {part.value.slice(1, -1)}
      </code>
    );
  }

  const linkMatch = part.value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

  if (!linkMatch) {
    return part.value;
  }

  return (
    <a
      key={key}
      href={linkMatch[2]}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--brand)] underline decoration-[var(--brand)]/40 underline-offset-2 transition-colors hover:decoration-[var(--brand)]"
    >
      {linkMatch[1]}
    </a>
  );
}

export function renderInlineMarkdown(text: string): ReactNode[] {
  const { masked, parts } = protectInlineParts(text);
  const cleanText = normalizeMathText(masked);
  const segments = cleanText.split(
    new RegExp(
      `(${placeholderOpen}\\d+${placeholderClose}|${boldSource})`,
      "g",
    ),
  );

  return segments.map((segment, index) => {
    if (!segment) {
      return null;
    }

    const placeholder = segment.match(
      new RegExp(`^${placeholderOpen}(\\d+)${placeholderClose}$`),
    );

    if (placeholder) {
      const part = parts[Number(placeholder[1])];

      return part ? renderProtectedPart(part, index) : null;
    }

    if (segment.startsWith("**") && segment.endsWith("**")) {
      // var(--c-0f3025), BUKAN #0f3025 mentah: token ini dibalik di tema gelap
      // (html[data-theme="dark"] di globals.css). Versi lamanya hardcoded, jadi
      // setiap kata tebal jadi nyaris hitam di atas latar gelap.
      return (
        <strong key={index} className="font-bold text-[var(--c-0f3025)]">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return segment;
  });
}

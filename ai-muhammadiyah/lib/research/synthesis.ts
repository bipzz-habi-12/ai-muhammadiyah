import type { ResearchSource } from "@/lib/research/openalex";

// Synthesis layer. The model is handed a numbered list of REAL papers (from
// OpenAlex) and asked to write an evidence-based synthesis that cites ONLY those
// papers by number, PLUS an uncited "AI context" section from its own knowledge.
//
// Output uses plain line delimiters (===SINTESIS=== etc.) rather than JSON — the
// same reasoning as the artifact sentinels in lib/artifacts.ts: LLM JSON with
// long free-text fields truncates often, and one cut byte breaks the whole
// parse. Delimited sections degrade gracefully — a truncated reply still yields
// whatever sections finished, and quotes/newlines/brackets in the prose can't
// corrupt the parse.

export type FindingSignal = "up" | "mixed" | "caution";

export type KeyFinding = {
  signal: FindingSignal;
  text: string;
};

export type ResearchSynthesis = {
  synthesis: string; // markdown, grounded in the sources, with inline [n] citations
  aiContext: string; // the model's OWN general knowledge, uncited (may be empty)
  keyFindings: KeyFinding[];
};

const SEC_SYNTHESIS = "===SINTESIS===";
const SEC_AI_CONTEXT = "===KONTEKS_AI===";
const SEC_FINDINGS = "===TEMUAN===";

export const RESEARCH_SYNTHESIS_SYSTEM_PROMPT = [
  "Anda adalah asisten riset akademik untuk platform AI Muhammadiyah.",
  "Anda menerima sebuah pertanyaan riset dan daftar SUMBER NYATA bernomor (judul + metadata + abstrak).",
  "",
  "Tulis jawaban dalam TIGA bagian, dipisahkan penanda baris persis seperti di bawah (penanda ada di barisnya sendiri):",
  "",
  SEC_SYNTHESIS,
  "Sintesis bersitasi (2-4 paragraf markdown). HANYA berdasarkan sumber yang diberikan; jangan mengarang temuan/angka/referensi.",
  "Sitasi memakai nomor sumber dalam kurung siku, mis. [1] atau [2, 4] — hanya nomor yang ada di daftar.",
  "Jika bukti tipis/bertentangan/tak menjawab, katakan eksplisit. Jika TIDAK ADA sumber, kosongkan bagian ini.",
  "",
  SEC_AI_CONTEXT,
  "Konteks/pengetahuan umum Anda sendiri tentang topik ini yang membantu pembaca, DI LUAR sumber (1-2 paragraf markdown).",
  "JANGAN pakai sitasi [n] di sini (ini bukan dari sumber). Ini pengetahuan model yang belum tentu akurat/terkini — tulis wajar, jangan berpura-pura sebagai bukti terverifikasi. Boleh kosong.",
  "",
  SEC_FINDINGS,
  "Temuan utama, satu per baris, format: signal | teks. signal salah satu: up (positif/mendukung), mixed (tidak konklusif), caution (peringatan/risiko).",
  "Contoh baris: up | Pendampingan menaikkan ketahanan usaha [1].",
  "Isi 2-4 baris bila ada sumber; kosongkan bila tak ada sumber.",
  "",
  "Tulis dalam bahasa yang sama dengan pertanyaan (default Bahasa Indonesia). Nada akademik, ringkas. Jangan tambahkan teks di luar tiga bagian ini.",
].join("\n");

export function buildResearchUserPrompt(
  question: string,
  sources: ResearchSource[],
): string {
  const sourceBlock = sources
    .map((source) => {
      const meta = [source.authors, source.venue, source.year]
        .filter(Boolean)
        .join(" · ");
      return [
        `[${source.n}] ${source.title}`,
        meta ? `    ${meta}` : "",
        `    Abstrak: ${source.abstract}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `PERTANYAAN RISET:\n${question.trim()}`,
    "",
    sources.length > 0
      ? `SUMBER (${sources.length}):\n${sourceBlock}`
      : "SUMBER: (tidak ada literatur ditemukan) — kosongkan SINTESIS/TEMUAN, isi KONTEKS_AI dari pengetahuan umum Anda.",
    "",
    "Susun jawaban sesuai tiga penanda bagian pada instruksi sistem.",
  ].join("\n");
}

function coerceSignal(value: string): FindingSignal {
  const normalized = value.trim().toLowerCase();
  if (normalized === "up" || normalized === "mixed" || normalized === "caution") {
    return normalized;
  }
  return "mixed";
}

// Slice the reply into its delimited sections. Each present marker's content
// runs from after the marker to the next present marker (or end of text), so
// missing or truncated sections don't break the others.
function sliceSections(text: string): {
  synthesis: string;
  aiContext: string;
  findings: string;
} {
  const cleaned = text.replace(/```/g, "");
  const markers = [
    { key: "synthesis" as const, tag: SEC_SYNTHESIS },
    { key: "aiContext" as const, tag: SEC_AI_CONTEXT },
    { key: "findings" as const, tag: SEC_FINDINGS },
  ];

  const found = markers
    .map((marker) => ({ ...marker, idx: cleaned.indexOf(marker.tag) }))
    .filter((marker) => marker.idx !== -1)
    .sort((a, b) => a.idx - b.idx);

  const result = { synthesis: "", aiContext: "", findings: "" };
  for (let i = 0; i < found.length; i += 1) {
    const start = found[i].idx + found[i].tag.length;
    const end = i + 1 < found.length ? found[i + 1].idx : cleaned.length;
    result[found[i].key] = cleaned.slice(start, end).trim();
  }
  return result;
}

function parseFindings(block: string): KeyFinding[] {
  if (!block) {
    return [];
  }
  return block
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(up|mixed|caution)\s*[|:–-]\s*(.+)$/i);
      if (match) {
        return { signal: coerceSignal(match[1]), text: match[2].trim() };
      }
      // No signal prefix — keep the text, default the signal.
      return { signal: "mixed" as FindingSignal, text: line };
    })
    .filter((finding) => finding.text.length > 0)
    .slice(0, 6);
}

// Returns null only when neither prose section came back (nothing usable).
export function parseResearchSynthesis(raw: string): ResearchSynthesis | null {
  const sections = sliceSections(raw);

  // Fallback: if the model ignored the markers entirely but produced prose,
  // treat the whole reply as the synthesis rather than dropping everything.
  if (!sections.synthesis && !sections.aiContext && !sections.findings) {
    const body = raw.replace(/```/g, "").trim();
    if (body.length > 0 && !body.includes("===")) {
      return { synthesis: body, aiContext: "", keyFindings: [] };
    }
    return null;
  }

  if (!sections.synthesis && !sections.aiContext) {
    return null;
  }

  return {
    synthesis: sections.synthesis,
    aiContext: sections.aiContext,
    keyFindings: parseFindings(sections.findings),
  };
}

// Plain-text reference list appended to a saved artifact (also used by the
// "Export citations" button on the client).
export function formatReferenceList(sources: ResearchSource[]): string {
  return sources
    .map((source) => {
      const meta = [source.venue, source.year].filter(Boolean).join(", ");
      return `[${source.n}] ${source.authors}. ${source.title}.${
        meta ? ` ${meta}.` : ""
      }${source.url ? ` ${source.url}` : ""}`;
    })
    .join("\n");
}

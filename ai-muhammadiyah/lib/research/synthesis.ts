import type { ResearchSource } from "@/lib/research/openalex";

// Synthesis layer. The model is handed a numbered list of REAL papers (from
// OpenAlex) and asked to write an evidence-based synthesis that cites ONLY those
// papers by their number. It never sees a request to invent references — the
// citations map 1:1 to the sources panel the user also sees.

export type FindingSignal = "up" | "mixed" | "caution";

export type KeyFinding = {
  signal: FindingSignal;
  text: string;
};

export type ResearchSynthesis = {
  synthesis: string; // markdown, with inline [n] citations
  keyFindings: KeyFinding[];
};

export const RESEARCH_SYNTHESIS_SYSTEM_PROMPT = [
  "Anda adalah asisten riset akademik untuk platform AI Muhammadiyah.",
  "Anda menerima sebuah pertanyaan riset dan daftar SUMBER NYATA bernomor (judul + metadata + abstrak).",
  "",
  "Aturan keras:",
  "- Sintesis HANYA boleh berdasarkan sumber yang diberikan. Jangan mengarang temuan, angka, atau referensi.",
  "- Sitasi memakai nomor sumber dalam kurung siku, mis. [1] atau [2, 4]. Hanya boleh mengutip nomor yang ada di daftar.",
  "- Jika bukti tipis, saling bertentangan, atau tidak menjawab pertanyaan, katakan itu secara eksplisit — jangan memaksakan kesimpulan.",
  "- Tulis dalam bahasa yang sama dengan pertanyaan (default Bahasa Indonesia). Nada akademik, ringkas, evidence-based.",
  "",
  "Keluarkan HANYA JSON valid (tanpa teks lain, tanpa code fence) dengan bentuk:",
  '{"synthesis":"<markdown 2-4 paragraf dengan sitasi [n] inline>","keyFindings":[{"signal":"up|mixed|caution","text":"<temuan singkat dengan sitasi [n] bila relevan>"}]}',
  "",
  "Makna signal: 'up' = temuan positif/mendukung, 'mixed' = tidak konklusif/campuran, 'caution' = peringatan/risiko/temuan negatif.",
  "Sertakan 2-4 keyFindings.",
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
    `SUMBER (${sources.length}):`,
    sourceBlock,
    "",
    "Susun sintesis sesuai aturan sistem dan keluarkan JSON-nya.",
  ].join("\n");
}

function coerceSignal(value: unknown): FindingSignal {
  if (value === "up" || value === "mixed" || value === "caution") {
    return value;
  }
  return "mixed";
}

// Robust JSON extraction: try direct parse, then strip a ```json fence, then
// grab the first {...} block. Returns null only when nothing parseable is found.
export function parseResearchSynthesis(raw: string): ResearchSynthesis | null {
  const attempts: string[] = [];
  const trimmed = raw.trim();
  attempts.push(trimmed);

  const fenceMatch = trimmed.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n?```/i);
  if (fenceMatch) {
    attempts.push(fenceMatch[1].trim());
  }

  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    attempts.push(trimmed.slice(braceStart, braceEnd + 1));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate) as {
        synthesis?: unknown;
        keyFindings?: unknown;
      };

      const synthesis =
        typeof parsed.synthesis === "string" ? parsed.synthesis.trim() : "";
      if (!synthesis) {
        continue;
      }

      const keyFindings = Array.isArray(parsed.keyFindings)
        ? parsed.keyFindings
            .map((item) => {
              const record = (item ?? {}) as { signal?: unknown; text?: unknown };
              const text = typeof record.text === "string" ? record.text.trim() : "";
              return text ? { signal: coerceSignal(record.signal), text } : null;
            })
            .filter((item): item is KeyFinding => item !== null)
        : [];

      return { synthesis, keyFindings };
    } catch {
      // try next candidate
    }
  }

  return null;
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

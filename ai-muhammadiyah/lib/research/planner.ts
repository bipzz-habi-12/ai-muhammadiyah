// Query planner: turns one research question into several complementary search
// queries so the sweep covers different angles (mechanism, population, outcome,
// counter-evidence, review articles) instead of a single keyword shot.
//
// Output is plain lines, not JSON — same truncation-tolerance reasoning as the
// synthesis layer. A partially-returned list is still usable.

const MAX_SUB_QUERIES = 6;

export const SUBQUERY_SYSTEM_PROMPT = [
  "Anda membantu merencanakan pencarian literatur akademik di katalog OpenAlex.",
  "Diberikan satu pertanyaan riset, hasilkan beberapa kueri pencarian yang saling melengkapi.",
  "",
  "Aturan:",
  "- Tulis kueri dalam BAHASA INGGRIS memakai istilah akademik (katalog paling kaya untuk bahasa Inggris), meskipun pertanyaannya berbahasa Indonesia.",
  `- Hasilkan ${MAX_SUB_QUERIES} kueri, SATU PER BARIS, tanpa nomor, tanpa tanda hubung, tanpa tanda kutip, tanpa penjelasan.`,
  "- Setiap kueri 3-8 kata, sudut pandang berbeda: konsep inti, mekanisme/intervensi, populasi/konteks, hasil/outcome, bukti tandingan atau keterbatasan, dan tinjauan/meta-analisis.",
  "- Jangan mengulang kueri yang sama.",
].join("\n");

export function buildSubQueryPrompt(question: string): string {
  return `PERTANYAAN RISET:\n${question.trim()}\n\nTulis kuerinya sekarang, satu per baris.`;
}

/**
 * Parse the model's line-separated queries. Strips bullets/numbering/quotes,
 * drops junk, dedupes case-insensitively, and caps the count.
 */
export function parseSubQueries(raw: string): string[] {
  const seen = new Set<string>();
  const queries: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line
      .replace(/```/g, "")
      .replace(/^\s*[-*•]\s*/, "")
      .replace(/^\s*\d+[.)]\s*/, "")
      .replace(/^["'`]|["'`]$/g, "")
      .trim();

    // Skip empties, headers, and over-long prose lines that aren't queries.
    if (!cleaned || cleaned.length < 3 || cleaned.length > 160) {
      continue;
    }
    if (cleaned.endsWith(":") || /^(kueri|queries|query)\b/i.test(cleaned)) {
      continue;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    queries.push(cleaned);

    if (queries.length >= MAX_SUB_QUERIES) {
      break;
    }
  }

  return queries;
}

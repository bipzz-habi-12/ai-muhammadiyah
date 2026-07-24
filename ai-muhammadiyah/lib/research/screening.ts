import type { ResearchSource } from "@/lib/research/openalex";

// Screening stage of the funnel: a few hundred candidates come back from the
// broad sweep, but only a few dozen abstracts fit in one synthesis prompt. This
// ranks locally (no LLM call, no cost, instant) on term overlap with the
// question + sub-queries, nudged by citation count and recency.

const STOPWORDS = new Set([
  // Indonesian
  "yang", "dan", "atau", "untuk", "pada", "dari", "dengan", "adalah", "ini",
  "itu", "apakah", "bagaimana", "mengapa", "kah", "di", "ke", "dalam", "akan",
  "tidak", "bisa", "dapat", "oleh", "sebagai", "juga", "para", "secara", "studi",
  // English
  "the", "and", "or", "for", "on", "of", "with", "is", "are", "this", "that",
  "does", "do", "how", "why", "what", "in", "to", "a", "an", "be", "by", "as",
  "from", "at", "it", "its", "can", "study", "research", "effect", "effects",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

function scoreSource(source: ResearchSource, keywords: string[]): number {
  if (keywords.length === 0) {
    return 0;
  }

  const title = source.title.toLowerCase();
  const abstract = source.abstract.toLowerCase();

  let matched = 0;
  let score = 0;

  for (const keyword of keywords) {
    const inTitle = title.includes(keyword);
    const inAbstract = abstract.includes(keyword);
    if (inTitle || inAbstract) {
      matched += 1;
    }
    // Title hits weigh more — they signal the work is *about* the term.
    if (inTitle) {
      score += 3;
    }
    if (inAbstract) {
      score += 1;
    }
  }

  // Coverage matters more than raw hit count: a work touching many distinct
  // aspects of the question beats one repeating a single term.
  const coverage = matched / keywords.length;
  score *= 1 + coverage;

  // Gentle nudges so ties resolve toward well-cited and recent work, without
  // letting either dominate genuine topical relevance.
  score += Math.log10(1 + source.citedByCount) * 0.6;
  if (source.year && source.year >= 2015) {
    score += source.year >= 2020 ? 0.8 : 0.4;
  }

  return score;
}

export type ScreeningResult = {
  /** The deep-read set, renumbered 1..N for citation. */
  selected: ResearchSource[];
  /** How many unique candidates were screened. */
  screenedCount: number;
};

/**
 * Rank the candidate pool against the question + sub-queries and keep the top
 * `topN` for deep reading. User-added sources are always kept (they are the
 * user's own evidence and must never be screened out), and are listed first.
 */
export function screenSources(
  question: string,
  subQueries: string[],
  candidates: ResearchSource[],
  topN = 30,
): ScreeningResult {
  const keywords = [
    ...new Set(tokenize([question, ...subQueries].join(" "))),
  ];

  const userAdded = candidates.filter((source) => source.userAdded);
  const retrieved = candidates.filter((source) => !source.userAdded);

  const ranked = retrieved
    .map((source) => ({ source, score: scoreSource(source, keywords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, topN - userAdded.length))
    .map((entry) => entry.source);

  const selected = [...userAdded, ...ranked].map((source, index) => ({
    ...source,
    n: index + 1,
  }));

  return { selected, screenedCount: candidates.length };
}

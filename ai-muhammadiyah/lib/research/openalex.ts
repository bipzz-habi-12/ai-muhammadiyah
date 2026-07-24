// Real scholarly-literature retrieval via OpenAlex (https://openalex.org) — a
// free, open, keyless catalog of ~250M works. This is what keeps Research
// honest: the synthesis layer may ONLY cite the papers returned here, never
// invented ones. OpenAlex asks for a `mailto` for the faster "polite pool"; no
// auth/API key is required.

export type ResearchSource = {
  n: number; // 1-based citation number, stable within one inquiry
  title: string;
  authors: string; // "Rahmawati, Hidayat, et al."
  venue: string; // journal / source name, or "" when unknown
  year: number | null;
  url: string; // DOI link when present, else the OpenAlex work URL
  citedByCount: number;
  abstract: string; // reconstructed plain text (may be "")
  userAdded?: boolean; // true when the user supplied this source manually
};

// User-supplied sources may carry longer pasted notes than an OpenAlex abstract.
const MAX_SOURCE_ABSTRACT_CHARS = 4000;

// Normalise an untrusted array (from a request body) into ResearchSource[],
// re-numbering 1..N so citations stay aligned after add/remove on the client.
export function coerceResearchSources(value: unknown): ResearchSource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index): ResearchSource | null => {
      const record = (item ?? {}) as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      if (!title) {
        return null;
      }
      const abstract =
        typeof record.abstract === "string"
          ? record.abstract.slice(0, MAX_SOURCE_ABSTRACT_CHARS)
          : "";
      return {
        n: index + 1,
        title,
        authors: typeof record.authors === "string" ? record.authors : "",
        venue: typeof record.venue === "string" ? record.venue : "",
        year: typeof record.year === "number" ? record.year : null,
        url: typeof record.url === "string" ? record.url : "",
        citedByCount:
          typeof record.citedByCount === "number" ? record.citedByCount : 0,
        abstract,
        userAdded: record.userAdded === true,
      };
    })
    .filter((source): source is ResearchSource => source !== null);
}

const OPENALEX_ENDPOINT = "https://api.openalex.org/works";
const POLITE_MAILTO = "research@aimuhammadiyah.my.id";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ABSTRACT_CHARS = 1400;

type OpenAlexAuthorship = {
  author?: { display_name?: string | null } | null;
};

type OpenAlexWork = {
  id?: string | null;
  doi?: string | null;
  title?: string | null;
  publication_year?: number | null;
  cited_by_count?: number | null;
  authorships?: OpenAlexAuthorship[] | null;
  primary_location?: { source?: { display_name?: string | null } | null } | null;
  abstract_inverted_index?: Record<string, number[]> | null;
};

// OpenAlex stores abstracts as an inverted index (word -> positions) to sidestep
// copyright on the raw text. Rebuild the running text from it.
function reconstructAbstract(
  index: Record<string, number[]> | null | undefined,
): string {
  if (!index) {
    return "";
  }

  const slots: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      if (position >= 0) {
        slots[position] = word;
      }
    }
  }

  const text = slots.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return text.length > MAX_ABSTRACT_CHARS
    ? `${text.slice(0, MAX_ABSTRACT_CHARS).trim()}…`
    : text;
}

function formatAuthors(authorships: OpenAlexAuthorship[] | null | undefined): string {
  const names = (authorships ?? [])
    .map((entry) => entry.author?.display_name?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return "Penulis tidak tercantum";
  }
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 3).join(", ")}, dkk.`;
}

function cleanDoiUrl(doi: string | null | undefined, openAlexId: string | null | undefined): string {
  if (doi) {
    return doi.startsWith("http") ? doi : `https://doi.org/${doi.replace(/^doi:/i, "")}`;
  }
  return openAlexId ?? "";
}

/**
 * Fetch one page of OpenAlex works for a query. Sources come back UNNUMBERED
 * (n = 0) — numbering happens after dedupe/ranking. Returns [] on any failure so
 * one bad sub-query never sinks a whole sweep.
 */
async function fetchWorksPage(
  query: string,
  perPage: number,
): Promise<ResearchSource[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const params = new URLSearchParams({
    search: trimmed,
    per_page: String(perPage),
    filter: "has_abstract:true",
    sort: "relevance_score:desc",
    select:
      "id,doi,title,publication_year,cited_by_count,authorships,primary_location,abstract_inverted_index",
    mailto: POLITE_MAILTO,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPENALEX_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error("OpenAlex request failed:", response.status);
      return [];
    }

    const payload = (await response.json()) as { results?: OpenAlexWork[] };
    const works = payload.results ?? [];

    return works
      .map((work): ResearchSource => ({
        n: 0,
        title: work.title?.trim() || "Tanpa judul",
        authors: formatAuthors(work.authorships),
        venue: work.primary_location?.source?.display_name?.trim() ?? "",
        year: typeof work.publication_year === "number" ? work.publication_year : null,
        url: cleanDoiUrl(work.doi, work.id),
        citedByCount:
          typeof work.cited_by_count === "number" ? work.cited_by_count : 0,
        abstract: reconstructAbstract(work.abstract_inverted_index),
      }))
      .filter((source) => source.abstract.length > 0);
  } catch (error) {
    console.error("OpenAlex fetch error:", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// Stable identity for dedupe across sub-queries: DOI/OpenAlex URL when present,
// else a normalised title.
function sourceKey(source: ResearchSource): string {
  if (source.url) {
    return source.url.toLowerCase();
  }
  return source.title.toLowerCase().replace(/\s+/g, " ").trim();
}

export function dedupeSources(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  const unique: ResearchSource[] = [];
  for (const source of sources) {
    const key = sourceKey(source);
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(source);
    }
  }
  return unique;
}

/**
 * Broad sweep: run every query in parallel and union the results. This is what
 * makes "deep" research deep — several angles on the question, a few hundred
 * unique works, deduped. Results stay UNNUMBERED; the caller ranks then numbers.
 */
export async function searchLiteratureMulti(
  queries: string[],
  perQuery = 60,
): Promise<ResearchSource[]> {
  const cleaned = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  if (cleaned.length === 0) {
    return [];
  }

  const pages = await Promise.all(
    cleaned.map((query) =>
      fetchWorksPage(query, Math.max(1, Math.min(perQuery, 200))),
    ),
  );

  return dedupeSources(pages.flat());
}

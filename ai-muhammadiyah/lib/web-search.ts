// Web search sources: unlike lib/artifacts.ts and lib/second-brain/parse.ts,
// the AI never writes this marker itself. It carries Gemini's Google Search
// grounding metadata (the pages it actually consulted) and is appended by the
// SERVER as the last chunk of the stream, in app/api/chat/route.ts, right
// after the model's own text finishes. Reusing the marker-family convention
// means no messages.sources DB column is needed: the marker rides inside
// messages.content like artifact/note markers do, and reopening a
// conversation later still shows the same source chips.
//
// IMPORTANT caveat, confirmed against a live Gemini call (2026-08-13): each
// groundingChunks[].web.uri is a vertexaisearch.cloud.google.com redirect
// link, NOT the publisher's direct URL — clicking it lands the user on the
// real page (verified: a Wikipedia grounding chunk resolved to
// en.wikipedia.org in a real browser), but the link only works from an
// actual browser navigation, not a bare server-side fetch, and
// web.title is just the bare hostname ("wikipedia.org"), never a real page
// title. Render it as a domain chip, not as an article title.

export type WebSource = {
  url: string;
  title: string;
};

const sourcesOpenMarker = "[[AI_MU_SOURCES]]";
const sourcesCloseMarker = "[[/AI_MU_SOURCES]]";
const sourcesBlockPattern =
  /\[\[AI_MU_SOURCES\]\][ \t]*\r?\n?([\s\S]*?)\[\[\/AI_MU_SOURCES\]\]/;

function isWebSource(value: unknown): value is WebSource {
  const candidate = value as WebSource | null;
  return (
    Boolean(candidate) &&
    typeof candidate?.url === "string" &&
    typeof candidate?.title === "string"
  );
}

/** Server-side only: builds the marker block to enqueue after the model's
 *  own streamed text. Returns "" (nothing to append) when there are no
 *  sources, so callers can unconditionally concatenate the result. */
export function buildSourcesMarkerBlock(
  sources: WebSource[],
  queries: string[] = [],
): string {
  if (!sources.length) {
    return "";
  }

  const payload = JSON.stringify({ queries, sources });

  return `\n\n${sourcesOpenMarker}\n${payload}\n${sourcesCloseMarker}`;
}

export function parseSourcesFromText(
  text: string,
): { sources: WebSource[]; queries: string[] } | null {
  const match = text.match(sourcesBlockPattern);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as {
      sources?: unknown[];
      queries?: unknown[];
    };
    const sources = (parsed.sources ?? []).filter(isWebSource);

    if (!sources.length) {
      return null;
    }

    return {
      sources,
      queries: (parsed.queries ?? []).filter(
        (query): query is string => typeof query === "string",
      ),
    };
  } catch {
    return null;
  }
}

// Render-time strip, same partial-tail approach as
// formatArtifactTextForDisplay: hides an in-flight marker instead of
// flashing raw JSON while the last chunk is still arriving over the wire.
export function formatSourcesTextForDisplay(text: string): string {
  let displayText = text.replace(sourcesBlockPattern, "");

  const openMarkerStart = displayText.lastIndexOf(sourcesOpenMarker);

  if (openMarkerStart !== -1) {
    displayText = displayText.slice(0, openMarkerStart).trimEnd();
  }

  return displayText;
}

// Export transform: inlined as a reference list (same reasoning as
// formatArtifactTextForExport — a .md file read on its own needs the actual
// content, not "lihat di panel").
export function formatSourcesTextForExport(text: string): string {
  return text.replace(sourcesBlockPattern, (_match, rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson) as { sources?: unknown[] };
      const sources = (parsed.sources ?? []).filter(isWebSource);

      if (!sources.length) {
        return "";
      }

      const list = sources
        .map((source, index) => `${index + 1}. ${source.title} — ${source.url}`)
        .join("\n");

      return `\n\n**Sumber web:**\n${list}`;
    } catch {
      return "";
    }
  });
}

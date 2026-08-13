import type { SupabaseClient } from "@supabase/supabase-js";

// Artifacts v2: document | table | diagram | code | html_app | react_app.
// The mini-app types run AI-written code in the user's browser; everything that
// makes that safe lives in lib/sandbox/mini-app.ts — read it before touching
// how these are rendered.
//
// The AI marks an artifact by wrapping it in plain-text sentinels (same family
// as [[AI_MU_CONTINUE_SUGGESTED]] — plain markers survive streaming, unlike
// JSON, and unlike ```fences they tolerate code fences inside the content):
//
//   [[AI_MU_ARTIFACT:code|Judul singkat]]
//   ...isi...
//   [[/AI_MU_ARTIFACT]]
//
// Message rows keep the RAW marker text (so chat history still carries the
// content for follow-ups); stripping happens at render time via
// formatArtifactTextForDisplay.

export type ArtifactType =
  | "document"
  | "table"
  | "diagram"
  | "code"
  | "html_app"
  | "react_app";

export type ArtifactRuntime = "html" | "react";

/** Runtime hanya turunan dari tipe — disimpan di kolomnya sendiri karena panel
 *  memutuskan "perlu iframe sandbox atau tidak" dari kolom ini. */
export function artifactRuntimeForType(
  type: ArtifactType,
): ArtifactRuntime | null {
  if (type === "html_app") {
    return "html";
  }

  if (type === "react_app") {
    return "react";
  }

  return null;
}

export type ArtifactContent = {
  text: string;
  language: string | null;
};

export type ArtifactDraft = {
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
};

export type Artifact = {
  id: string;
  conversationId: string;
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
  runtime: ArtifactRuntime | null;
  createdAt: string;
  updatedAt: string;
};

type ArtifactRow = {
  id: string;
  conversation_id: string;
  type: string;
  title: string;
  content: unknown;
  runtime: string | null;
  created_at: string;
  updated_at: string;
};

export const artifactTypeLabels: Record<ArtifactType, string> = {
  document: "Dokumen",
  table: "Tabel",
  diagram: "Diagram",
  code: "Kode",
  html_app: "Mini aplikasi",
  react_app: "Mini aplikasi",
};

const artifactOpenMarkerPrefix = "[[AI_MU_ARTIFACT:";
const artifactCloseMarker = "[[/AI_MU_ARTIFACT]]";

const artifactTypeAlternation =
  "document|table|diagram|code|html_app|react_app";

const artifactBlockPattern = new RegExp(
  `\\[\\[AI_MU_ARTIFACT:(${artifactTypeAlternation})\\|([^\\]\\n]{0,160})\\]\\][ \\t]*\\r?\\n?([\\s\\S]*?)\\[\\[\\/AI_MU_ARTIFACT\\]\\]`,
  "g",
);
const artifactOpenPattern = new RegExp(
  `\\[\\[AI_MU_ARTIFACT:(${artifactTypeAlternation})\\|([^\\]\\n]{0,160})\\]\\][ \\t]*\\r?\\n?`,
);

function normalizeArtifactTitle(rawTitle: string) {
  const title = rawTitle.trim();
  return title || "Untitled";
}

// AIs habitually fence code even when told not to — strip ONE wrapping
// ```lang fence (capturing the language) so content.text stays raw.
function normalizeArtifactBody(rawBody: string): ArtifactContent {
  const body = rawBody.trim();
  const fenceMatch = body.match(/^```([A-Za-z0-9+#._-]*)[ \t]*\r?\n([\s\S]*?)\r?\n?```$/);

  if (fenceMatch) {
    return {
      text: fenceMatch[2],
      language: fenceMatch[1] ? fenceMatch[1].toLowerCase() : null,
    };
  }

  return { text: body, language: null };
}

export function parseArtifactBlocks(text: string): ArtifactDraft[] {
  const drafts: ArtifactDraft[] = [];

  for (const match of text.matchAll(artifactBlockPattern)) {
    const content = normalizeArtifactBody(match[3]);

    if (!content.text.trim()) {
      continue;
    }

    drafts.push({
      type: match[1] as ArtifactType,
      title: normalizeArtifactTitle(match[2]),
      content,
    });
  }

  return drafts;
}

// Render-time transform for AI message text — used for streamed, final, and
// reloaded-from-DB text alike (rows store the raw markers):
// 1. complete blocks collapse to a one-line reference (content lives in the panel);
// 2. an unclosed opening marker becomes a bold title so the body streams
//    visibly underneath while the AI is still writing it;
// 3. a partially-streamed marker at the tail is hidden to avoid marker flicker.
export function formatArtifactTextForDisplay(text: string) {
  let displayText = text.replace(
    artifactBlockPattern,
    (_match, _type: string, rawTitle: string) =>
      `📄 **${normalizeArtifactTitle(rawTitle)}** — tersimpan di panel Artifact.`,
  );

  displayText = displayText.replace(
    artifactOpenPattern,
    (_match, _type: string, rawTitle: string) =>
      `📄 **${normalizeArtifactTitle(rawTitle)}**\n\n`,
  );

  const lastMarkerStart = displayText.lastIndexOf("[[");

  if (lastMarkerStart !== -1) {
    const tail = displayText.slice(lastMarkerStart);
    const isPartialMarker =
      !tail.includes("]]") &&
      (artifactOpenMarkerPrefix.startsWith(tail) ||
        tail.startsWith(artifactOpenMarkerPrefix) ||
        artifactCloseMarker.startsWith(tail));

    if (isPartialMarker) {
      displayText = displayText.slice(0, lastMarkerStart).trimEnd();
    }
  }

  return displayText;
}

// Export/share transform. Different goal from the render-time one above: an
// exported .md file is read on its own, away from the Artifact panel, so the
// content must be INLINED rather than collapsed to a "lihat di panel" line —
// otherwise exporting a chat silently drops the very thing the AI produced.
// Either way, raw sentinels must never reach a file the user opens elsewhere.
const defaultFenceLanguage: Partial<Record<ArtifactType, string>> = {
  diagram: "mermaid",
  html_app: "html",
  react_app: "jsx",
};

export function formatArtifactTextForExport(text: string) {
  let exportText = text.replace(
    artifactBlockPattern,
    (_match, type: string, rawTitle: string, rawBody: string) => {
      const artifactType = type as ArtifactType;
      const { text: body, language } = normalizeArtifactBody(rawBody);
      const heading = `### ${normalizeArtifactTitle(rawTitle)} (${artifactTypeLabels[artifactType]})`;

      // document/table are already markdown; everything else needs a fence to
      // survive as code rather than being reflowed as prose.
      if (artifactType === "document" || artifactType === "table") {
        return [heading, "", body].join("\n");
      }

      const fenceLanguage = language ?? defaultFenceLanguage[artifactType] ?? "";

      return [heading, "", `\`\`\`${fenceLanguage}`, body, "```"].join("\n");
    },
  );

  // An interrupted stream can leave an opening marker with no close. Keep the
  // body (it is real content) and drop only the sentinel.
  exportText = exportText.replace(
    artifactOpenPattern,
    (_match, _type: string, rawTitle: string) =>
      `### ${normalizeArtifactTitle(rawTitle)}\n\n`,
  );

  return exportText;
}

function normalizeArtifactType(value: string): ArtifactType {
  if (
    value === "document" ||
    value === "table" ||
    value === "diagram" ||
    value === "code" ||
    value === "html_app" ||
    value === "react_app"
  ) {
    return value;
  }

  // Unknown type from a newer writer: show the source rather than nothing.
  return "code";
}

function normalizeStoredContent(value: unknown): ArtifactContent {
  if (value && typeof value === "object") {
    const candidate = value as { text?: unknown; language?: unknown };

    return {
      text: typeof candidate.text === "string" ? candidate.text : "",
      language:
        typeof candidate.language === "string" && candidate.language
          ? candidate.language
          : null,
    };
  }

  return { text: "", language: null };
}

function mapArtifactRow(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    type: normalizeArtifactType(row.type),
    title: row.title,
    content: normalizeStoredContent(row.content),
    runtime: row.runtime === "html" || row.runtime === "react" ? row.runtime : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const artifactSelectColumns =
  "id,conversation_id,type,title,content,runtime,created_at,updated_at";

export async function fetchConversationArtifacts(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Artifact[]> {
  const { data, error } = await supabase
    .from("artifacts")
    .select(artifactSelectColumns)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ArtifactRow[]).map(mapArtifactRow);
}

export async function insertArtifacts(
  supabase: SupabaseClient,
  conversationId: string,
  drafts: ArtifactDraft[],
): Promise<Artifact[]> {
  const { data, error } = await supabase
    .from("artifacts")
    .insert(
      drafts.map((draft) => ({
        conversation_id: conversationId,
        type: draft.type,
        title: draft.title,
        content: draft.content,
        runtime: artifactRuntimeForType(draft.type),
      })),
    )
    .select(artifactSelectColumns);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ArtifactRow[]).map(mapArtifactRow);
}

export async function deleteArtifactRow(
  supabase: SupabaseClient,
  artifactId: string,
): Promise<void> {
  const { error } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", artifactId);

  if (error) {
    throw error;
  }
}

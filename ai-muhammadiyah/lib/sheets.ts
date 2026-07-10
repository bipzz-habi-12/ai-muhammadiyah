import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_COLUMNS, MAX_ROWS } from "@/lib/sheets/formula";

export type Sheet = {
  id: string;
  workspaceId: string;
  title: string;
  columns: string[];
  rows: string[][];
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

type SheetRow = {
  id: string;
  workspace_id: string;
  title: string;
  data: unknown;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

// This is appended after AI Muhammadiyah's shared "always use clean Markdown
// with headings/bullets/tables" style prompt (see responseStyleSystemPrompt
// in lib/ai/chat.ts) — that instruction directly conflicts with "JSON only"
// here, and models frequently obey the earlier, more general style guidance
// instead. The override line below is a best-effort nudge; it is NOT relied
// on for correctness — parseGeneratedSheet() below has a Markdown-table
// fallback specifically because this drift is expected, not exceptional.
export const SHEET_EXTRACTOR_SYSTEM_PROMPT = [
  "You extract tabular data from a chat conversation for AI Muhammadiyah's Sheets tool.",
  "Read the conversation and identify concrete tabular data — lists of items with attributes,",
  "figures, comparisons, or similar data that fits naturally into a spreadsheet grid.",
  "This response is consumed directly by a program, not shown to the user as-is — general",
  "Markdown/formatting style instructions do NOT apply here, they apply to normal chat replies only.",
  "Respond with ONLY a raw JSON object: no markdown code fences, no ``` blocks, no Markdown table,",
  "no headings, no explanation before or after. The very first character of your response must be '{'.",
  "Use exactly this shape:",
  '{"title": "short sheet title", "columns": ["Column A", "Column B"], "rows": [["value", "value"]]}',
  "Every row must have the same number of cells as `columns`. Use literal text/number values only —",
  "never write spreadsheet formulas (no leading '=').",
  `Use at most ${MAX_COLUMNS} columns and ${MAX_ROWS} rows.`,
  "If there is no tabular data in the conversation, respond with a single empty column and no rows:",
  '{"title": "Sheet dari chat", "columns": [""], "rows": []}',
  "Write in the same language the conversation is mostly in (Indonesian or English).",
].join(" ");

function defaultColumns(count = 6): string[] {
  return Array.from({ length: count }, (_, index) =>
    String.fromCharCode(65 + index),
  );
}

function defaultRows(rowCount = 10, colCount = 6): string[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ""),
  );
}

// data jsonb isn't trusted blindly — coerce it into a well-formed grid the
// same way lib/tasks.ts's normalizeTaskItem coerces its jsonb array.
function normalizeGrid(raw: unknown): { columns: string[]; rows: string[][] } {
  const candidate =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const columns = Array.isArray(candidate.columns)
    ? candidate.columns.map((cell) => String(cell ?? "")).slice(0, MAX_COLUMNS)
    : defaultColumns();

  const safeColumns = columns.length > 0 ? columns : defaultColumns();
  const colCount = safeColumns.length;

  const rawRows = Array.isArray(candidate.rows) ? candidate.rows : [];
  const rows = rawRows.slice(0, MAX_ROWS).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return Array.from({ length: colCount }, (_, index) =>
      String(cells[index] ?? ""),
    );
  });

  return { columns: safeColumns, rows };
}

function mapSheetRow(row: SheetRow): Sheet {
  const grid = normalizeGrid(row.data);

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    columns: grid.columns,
    rows: grid.rows,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const sheetColumns = "id,workspace_id,title,data,source_ref,created_at,updated_at";

export async function listSheets(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("sheets")
    .select(sheetColumns)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SheetRow[]).map(mapSheetRow);
}

export async function createSheet(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    title?: string;
    columns?: string[];
    rows?: string[][];
    sourceRef?: string | null;
  },
) {
  const columns = input.columns?.length ? input.columns.slice(0, MAX_COLUMNS) : defaultColumns();
  const rows = input.rows?.length
    ? input.rows.slice(0, MAX_ROWS).map((row) =>
        Array.from({ length: columns.length }, (_, index) => String(row[index] ?? "")),
      )
    : defaultRows(10, columns.length);

  const { data, error } = await supabase
    .from("sheets")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title?.trim() || "Untitled",
      data: { columns, rows },
      source_ref: input.sourceRef ?? null,
    })
    .select(sheetColumns)
    .single();

  if (error || !data) {
    throw error ?? new Error("Sheet belum bisa dibuat.");
  }

  return mapSheetRow(data as SheetRow);
}

export async function updateSheet(
  supabase: SupabaseClient,
  id: string,
  patch: { title?: string; columns?: string[]; rows?: string[][] },
) {
  const update: Record<string, unknown> = {};

  if (typeof patch.title === "string") {
    update.title = patch.title.trim() || "Untitled";
  }

  if (patch.columns || patch.rows) {
    const columns = (patch.columns ?? []).slice(0, MAX_COLUMNS);
    const safeColumns = columns.length > 0 ? columns : defaultColumns();
    const rows = (patch.rows ?? []).slice(0, MAX_ROWS).map((row) =>
      Array.from({ length: safeColumns.length }, (_, index) => String(row[index] ?? "")),
    );
    update.data = { columns: safeColumns, rows };
  }

  const { data, error } = await supabase
    .from("sheets")
    .update(update)
    .eq("id", id)
    .select(sheetColumns)
    .single();

  if (error || !data) {
    return null;
  }

  return mapSheetRow(data as SheetRow);
}

export async function deleteSheet(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("sheets")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

type GeneratedSheet = {
  title: string;
  columns: string[];
  rows: string[][];
  truncated: boolean;
};

function clampGrid(
  title: string,
  rawColumns: string[],
  rawRows: unknown[],
): GeneratedSheet {
  const wasTooBig = rawColumns.length > MAX_COLUMNS || rawRows.length > MAX_ROWS;
  const columns = rawColumns.length > 0 ? rawColumns.slice(0, MAX_COLUMNS) : [""];
  const rows = rawRows.slice(0, MAX_ROWS).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return Array.from({ length: columns.length }, (_, index) =>
      String(cells[index] ?? ""),
    );
  });

  return { title, columns, rows, truncated: wasTooBig };
}

// Scans for the first syntactically-balanced {...} object in the text,
// respecting string literals (so braces inside quoted values don't throw off
// the depth count) and any trailing prose after the object. More robust than
// a greedy /\{[\s\S]*\}/ regex, which breaks if the model adds commentary
// containing its own braces after the JSON.
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function tryParseJsonSheet(aiText: string): GeneratedSheet | null {
  const candidates = [aiText.trim()];
  const fencedMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    candidates.push(fencedMatch[1].trim());
  }

  const balancedObject = extractFirstJsonObject(aiText);

  if (balancedObject) {
    candidates.push(balancedObject);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;

      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.columns)) {
        continue;
      }

      const title =
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : "Sheet dari chat";
      const rawColumns = parsed.columns.map((cell) => String(cell ?? ""));
      const rawRows = Array.isArray(parsed.rows) ? parsed.rows : [];

      return clampGrid(title, rawColumns, rawRows);
    } catch {
      continue;
    }
  }

  return null;
}

function splitMarkdownTableRow(line: string): string[] {
  let trimmed = line.trim();

  if (trimmed.startsWith("|")) {
    trimmed = trimmed.slice(1);
  }

  if (trimmed.endsWith("|")) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed.split("|").map((cell) => cell.trim());
}

// A Markdown "---|---" separator row, or a row that's otherwise all dashes/
// colons/blank cells.
function isMarkdownSeparatorRow(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((cell) => cell === "" || /^:?-{2,}:?$/.test(cell))
  );
}

// Fallback for when the model ignores the JSON-only instruction and replies
// with a normal Markdown table instead (the shared response-style system
// prompt explicitly nudges toward Markdown tables for this kind of content —
// see the comment above SHEET_EXTRACTOR_SYSTEM_PROMPT). Finds the longest
// contiguous block of "|"-delimited lines and treats the first row as
// headers, an optional "---|---" row as the separator, and the rest as data.
function parseMarkdownTableSheet(aiText: string): GeneratedSheet | null {
  const lines = aiText.split("\n");
  let bestBlock: string[] = [];
  let currentBlock: string[] = [];

  const flush = () => {
    if (currentBlock.length > bestBlock.length) {
      bestBlock = currentBlock;
    }

    currentBlock = [];
  };

  for (const line of lines) {
    if (line.includes("|") && line.trim().length > 0) {
      currentBlock.push(line);
    } else {
      flush();
    }
  }

  flush();

  if (bestBlock.length < 2) {
    return null;
  }

  const parsedRows = bestBlock.map(splitMarkdownTableRow);
  const header = parsedRows[0];
  const dataStart = isMarkdownSeparatorRow(parsedRows[1] ?? []) ? 2 : 1;
  const dataRows = parsedRows
    .slice(dataStart)
    .filter((row) => !isMarkdownSeparatorRow(row));

  if (header.length === 0 || header.every((cell) => !cell)) {
    return null;
  }

  const blockStartIndex = lines.indexOf(bestBlock[0]);
  let title = "Sheet dari chat";

  for (let i = blockStartIndex - 1; i >= 0; i -= 1) {
    const candidate = lines[i].trim();

    if (!candidate) {
      continue;
    }

    const cleaned = candidate.replace(/^#+\s*/, "").replace(/[:.]\s*$/, "").trim();
    title = cleaned || title;
    break;
  }

  return clampGrid(title, header, dataRows);
}

// Parses the AI's response into a generated grid. Tries strict JSON first
// (the documented contract), then falls back to a Markdown-table parse
// (the realistic failure mode — see SHEET_EXTRACTOR_SYSTEM_PROMPT comment).
// Returns null only if neither succeeds — the caller should surface a clear
// error rather than create an empty/corrupt sheet.
export function parseGeneratedSheet(aiText: string): GeneratedSheet | null {
  return tryParseJsonSheet(aiText) ?? parseMarkdownTableSheet(aiText);
}

// --- Browser-side fetch wrappers (used by hooks/useSheets.ts) ---

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string) {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export async function fetchSheets(workspaceId: string) {
  const response = await fetch(
    `/api/sheets?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "GET", cache: "no-store" },
  );
  const data = await parseJsonOrThrow<{ sheets: Sheet[] }>(
    response,
    "Sheets belum bisa dimuat.",
  );

  return data.sheets ?? [];
}

export async function createSheetRequest(input: {
  workspaceId: string;
  title?: string;
  columns?: string[];
  rows?: string[][];
  sourceRef?: string | null;
}) {
  const response = await fetch("/api/sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ sheet: Sheet }>(
    response,
    "Sheet belum bisa dibuat.",
  );

  return data.sheet;
}

export async function updateSheetRequest(
  id: string,
  patch: { title?: string; columns?: string[]; rows?: string[][] },
) {
  const response = await fetch(`/api/sheets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonOrThrow<{ sheet: Sheet }>(
    response,
    "Sheet belum bisa disimpan.",
  );

  return data.sheet;
}

export async function deleteSheetRequest(id: string) {
  const response = await fetch(`/api/sheets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseJsonOrThrow<{ ok: boolean }>(response, "Sheet belum bisa dihapus.");
}

export async function generateSheetFromChat(input: {
  workspaceId: string;
  conversationId: string;
}) {
  const response = await fetch("/api/sheets/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ sheet: Sheet; truncated: boolean }>(
    response,
    "Sheet belum bisa digenerate.",
  );

  return data;
}

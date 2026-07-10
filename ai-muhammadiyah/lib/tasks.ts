import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
};

export type TaskList = {
  id: string;
  workspaceId: string;
  title: string;
  items: TaskItem[];
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskListRow = {
  id: string;
  workspace_id: string;
  title: string;
  tasks: unknown;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

// This is appended after AI Muhammadiyah's shared "always use clean Markdown
// with headings/bullets/tables" style prompt (see responseStyleSystemPrompt
// in lib/ai/chat.ts) — that instruction directly conflicts with "JSON only"
// here, and models frequently obey the earlier, more general style guidance
// instead (confirmed: this exact conflict broke Sheets' generate-from-chat,
// see lib/sheets.ts). The override line below is a best-effort nudge; it is
// NOT relied on for correctness — parseExtractedTasks() below has Markdown
// list/table fallbacks specifically because this drift is expected.
export const TASK_EXTRACTOR_SYSTEM_PROMPT = [
  "You extract concrete action items from a chat conversation for AI Muhammadiyah's Tasks tool.",
  "Read the conversation and identify specific, actionable tasks — not a general summary.",
  "This response is consumed directly by a program, not shown to the user as-is — general",
  "Markdown/formatting style instructions do NOT apply here, they apply to normal chat replies only.",
  "Respond with ONLY a raw JSON array: no markdown code fences, no ``` blocks, no bullet or numbered",
  "list, no explanation before or after. The very first character of your response must be '['.",
  "Use exactly this shape:",
  '[{"title": "short imperative task title", "description": "optional 1-2 sentence detail, or empty string"}]',
  "If there are no concrete action items in the conversation, respond with an empty array: []",
  "Write in the same language the conversation is mostly in (Indonesian or English).",
].join(" ");

function normalizeTaskItem(raw: unknown): TaskItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    return null;
  }

  const status: TaskStatus =
    candidate.status === "in_progress" || candidate.status === "done"
      ? candidate.status
      : "todo";

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    title: candidate.title.trim(),
    description:
      typeof candidate.description === "string" ? candidate.description : "",
    status,
  };
}

function mapTaskListRow(row: TaskListRow): TaskList {
  const rawItems = Array.isArray(row.tasks) ? row.tasks : [];

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    items: rawItems
      .map(normalizeTaskItem)
      .filter((item): item is TaskItem => item !== null),
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const taskListColumns =
  "id,workspace_id,title,tasks,source_ref,created_at,updated_at";

export async function listTaskLists(
  supabase: SupabaseClient,
  workspaceId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select(taskListColumns)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as TaskListRow[]).map(mapTaskListRow);
}

export async function createTaskList(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    title?: string;
    items?: TaskItem[];
    sourceRef?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title?.trim() || "Untitled",
      tasks: input.items ?? [],
      source_ref: input.sourceRef ?? null,
    })
    .select(taskListColumns)
    .single();

  if (error || !data) {
    throw error ?? new Error("Task list belum bisa dibuat.");
  }

  return mapTaskListRow(data as TaskListRow);
}

export async function updateTaskList(
  supabase: SupabaseClient,
  id: string,
  patch: { title?: string; items?: TaskItem[] },
) {
  const update: Record<string, unknown> = {};

  if (typeof patch.title === "string") {
    update.title = patch.title.trim() || "Untitled";
  }

  if (patch.items) {
    update.tasks = patch.items;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select(taskListColumns)
    .single();

  if (error || !data) {
    return null;
  }

  return mapTaskListRow(data as TaskListRow);
}

export async function deleteTaskList(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

type ExtractedTask = { title: string; description: string };

// Scans for the first syntactically-balanced [...] array in the text,
// respecting string literals (so brackets inside quoted values don't throw
// off the depth count) and any trailing prose after the array. More robust
// than a greedy /\[[\s\S]*\]/ regex, which breaks if the model adds
// commentary containing its own brackets after the JSON.
function extractFirstJsonArray(text: string): string | null {
  const start = text.indexOf("[");

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

    if (ch === "[") {
      depth += 1;
    } else if (ch === "]") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function tryParseTaskArray(candidate: string): ExtractedTask[] | null {
  try {
    const parsed = JSON.parse(candidate);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .filter(
        (item): item is { title: string; description?: string } =>
          item &&
          typeof item === "object" &&
          typeof item.title === "string" &&
          item.title.trim().length > 0,
      )
      .map((item) => ({
        title: item.title.trim(),
        description:
          typeof item.description === "string" ? item.description : "",
      }));
  } catch {
    return null;
  }
}

function tryParseJsonTasks(aiText: string): ExtractedTask[] | null {
  // Whole-response and fenced-code-block candidates are trusted enough that
  // an empty [] result from them means "AI intentionally found nothing".
  const trustedCandidates = [aiText.trim()];
  const fencedMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    trustedCandidates.push(fencedMatch[1].trim());
  }

  for (const candidate of trustedCandidates) {
    const parsed = tryParseTaskArray(candidate);

    if (parsed !== null) {
      return parsed;
    }
  }

  // The balanced-bracket scan is a much weaker signal — it can accidentally
  // land on an unrelated "[ ]"/"[x]" checkbox marker inside a Markdown
  // checklist (itself valid, empty-array JSON), which would otherwise get
  // mistaken for "AI replied with an intentionally empty array" and skip the
  // Markdown-list fallback below it. Require a non-empty result here.
  const balancedArray = extractFirstJsonArray(aiText);

  if (balancedArray) {
    const parsed = tryParseTaskArray(balancedArray);

    if (parsed !== null && parsed.length > 0) {
      return parsed;
    }
  }

  return null;
}

const listItemPattern = /^\s*(?:[-*•]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.+)$/;

// "**Title**: description" or "Title — description" style content within a
// single list item — split on the first colon/dash separator that's
// followed by whitespace (so mid-word hyphens like "Follow-up" don't split).
function splitTitleDescription(content: string): ExtractedTask {
  const boldMatch = content.match(/^\*\*(.+?)\*\*\s*[:\-–—]?\s*(.*)$/);

  if (boldMatch) {
    return { title: boldMatch[1].trim(), description: boldMatch[2].trim() };
  }

  const separatorMatch = content.match(/^(.+?)\s*[:\-–—]\s+(.+)$/);

  if (separatorMatch && separatorMatch[1].trim()) {
    return {
      title: separatorMatch[1].trim(),
      description: separatorMatch[2].trim(),
    };
  }

  return { title: content.trim(), description: "" };
}

// Fallback for when the model ignores the JSON-only instruction and replies
// with a normal Markdown bullet/numbered/checkbox list instead (the most
// natural format for "action items" — see the comment above
// TASK_EXTRACTOR_SYSTEM_PROMPT).
function parseMarkdownListTasks(aiText: string): ExtractedTask[] | null {
  const items: ExtractedTask[] = [];

  for (const line of aiText.split("\n")) {
    const match = line.match(listItemPattern);
    const content = match?.[1]?.trim();

    if (!content) {
      continue;
    }

    const item = splitTitleDescription(content);

    if (item.title) {
      items.push(item);
    }
  }

  return items.length > 0 ? items : null;
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

function isMarkdownSeparatorRow(cells: string[]): boolean {
  return (
    cells.length > 0 &&
    cells.every((cell) => cell === "" || /^:?-{2,}:?$/.test(cell))
  );
}

// Second-choice fallback for a Markdown table instead of a list — maps the
// first column to title and the second (if present) to description,
// regardless of header names.
function parseMarkdownTableTasks(aiText: string): ExtractedTask[] | null {
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
  const dataStart = isMarkdownSeparatorRow(parsedRows[1] ?? []) ? 2 : 1;
  const items = parsedRows
    .slice(dataStart)
    .filter((row) => !isMarkdownSeparatorRow(row))
    .map((row) => ({
      title: (row[0] ?? "").trim(),
      description: (row[1] ?? "").trim(),
    }))
    .filter((item) => item.title.length > 0);

  return items.length > 0 ? items : null;
}

// Parses the AI's response into extracted action items. Tries strict JSON
// first (the documented contract), then a Markdown list, then a Markdown
// table (the realistic failure modes — see TASK_EXTRACTOR_SYSTEM_PROMPT
// comment). Returns null only if none succeed — an empty array from the
// JSON path is a valid "no action items found" result, distinct from a
// parse failure.
export function parseExtractedTasks(aiText: string): ExtractedTask[] | null {
  return (
    tryParseJsonTasks(aiText) ??
    parseMarkdownListTasks(aiText) ??
    parseMarkdownTableTasks(aiText)
  );
}

// --- Browser-side fetch wrappers (used by hooks/useTasks.ts) ---

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string) {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export async function fetchTaskLists(workspaceId: string) {
  const response = await fetch(
    `/api/tasks?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "GET", cache: "no-store" },
  );
  const data = await parseJsonOrThrow<{ lists: TaskList[] }>(
    response,
    "Tasks belum bisa dimuat.",
  );

  return data.lists ?? [];
}

export async function createTaskListRequest(input: {
  workspaceId: string;
  title?: string;
  items?: TaskItem[];
  sourceRef?: string | null;
}) {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ list: TaskList }>(
    response,
    "Task list belum bisa dibuat.",
  );

  return data.list;
}

export async function updateTaskListRequest(
  id: string,
  patch: { title?: string; items?: TaskItem[] },
) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonOrThrow<{ list: TaskList }>(
    response,
    "Task belum bisa disimpan.",
  );

  return data.list;
}

export async function deleteTaskListRequest(id: string) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseJsonOrThrow<{ ok: boolean }>(response, "Task list belum bisa dihapus.");
}

export async function generateTasksFromChat(input: {
  workspaceId: string;
  conversationId: string;
}) {
  const response = await fetch("/api/tasks/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{
    list: TaskList;
    createdCount: number;
    skipped: number;
  }>(response, "Tasks belum bisa digenerate.");

  return data;
}

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

export const TASK_EXTRACTOR_SYSTEM_PROMPT = [
  "You extract concrete action items from a chat conversation for AI Muhammadiyah's Tasks tool.",
  "Read the conversation and identify specific, actionable tasks — not a general summary.",
  "Respond with ONLY a JSON array, no markdown code fences, no extra commentary, in this exact shape:",
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

// Parses the AI's JSON-array response into extracted action items.
// Returns null on unrecoverable parse failure (caller should surface a clear
// error) — an empty array is a valid "no action items found" result, distinct
// from a parse failure.
export function parseExtractedTasks(
  aiText: string,
): { title: string; description: string }[] | null {
  const candidates = [aiText.trim()];
  const fencedMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    candidates.push(fencedMatch[1].trim());
  }

  const bracketMatch = aiText.match(/\[[\s\S]*\]/);

  if (bracketMatch) {
    candidates.push(bracketMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (!Array.isArray(parsed)) {
        continue;
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
      continue;
    }
  }

  return null;
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

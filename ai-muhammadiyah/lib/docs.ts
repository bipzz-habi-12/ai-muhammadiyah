import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/ai/chat";

export type Doc = {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

type DocRow = {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

type MessageContextRow = {
  role: "user" | "assistant";
  content: string;
};

export const DOC_AUTHOR_SYSTEM_PROMPT = [
  "You are AI Muhammadiyah's document-authoring assistant.",
  "You will be given a chat conversation. Turn it into a well-structured draft document in Markdown.",
  "Start with a single '# Title' heading that summarizes the topic, then organize the content into",
  "clear sections with '##' headings, using paragraphs, bullet lists, or numbered lists where helpful.",
  "Write in the same language the conversation is mostly in (Indonesian or English).",
  "Do not include meta-commentary about being an AI or about the chat itself — write only the document content.",
].join(" ");

function mapDocRow(row: DocRow): Doc {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    content: row.content,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const docColumns =
  "id,workspace_id,title,content,source_ref,created_at,updated_at";

export async function listDocs(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("docs")
    .select(docColumns)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DocRow[]).map(mapDocRow);
}

export async function createDoc(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    title?: string;
    content?: string;
    sourceRef?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("docs")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title?.trim() || "Untitled",
      content: input.content ?? "",
      source_ref: input.sourceRef ?? null,
    })
    .select(docColumns)
    .single();

  if (error || !data) {
    throw error ?? new Error("Dokumen belum bisa dibuat.");
  }

  return mapDocRow(data as DocRow);
}

export async function updateDoc(
  supabase: SupabaseClient,
  id: string,
  patch: { title?: string; content?: string },
) {
  const update: Record<string, string> = {};

  if (typeof patch.title === "string") {
    update.title = patch.title.trim() || "Untitled";
  }

  if (typeof patch.content === "string") {
    update.content = patch.content;
  }

  const { data, error } = await supabase
    .from("docs")
    .update(update)
    .eq("id", id)
    .select(docColumns)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDocRow(data as DocRow);
}

export async function deleteDoc(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("docs")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

export async function loadConversationMessagesForGenerate(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageContextRow[])
    .filter((row) => row.content.trim())
    .map((row) => ({
      role: row.role === "assistant" ? "ai" : "user",
      text: row.content,
    }));
}

// --- Browser-side fetch wrappers (used by hooks/useDocs.ts) ---

async function parseJsonOrThrow<T>(response: Response, fallbackMessage: string) {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export async function fetchDocs(workspaceId: string) {
  const response = await fetch(
    `/api/docs?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "GET", cache: "no-store" },
  );
  const data = await parseJsonOrThrow<{ docs: Doc[] }>(
    response,
    "Dokumen belum bisa dimuat.",
  );

  return data.docs ?? [];
}

export async function createDocRequest(input: {
  workspaceId: string;
  title?: string;
  content?: string;
  sourceRef?: string | null;
}) {
  const response = await fetch("/api/docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ doc: Doc }>(
    response,
    "Dokumen belum bisa dibuat.",
  );

  return data.doc;
}

export async function updateDocRequest(
  id: string,
  patch: { title?: string; content?: string },
) {
  const response = await fetch(`/api/docs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonOrThrow<{ doc: Doc }>(
    response,
    "Dokumen belum bisa disimpan.",
  );

  return data.doc;
}

export async function deleteDocRequest(id: string) {
  const response = await fetch(`/api/docs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseJsonOrThrow<{ ok: boolean }>(response, "Dokumen belum bisa dihapus.");
}

export async function generateDocFromChat(input: {
  workspaceId: string;
  conversationId: string;
}) {
  const response = await fetch("/api/docs/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ doc: Doc }>(
    response,
    "Dokumen belum bisa digenerate.",
  );

  return data.doc;
}

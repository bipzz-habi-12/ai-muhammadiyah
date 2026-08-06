import type { SupabaseClient } from "@supabase/supabase-js";
import { splitTextIntoKnowledgeChunks } from "@/lib/knowledge";
import { createEmbeddings } from "./embedding";
import { maxNoteTitleLength, normalizeNoteTitle, parseWikiLinks } from "./parse";

// Penulisan catatan "Otak Kedua".
//
// Semua tulisan lewat klien auth ber-RLS (BUKAN service role): policy
// "Users can create own notes" sudah memaksa user_id = auth.uid(), jadi
// kepemilikan dijamin database — pola sama seperti `app/api/skills/route.ts`.

export const maxNoteContentLength = 20_000;

export type NoteInput = {
  title: string;
  content: string;
  source?: "user" | "ai" | "logseq_import";
  workspaceId?: string | null;
  originConversationId?: string | null;
};

export type CoerceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function coerceNoteInput(body: unknown): CoerceResult<NoteInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body permintaan tidak valid." };
  }

  const raw = body as Record<string, unknown>;
  const title = normalizeNoteTitle(
    typeof raw.title === "string" ? raw.title : "",
  );
  const content = typeof raw.content === "string" ? raw.content.trim() : "";

  if (!title) {
    return { ok: false, error: "Judul catatan wajib diisi." };
  }

  if (title.length > maxNoteTitleLength) {
    return {
      ok: false,
      error: `Judul catatan maksimal ${maxNoteTitleLength} karakter.`,
    };
  }

  if (!content) {
    return { ok: false, error: "Isi catatan wajib diisi." };
  }

  if (content.length > maxNoteContentLength) {
    return {
      ok: false,
      error: `Isi catatan maksimal ${maxNoteContentLength} karakter.`,
    };
  }

  const source =
    raw.source === "ai" || raw.source === "logseq_import" ? raw.source : "user";

  return {
    ok: true,
    value: {
      title,
      content,
      source,
      workspaceId: typeof raw.workspaceId === "string" ? raw.workspaceId : null,
      originConversationId:
        typeof raw.originConversationId === "string"
          ? raw.originConversationId
          : null,
    },
  };
}

/**
 * Menyimpan catatan berdasarkan JUDUL: perbarui kalau sudah ada, buat kalau
 * belum. Dipakai impor Logseq supaya mengimpor graf yang sama dua kali tidak
 * menghasilkan duplikat — judul memang identitas halaman di Logseq, dan DB
 * kita menegakkan itu lewat `notes_user_title_key`.
 */
export async function upsertNoteByTitle(
  supabase: SupabaseClient,
  userId: string,
  input: NoteInput,
): Promise<{ id: string; created: boolean }> {
  const { data: existing, error: lookupError } = await supabase
    .from("notes")
    .select("id,title")
    .eq("user_id", userId);

  if (lookupError) {
    throw lookupError;
  }

  const key = input.title.trim().toLowerCase();
  const match = ((existing ?? []) as { id: string; title: string }[]).find(
    (note) => note.title.trim().toLowerCase() === key,
  );

  if (match) {
    const { error } = await supabase
      .from("notes")
      .update({ content: input.content, source: input.source ?? "user" })
      .eq("id", match.id);

    if (error) {
      throw error;
    }

    return { id: match.id, created: false };
  }

  const { data: inserted, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: input.title,
      content: input.content,
      source: input.source ?? "user",
      workspace_id: input.workspaceId ?? null,
      origin_conversation_id: input.originConversationId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return { id: inserted.id, created: true };
}

/**
 * Memotong + meng-embed isi catatan, lalu menulis ulang seluruh chunk-nya.
 *
 * Embedding sengaja dijalankan di sini (jalur tulis), BUKAN di jalur streaming
 * chat, supaya `maxDuration = 60` pada `/api/chat` tidak terbebani.
 *
 * Kalau embedding gagal atau OPENAI_API_KEY_EMBED kosong, chunk tetap ditulis
 * tanpa vektor — catatan masih tercari lewat full-text (degradasi anggun).
 */
export async function syncNoteChunks(
  supabase: SupabaseClient,
  noteId: string,
  userId: string,
  content: string,
) {
  const chunks = splitTextIntoKnowledgeChunks(content);

  if (!chunks.length) {
    return;
  }

  const embeddings = await createEmbeddings(chunks).catch((error) => {
    console.error("Note embedding failed:", error);
    return null;
  });

  const { error: deleteError } = await supabase
    .from("note_chunks")
    .delete()
    .eq("note_id", noteId);

  if (deleteError) {
    throw deleteError;
  }

  const { error } = await supabase.from("note_chunks").insert(
    chunks.map((chunkContent, index) => ({
      note_id: noteId,
      user_id: userId,
      chunk_order: index,
      content: chunkContent,
      embedding: embeddings?.[index] ?? null,
    })),
  );

  if (error) {
    throw error;
  }
}

/**
 * Menulis ulang [[wikilink]] milik satu catatan.
 *
 * `target_note_id` diisi kalau catatan tujuannya sudah ada. Kalau belum, baris
 * tetap ditulis dengan target null — trigger `notes_resolve_links` yang akan
 * menyambungkannya saat catatan bertajuk itu dibuat nanti.
 */
export async function syncNoteLinks(
  supabase: SupabaseClient,
  noteId: string,
  userId: string,
  content: string,
) {
  const { error: deleteError } = await supabase
    .from("note_links")
    .delete()
    .eq("source_note_id", noteId);

  if (deleteError) {
    throw deleteError;
  }

  const linkedTitles = parseWikiLinks(content);

  if (!linkedTitles.length) {
    return;
  }

  const { data: existingNotes, error: lookupError } = await supabase
    .from("notes")
    .select("id,title")
    .eq("user_id", userId);

  if (lookupError) {
    throw lookupError;
  }

  const idByTitleKey = new Map(
    ((existingNotes ?? []) as { id: string; title: string }[]).map((note) => [
      note.title.trim().toLowerCase(),
      note.id,
    ]),
  );

  const { error } = await supabase.from("note_links").insert(
    linkedTitles.map((targetTitle) => ({
      source_note_id: noteId,
      user_id: userId,
      target_title: targetTitle,
      target_note_id: idByTitleKey.get(targetTitle.trim().toLowerCase()) ?? null,
    })),
  );

  if (error) {
    throw error;
  }
}

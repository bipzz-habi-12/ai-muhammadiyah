import type { SupabaseClient } from "@supabase/supabase-js";
import { createEmbedding, isEmbeddingConfigured } from "./embedding";

// Retrieval "Otak Kedua": catatan pribadi pengguna disuntikkan ke tiap jawaban.
// Polanya sengaja meniru `retrieveKnowledgeChunks` / `createKnowledgePromptContext`
// di `lib/knowledge.ts` supaya jalur konteksnya seragam — bedanya:
//
//   * knowledge_chunks = korpus BERSAMA (admin, publik, digerbangi allowlist
//     kata kunci `isKnowledgeQuestion`).
//   * note_chunks      = catatan PRIBADI pengguna. TIDAK boleh digerbangi
//     allowlist kata kunci: pengguna menulis tentang apa saja, dan daftar 26
//     kata Muhammadiyah/pendidikan itu akan membuang hampir semua pertanyaan
//     yang relevan.

export type NoteChunk = {
  noteId: string;
  noteTitle: string;
  chunkOrder: number;
  content: string;
};

type NoteSearchRow = {
  note_id: string;
  note_title: string;
  chunk_order: number;
  content: string;
};

const maxRetrievedNoteChunks = 4;
const maxNoteChunkPromptCharacters = 900;
const maxNoteContextCharacters = 4_000;

/**
 * Pesan sangat pendek ("ok", "lanjut", "iya") tidak layak dibayari satu
 * panggilan embedding — dan hampir tidak pernah menghasilkan catatan relevan.
 * Ini satu-satunya gerbang; selain ini, retrieval jalan tiap giliran.
 */
const minQueryCharacters = 15;

export function shouldSearchNotes(question: string) {
  return question.trim().length >= minQueryCharacters;
}

export async function retrieveRelevantNotes(
  supabase: SupabaseClient,
  question: string,
  limit = maxRetrievedNoteChunks,
  // Lihat catatan yang sama di retrieveKnowledgeChunks: saat dipanggil sebagai
  // tool, kuerinya adalah kata kunci rumusan model (sering pendek, mis.
  // "fotosintesis") sehingga ambang 15 karakter akan salah membuangnya.
  forceSearch = false,
): Promise<NoteChunk[]> {
  if (!forceSearch && !shouldSearchNotes(question)) {
    return [];
  }

  // Kegagalan embedding tidak boleh mematikan pencarian — `search_notes`
  // menerima p_embedding null dan jatuh ke full-text.
  const embedding = isEmbeddingConfigured()
    ? await createEmbedding(question).catch((error) => {
        console.error("Note query embedding failed:", error);
        return null;
      })
    : null;

  const { data, error } = await supabase.rpc("search_notes", {
    p_query: question,
    p_embedding: embedding,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  const seenChunks = new Set<string>();

  return ((data ?? []) as NoteSearchRow[])
    .filter((row) => {
      const key = `${row.note_id}:${row.chunk_order}`;

      if (seenChunks.has(key)) {
        return false;
      }

      seenChunks.add(key);
      return true;
    })
    .slice(0, Math.max(1, Math.min(limit, maxRetrievedNoteChunks)))
    .map((row) => ({
      noteId: row.note_id,
      noteTitle: row.note_title,
      chunkOrder: row.chunk_order,
      content:
        row.content.length > maxNoteChunkPromptCharacters
          ? `${row.content.slice(0, maxNoteChunkPromptCharacters).trim()}...`
          : row.content,
    }));
}

export function createSecondBrainPromptContext(chunks: NoteChunk[]) {
  if (!chunks.length) {
    return "";
  }

  const context = chunks
    .map((chunk) =>
      [`[Catatan: ${chunk.noteTitle}]`, chunk.content].join("\n"),
    )
    .join("\n\n---\n\n")
    .slice(0, maxNoteContextCharacters);

  return [
    "SECOND BRAIN (CATATAN PRIBADI PENGGUNA):",
    "Ini catatan yang ditulis atau disetujui oleh pengguna sendiri. Pakai untuk menyambung jawaban dengan apa yang sudah mereka ketahui, pelajari, atau putuskan sebelumnya.",
    "Sebut judul catatannya saat kamu memakainya, contoh: (dari catatan: Ushul Fiqh Dasar).",
    "Catatan ini milik pengguna dan bisa saja sudah usang atau keliru — kalau isinya bertentangan dengan fakta yang kamu yakini, sampaikan perbedaannya dengan sopan, jangan diam-diam mengikutinya.",
    "Jangan sebut-sebut bagian ini kalau tidak ada yang relevan dengan pertanyaannya.",
    "",
    context,
  ].join("\n");
}

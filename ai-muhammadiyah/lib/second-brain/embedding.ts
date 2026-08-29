// SERVER-ONLY. Modul ini membaca OPENAI_API_KEY_EMBED — jangan pernah diimpor
// dari komponen client (pola sama seperti `lib/subscriptions/stripe.ts`).
//
// Repo ini tidak memakai SDK OpenAI; semua provider dipanggil lewat `fetch`
// mentah di `lib/ai/chat.ts`. Modul ini mengikuti gaya yang sama supaya tidak
// menambah dependensi hanya untuk embedding.

const apiKey = process.env.OPENAI_API_KEY_EMBED?.trim();
const embedModel =
  process.env.OPENAI_EMBED_MODEL?.trim() || "text-embedding-3-small";

/**
 * Dimensi HARUS cocok dengan `vector(1536)` di migrasi
 * 20260806000000_second_brain_notes.sql. Mengganti model embedding ke dimensi
 * lain berarti mengubah kolom itu DAN meng-embed ulang semua catatan yang ada —
 * bukan sekadar ganti env.
 */
export const embeddingDimensions = 1536;

const embeddingsEndpoint = "https://api.openai.com/v1/embeddings";
const requestTimeoutMs = 15_000;

/**
 * Batas aman per potongan. `splitTextIntoKnowledgeChunks` sudah memotong di
 * ~1200 karakter, jadi ini hanya jaring pengaman untuk teks yang datang dari
 * jalur lain (mis. impor Logseq nanti).
 */
const maxEmbedCharacters = 8_000;

/**
 * Kalau key belum diisi, fitur otak kedua TIDAK mati — pencarian jatuh ke
 * full-text saja (`search_notes` menerima p_embedding null). Ini konvensi
 * degradasi anggun yang sudah dipakai untuk Stripe & provider AI.
 */
export function isEmbeddingConfigured() {
  return Boolean(apiKey);
}

function normalizeForEmbedding(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxEmbedCharacters);
}

/**
 * Meng-embed beberapa teks sekaligus. Mengembalikan `null` (bukan melempar)
 * saat key kosong supaya pemanggil bisa lanjut tanpa embedding.
 *
 * PENTING: hasilnya selalu sepanjang `texts` dan sejajar indeksnya. Teks yang
 * jadi string kosong setelah normalisasi tidak ikut dikirim ke API, tapi
 * posisinya diisi `null` — bukan dibuang. Pemanggil seperti `syncNoteChunks`
 * memetakan hasil ini dengan indeks potongan aslinya, jadi menggeser posisi
 * berarti menyimpan vektor milik potongan lain tanpa satu pun error.
 */
export async function createEmbeddings(
  texts: string[],
): Promise<(number[] | null)[] | null> {
  if (!apiKey) {
    return null;
  }

  // `sourceIndexes[i]` = posisi asli di `texts` untuk `input[i]`.
  const sourceIndexes: number[] = [];
  const input: string[] = [];

  texts.forEach((text, index) => {
    const normalized = normalizeForEmbedding(text);

    if (normalized) {
      sourceIndexes.push(index);
      input.push(normalized);
    }
  });

  if (!input.length) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(embeddingsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: embedModel,
        input,
        dimensions: embeddingDimensions,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Embedding request failed (${response.status}): ${detail.slice(0, 200)}`,
      );
    }

    const payload = (await response.json()) as {
      data?: { embedding?: number[]; index?: number }[];
    };
    const rows = payload.data ?? [];

    if (rows.length !== input.length) {
      throw new Error(
        `Embedding count mismatch: expected ${input.length}, got ${rows.length}`,
      );
    }

    // Urutan balasan tidak dijamin — pakai `index` kalau ada. Diisi `null`
    // dulu supaya lubang array tidak lolos dari `every` di bawah.
    const ordered: (number[] | null)[] = new Array(input.length).fill(null);

    rows.forEach((row, position) => {
      const target = typeof row.index === "number" ? row.index : position;

      if (row.embedding?.length === embeddingDimensions) {
        ordered[target] = row.embedding;
      }
    });

    if (!ordered.every(Boolean)) {
      return null;
    }

    // Kembalikan ke ruang indeks `texts`; posisi yang dilewati tetap null.
    const aligned: (number[] | null)[] = new Array(texts.length).fill(null);

    sourceIndexes.forEach((sourceIndex, position) => {
      aligned[sourceIndex] = ordered[position];
    });

    return aligned;
  } finally {
    clearTimeout(timeout);
  }
}

/** Meng-embed satu teks (dipakai untuk query pencarian). */
export async function createEmbedding(text: string) {
  const embeddings = await createEmbeddings([text]);

  return embeddings?.[0] ?? null;
}

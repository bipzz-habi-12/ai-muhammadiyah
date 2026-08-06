// Protokol sentinel untuk USULAN catatan, meniru `parseArtifactBlocks` di
// `lib/artifacts.ts`.
//
// Beda penting dari artifacts: artifact langsung disimpan setelah pesan selesai,
// sedangkan catatan TIDAK. Hasil parse di sini hanya jadi usulan yang menunggu
// klik pengguna (aturan Langkah 40 A4: pasca-streaming, inline, bisa diabaikan).

export type NoteDraft = {
  title: string;
  content: string;
  /** Judul-judul [[wikilink]] yang disebut di dalam isi catatan. */
  linkedTitles: string[];
};

const noteOpenMarkerPrefix = "[[AI_MU_NOTE:";
const noteCloseMarker = "[[/AI_MU_NOTE]]";

const noteBlockPattern =
  /\[\[AI_MU_NOTE:([^\]\n]{1,240})\]\][ \t]*\r?\n?([\s\S]*?)\[\[\/AI_MU_NOTE\]\]/g;
const noteOpenPattern = /\[\[AI_MU_NOTE:([^\]\n]{1,240})\]\][ \t]*\r?\n?/g;

/**
 * [[wikilink]] ala Logseq. Sengaja menolak yang diawali `AI_MU_` supaya
 * penanda sentinel tidak ikut terbaca sebagai tautan.
 */
const wikiLinkPattern = /\[\[(?!\/|AI_MU_)([^\]\n]{1,240})\]\]/g;

export const maxNoteTitleLength = 240;

export function normalizeNoteTitle(rawTitle: string) {
  return rawTitle.trim().slice(0, maxNoteTitleLength);
}

/** Kunci pencocokan judul — harus cocok dengan `lower(btrim(title))` di DB. */
export function noteTitleKey(title: string) {
  return title.trim().toLowerCase();
}

export function parseWikiLinks(text: string) {
  const titles = new Set<string>();

  for (const match of text.matchAll(wikiLinkPattern)) {
    const title = normalizeNoteTitle(match[1]);

    if (title) {
      titles.add(title);
    }
  }

  return [...titles];
}

/**
 * Isi minimum sebuah blok yang tidak tertutup supaya layak dipulihkan. Menjaga
 * penanda buka yang baru separuh ter-stream tidak berubah jadi catatan kosong.
 */
const minRecoverableNoteLength = 40;

/**
 * Mencari blok terakhir yang penanda penutupnya tidak pernah datang.
 *
 * Ini nyata, bukan pengamanan teoretis: uji langsung ke provider (Langkah 40a)
 * menunjukkan model SESEKALI lupa menutup blok meski jawabannya utuh dan jauh
 * dari plafon token. Tanpa pemulihan ini, giliran seperti itu kehilangan chip
 * usulannya. Aman karena blok catatan selalu diletakkan di UJUNG balasan, jadi
 * sisa teks setelah penanda buka memang isi catatannya.
 */
function findUnterminatedNoteBlock(text: string) {
  const openMatches = [...text.matchAll(noteOpenPattern)];
  const lastOpen = openMatches[openMatches.length - 1];

  if (!lastOpen || lastOpen.index === undefined) {
    return null;
  }

  const bodyStart = lastOpen.index + lastOpen[0].length;

  if (text.indexOf(noteCloseMarker, bodyStart) !== -1) {
    return null;
  }

  // Penutup yang baru separuh ter-stream ("[[/AI_MU_NO") ikut dibuang.
  const content = text.slice(bodyStart).replace(/\[\[\/?[A-Z_]*$/, "").trim();

  if (content.length < minRecoverableNoteLength) {
    return null;
  }

  return { title: lastOpen[1], content };
}

export function parseNoteBlocks(text: string): NoteDraft[] {
  const drafts: NoteDraft[] = [];
  const seenTitles = new Set<string>();

  const addDraft = (rawTitle: string, rawContent: string) => {
    const title = normalizeNoteTitle(rawTitle);
    const content = rawContent.trim();

    if (!title || !content) {
      return;
    }

    // Judul catatan unik per pengguna di DB (`notes_user_title_key`), jadi
    // usulan kembar dalam satu balasan dibuang lebih awal daripada membiarkan
    // insert-nya gagal.
    const key = noteTitleKey(title);

    if (seenTitles.has(key)) {
      return;
    }

    seenTitles.add(key);
    drafts.push({ title, content, linkedTitles: parseWikiLinks(content) });
  };

  for (const match of text.matchAll(noteBlockPattern)) {
    addDraft(match[1], match[2]);
  }

  const unterminated = findUnterminatedNoteBlock(text);

  if (unterminated) {
    addDraft(unterminated.title, unterminated.content);
  }

  return drafts;
}

/**
 * Membersihkan penanda dari teks pesan yang ditampilkan.
 *
 * Berbeda dari artifacts yang menyisakan baris rujukan, blok catatan dihapus
 * SELURUHNYA: isinya sudah tampil di chip usulan, dan menampilkannya dua kali
 * membuat jawaban terasa berisik. Penanda yang masih setengah ter-stream di
 * ekor juga disembunyikan supaya tidak berkedip.
 */
export function formatNoteTextForDisplay(text: string) {
  let displayText = text.replace(noteBlockPattern, "");

  // Setelah blok lengkap dibuang, penanda buka yang tersisa berarti blok itu
  // belum tertutup — entah masih di-stream, entah model lupa menutupnya.
  // Dipotong sampai akhir, BUKAN sekadar dihapus penandanya: kalau hanya
  // penandanya yang dihapus, isi catatan bocor mentah ke badan jawaban.
  const openIndex = displayText.indexOf(noteOpenMarkerPrefix);

  if (openIndex !== -1) {
    displayText = displayText.slice(0, openIndex);
  }

  const lastMarkerStart = displayText.lastIndexOf("[[");

  if (lastMarkerStart !== -1) {
    const tail = displayText.slice(lastMarkerStart);
    const isPartialMarker =
      !tail.includes("]]") &&
      (noteOpenMarkerPrefix.startsWith(tail) ||
        tail.startsWith(noteOpenMarkerPrefix) ||
        noteCloseMarker.startsWith(tail));

    if (isPartialMarker) {
      displayText = displayText.slice(0, lastMarkerStart).trimEnd();
    }
  }

  return displayText.replace(/\n{3,}/g, "\n\n").trim();
}

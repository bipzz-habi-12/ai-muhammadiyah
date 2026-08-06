import { normalizeNoteTitle } from "./parse";

// Jembatan format Logseq (Langkah 40 Tahap B).
//
// Logseq menyimpan tiap halaman sebagai satu berkas markdown di folder
// `pages/`, isinya berupa outline blok berbutir. Modul ini menerjemahkan
// dua arah antara bentuk itu dan `notes.content` kita yang berupa markdown
// biasa.
//
// Batas yang diakui jujur — hal-hal berikut TIDAK diterjemahkan dan sengaja
// dibiarkan apa adanya sebagai teks:
//   * `((block-ref))` — kita tidak punya identitas per-blok, hanya per-catatan.
//   * `{{embed ...}}`, `{{query ...}}`, dan makro lain.
//   * Berkas `journals/` diperlakukan sama seperti halaman biasa.
// `[[wikilink]]` dan `#tag` dipertahankan utuh karena itulah yang membuat
// grafnya hidup di kedua sisi.

/**
 * Properti halaman Logseq: `key:: value`. Hanya dibuang kalau berada di blok
 * paling atas berkas — `key:: value` di tengah catatan bisa jadi memang teks
 * yang ditulis pengguna.
 */
const propertyLinePattern = /^[ \t]*[A-Za-z0-9_-]+:: ?.*$/;

const bulletPattern = /^([ \t]*)[-*+] +(.*)$/;

/**
 * Logseq menyandikan `/` pada nama namespace agar aman jadi nama berkas.
 * Versi lama memakai `___`, versi baru memakai persen-encoding (`%2F`).
 * Impor menerima keduanya; ekspor memakai `___` karena paling luas didukung.
 */
export function logseqFilenameToTitle(fileName: string) {
  const withoutExtension = fileName
    .replace(/\.md$/i, "")
    .replace(/^.*[/\\]/, "");

  let title = withoutExtension.replace(/___/g, "/");

  try {
    title = decodeURIComponent(title);
  } catch {
    // Nama berkas dengan tanda `%` yang bukan persen-encoding sah — biarkan.
  }

  return normalizeNoteTitle(title);
}

export function titleToLogseqFilename(title: string) {
  const safe = title
    .trim()
    .replace(/\//g, "___")
    // Karakter yang terlarang pada nama berkas Windows maupun POSIX.
    .replace(/[<>:"\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 200);

  return `${safe || "Untitled"}.md`;
}

/**
 * Outline Logseq -> markdown biasa.
 *
 * Blok tingkat atas menjadi paragraf; blok bersarang tetap jadi daftar
 * bertingkat supaya strukturnya tidak hilang.
 */
export function logseqToMarkdown(raw: string) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inLeadingProperties = true;

  for (const line of lines) {
    if (!line.trim()) {
      inLeadingProperties = false;
      output.push("");
      continue;
    }

    const bullet = line.match(bulletPattern);
    const indent = bullet ? bullet[1].replace(/\t/g, "  ").length : 0;
    const content = bullet ? bullet[2] : line.trim();

    // Properti halaman hanya dibuang selama masih di bagian paling atas.
    if (inLeadingProperties && propertyLinePattern.test(content)) {
      continue;
    }

    inLeadingProperties = false;

    if (!bullet) {
      output.push(content);
      continue;
    }

    if (indent === 0) {
      output.push(content);
      continue;
    }

    // Blok bersarang tetap berupa daftar, kedalamannya dipertahankan.
    const depth = Math.max(1, Math.round(indent / 2));
    output.push(`${"  ".repeat(depth - 1)}- ${content}`);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Markdown biasa -> outline Logseq.
 *
 * Tiap baris tingkat atas jadi satu blok `- `; daftar yang sudah ada
 * dipertahankan kedalamannya. Blok kode dilewatkan utuh — memberi butir pada
 * tiap baris kode akan merusak isinya.
 */
export function markdownToLogseq(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      // Pagar pembuka mendapat butir; sisa blok kode mengalir apa adanya.
      output.push(inCodeFence ? line : `- ${line.trim()}`);
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      output.push(line);
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const bullet = line.match(bulletPattern);

    if (bullet) {
      const indent = bullet[1].replace(/\t/g, "  ").length;
      output.push(`${"\t".repeat(Math.round(indent / 2) + 1)}- ${bullet[2]}`);
      continue;
    }

    output.push(`- ${line.trim()}`);
  }

  return output.join("\n");
}

/** Berkas markdown Logseq lengkap untuk satu catatan. */
export function noteToLogseqFile(note: { title: string; content: string }) {
  return {
    fileName: titleToLogseqFilename(note.title),
    // `title::` membuat Logseq memakai judul aslinya walaupun nama berkasnya
    // sudah disanitasi.
    body: `title:: ${note.title}\n\n${markdownToLogseq(note.content)}\n`,
  };
}

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
 *
 * BLOK KODE dilewatkan apa adanya sampai pagar penutupnya. Tanpa pengecualian
 * ini tiap baris kode ikut kena `.trim()` dan seluruh indentasi di dalam kode
 * hilang — kode Python hasil impor bahkan jadi tidak sah. `continuation`
 * dibiarkan kosong untuk pagar yang tidak berbutir, supaya berkas hasil ekspor
 * versi LAMA (badan kodenya di kolom 0) tetap terbaca.
 */
export function logseqToMarkdown(raw: string) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let inLeadingProperties = true;
  let codeBlock: {
    continuation: string;
    markdown: string;
    resolved: boolean;
  } | null = null;

  for (const line of lines) {
    if (codeBlock) {
      // Prefiks lanjutan dipastikan dari baris PERTAMA badan kode, bukan
      // diasumsikan. Berkas ekspor versi lama menaruh badan kodenya di kolom 0;
      // kalau prefiksnya tetap dipotong, baris kode yang kebetulan menjorok
      // dua spasi akan kehilangan indentasinya dan kode Python hasil impor
      // jadi tidak sah.
      if (!codeBlock.resolved) {
        if (!line.startsWith(codeBlock.continuation)) {
          codeBlock.continuation = "";
        }

        codeBlock.resolved = true;
      }

      const body =
        codeBlock.continuation && line.startsWith(codeBlock.continuation)
          ? line.slice(codeBlock.continuation.length)
          : line;

      output.push(body.trim() ? `${codeBlock.markdown}${body}` : "");

      if (body.trimStart().startsWith("```")) {
        codeBlock = null;
      }

      continue;
    }

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

    if (content.startsWith("```")) {
      const depth = indent > 0 ? Math.max(1, Math.round(indent / 2)) : 0;
      const markdown = depth > 0 ? "  ".repeat(depth - 1) : "";

      output.push(`${markdown}${content}`);
      codeBlock = {
        continuation: bullet ? `${bullet[1]}  ` : "",
        markdown,
        resolved: false,
      };
      continue;
    }

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
 * dipertahankan kedalamannya.
 *
 * BLOK KODE: pagar pembukanya mendapat butir, dan seluruh baris sesudahnya —
 * badan kode DAN pagar penutupnya — diberi indentasi sejajar dengan isi butir
 * itu (dua spasi setelah "- "). Ini bukan kosmetik: Logseq menyatukan baris
 * lanjutan ke bloknya lewat indentasi, jadi versi sebelumnya yang membiarkan
 * badan kode jatuh ke kolom 0 memecah blok kodenya begitu berkasnya dibuka di
 * Logseq. Indentasi ASLI di dalam kode dipertahankan dengan memotong dulu
 * indentasi pagar pembukanya, supaya tidak terhitung dua kali.
 */
export function markdownToLogseq(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let codeBlock: { continuation: string; base: string } | null = null;

  for (const line of lines) {
    if (/^[ \t]*```/.test(line)) {
      if (codeBlock) {
        output.push(`${codeBlock.continuation}${line.trim()}`);
        codeBlock = null;
        continue;
      }

      const base = line.match(/^[ \t]*/)?.[0] ?? "";
      const depth = Math.round(base.replace(/\t/g, "  ").length / 2);
      const bulletIndent = depth > 0 ? "\t".repeat(depth + 1) : "";

      output.push(`${bulletIndent}- ${line.trim()}`);
      codeBlock = { continuation: `${bulletIndent}  `, base };
      continue;
    }

    if (codeBlock) {
      const body = line.startsWith(codeBlock.base)
        ? line.slice(codeBlock.base.length)
        : line;

      // Baris kosong pun tetap diberi indentasi lanjutan; baris kosong di
      // kolom 0 akan menutup blok itu lebih awal di Logseq.
      output.push(`${codeBlock.continuation}${body}`);
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

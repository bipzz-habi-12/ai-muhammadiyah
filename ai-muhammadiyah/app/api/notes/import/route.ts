import { NextResponse } from "next/server";
import {
  logseqFilenameToTitle,
  logseqToMarkdown,
} from "@/lib/second-brain/logseq";
import { normalizeNoteTitle } from "@/lib/second-brain/parse";
import {
  maxNoteContentLength,
  syncNoteChunks,
  syncNoteLinks,
  upsertNoteByTitle,
} from "@/lib/second-brain/store";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// POST /api/notes/import -> impor berkas markdown dari graf Logseq.
//
// Pengguna memilih berkas dari folder `pages/` graf mereka. Impor bersifat
// upsert-berdasarkan-judul, jadi mengimpor graf yang sama dua kali memperbarui
// catatan yang ada alih-alih menggandakannya.

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Batas per permintaan. Embedding dilakukan serentak-berurutan per catatan,
 * jadi jumlah berkas dibatasi agar muat dalam `maxDuration`. Klien mengirim
 * berkas secara bergelombang, bukan sekali kirim semuanya.
 */
const maxFilesPerRequest = 40;
const maxFileBytes = 1024 * 1024;
const maxTotalBytes = 8 * 1024 * 1024;

/** Properti `title::` Logseq lebih dipercaya daripada nama berkas. */
const titlePropertyPattern = /^[ \t]*title:: ?(.+)$/m;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Body permintaan tidak valid." },
        { status: 400 },
      );
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { error: "Tidak ada berkas yang dikirim." },
        { status: 400 },
      );
    }

    if (files.length > maxFilesPerRequest) {
      return NextResponse.json(
        {
          error: `Maksimal ${maxFilesPerRequest} berkas per pengiriman.`,
        },
        { status: 400 },
      );
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (totalBytes > maxTotalBytes) {
      return NextResponse.json(
        { error: "Total berkas melebihi 8MB per pengiriman." },
        { status: 400 },
      );
    }

    let created = 0;
    let updated = 0;
    let indexed = 0;
    const skipped: string[] = [];

    for (const file of files) {
      if (!/\.md$/i.test(file.name)) {
        skipped.push(`${file.name} (bukan .md)`);
        continue;
      }

      if (file.size > maxFileBytes) {
        skipped.push(`${file.name} (lebih dari 1MB)`);
        continue;
      }

      const raw = await file.text();
      const titleProperty = raw.match(titlePropertyPattern)?.[1];
      const title = normalizeNoteTitle(
        titleProperty?.trim() || logseqFilenameToTitle(file.name),
      );
      const content = logseqToMarkdown(raw).slice(0, maxNoteContentLength);

      if (!title || !content) {
        skipped.push(`${file.name} (kosong)`);
        continue;
      }

      try {
        const result = await upsertNoteByTitle(supabase, user.id, {
          title,
          content,
          source: "logseq_import",
        });

        if (result.created) {
          created += 1;
        } else {
          updated += 1;
        }

        // Kegagalan indexing tidak membatalkan impor: catatannya sudah
        // tersimpan dan tetap tercari lewat full-text.
        try {
          await syncNoteChunks(supabase, result.id, user.id, content);
          await syncNoteLinks(supabase, result.id, user.id, content);
          indexed += 1;
        } catch (indexError) {
          console.error(`Indexing gagal untuk ${file.name}:`, indexError);
        }
      } catch (noteError) {
        console.error(`Impor gagal untuk ${file.name}:`, noteError);
        skipped.push(`${file.name} (gagal disimpan)`);
      }
    }

    return NextResponse.json({ created, updated, indexed, skipped });
  } catch (error) {
    console.error("Import notes failed:", error);
    return NextResponse.json(
      { error: "Gagal mengimpor catatan." },
      { status: 500 },
    );
  }
}

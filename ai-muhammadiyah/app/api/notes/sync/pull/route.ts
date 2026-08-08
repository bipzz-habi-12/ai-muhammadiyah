import { NextResponse } from "next/server";
import {
  noteToLogseqFile,
  titleToLogseqFilename,
} from "@/lib/second-brain/logseq";
import {
  authenticateSyncDevice,
  consumeSyncQuota,
  decodeSyncCursor,
  encodeSyncCursor,
  maxSyncPullItems,
  rateLimitResponseBody,
} from "@/lib/second-brain/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/notes/sync/pull?cursor=<kursor> -> perubahan sejak kursor.
//
// Dipanggil AGEN LOKAL, bukan browser. Autentikasi lewat token perangkat
// (header Authorization), karena agen tidak punya sesi Supabase.
//
// Mengembalikan catatan yang berubah DAN nisan penghapusan. Tanpa nisan,
// menghapus halaman di satu sisi tidak akan pernah menyebar ke sisi lain dan
// tarikan berikutnya menghidupkannya kembali.

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = createSupabaseServerClient();
    const device = await authenticateSyncDevice(admin, request);

    if (!device) {
      return NextResponse.json(
        { error: "Token perangkat tidak sah." },
        { status: 401 },
      );
    }

    // Tarikan tidak memicu embedding, jadi hanya menghitung permintaan.
    const quota = await consumeSyncQuota(admin, device.userId, 0);

    if (!quota.allowed) {
      return NextResponse.json(rateLimitResponseBody(quota), {
        status: 429,
        headers: { "Retry-After": "3600" },
      });
    }

    const url = new URL(request.url);
    const cursor = decodeSyncCursor(url.searchParams.get("cursor"));
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit")) || 100, 1),
      maxSyncPullItems,
    );

    // `user_id` SELALU dari token, tidak pernah dari parameter permintaan.
    // Klien service role melewati RLS, jadi filter ini satu-satunya yang
    // memisahkan data antar-pengguna di jalur ini.
    let query = admin
      .from("notes")
      .select("id,title,content,source,updated_at")
      .eq("user_id", device.userId)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (cursor) {
      // Perbandingan baris (updated_at, id) — bukan sekadar `updated_at >` —
      // supaya catatan dengan stempel waktu identik tidak ada yang terlewat
      // saat batch terpotong tepat di antara keduanya.
      query = query.or(
        `updated_at.gt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.gt.${cursor.id})`,
      );
    }

    const { data: noteRows, error } = await query;

    if (error) {
      throw error;
    }

    const notes = (noteRows ?? []) as {
      id: string;
      title: string;
      content: string;
      source: string;
      updated_at: string;
    }[];

    // Nisan punya KURSOR SENDIRI, tidak menumpang kursor catatan.
    //
    // Kalau keduanya dijadikan satu, urutan ini menghapus data secara senyap:
    // daftar nisan terpotong batas, tapi kursor catatan sudah telanjur maju
    // melewatinya — sisa nisan itu tidak akan pernah terkirim lagi, dan
    // halaman yang sudah dihapus hidup kembali di mesin pengguna. Dua kursor
    // membuat masing-masing maju hanya sejauh yang benar-benar terkirim.
    const deletionCursor = url.searchParams.get("deletionCursor");
    let deletionsQuery = admin
      .from("note_deletions")
      .select("title,deleted_at")
      .eq("user_id", device.userId)
      .order("deleted_at", { ascending: true })
      .limit(limit);

    if (deletionCursor && !Number.isNaN(Date.parse(deletionCursor))) {
      deletionsQuery = deletionsQuery.gt("deleted_at", deletionCursor);
    } else if (!deletionCursor) {
      // Agen yang baru pertama kali menyambung tidak perlu tahu apa pun
      // tentang penghapusan di masa lalu.
      deletionsQuery = deletionsQuery.limit(0);
    }

    const { data: deletionRows } = await deletionsQuery;
    const deletions = (deletionRows ?? []) as {
      title: string;
      deleted_at: string;
    }[];
    const lastDeletion = deletions[deletions.length - 1];

    const last = notes[notes.length - 1];

    // Sudah dalam bentuk berkas Logseq siap tulis: agen tinggal menyimpannya
    // apa adanya, tanpa perlu tahu aturan formatnya sama sekali.
    return NextResponse.json({
      notes: notes.map((note) => {
        const file = noteToLogseqFile(note);

        return {
          id: note.id,
          title: note.title,
          fileName: file.fileName,
          body: file.body,
          updatedAt: note.updated_at,
        };
      }),
      deletions: deletions.map((row) => ({
        title: row.title,
        fileName: titleToLogseqFilename(row.title),
        deletedAt: row.deleted_at,
      })),
      // Kursor hanya maju kalau ada baris; kalau kosong, agen menyimpan
      // kursor lamanya dan tidak kehilangan posisi.
      cursor: last ? encodeSyncCursor(last.updated_at, last.id) : null,
      // Agen baru menerima garis dasar "sekarang" supaya penghapusan
      // BERIKUTNYA terjaring. Tanpa ini ia tidak akan pernah punya kursor
      // nisan dan penghapusan tidak pernah sampai kepadanya.
      deletionCursor:
        lastDeletion?.deleted_at ?? deletionCursor ?? new Date().toISOString(),
      hasMore: notes.length === limit || deletions.length === limit,
    });
  } catch (error) {
    console.error("Sync pull failed:", error);
    return NextResponse.json(
      { error: "Gagal menarik perubahan." },
      { status: 500 },
    );
  }
}

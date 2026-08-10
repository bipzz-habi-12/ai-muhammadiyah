import { NextResponse } from "next/server";
import {
  logseqFilenameToTitle,
  logseqToMarkdown,
  noteToLogseqFile,
} from "@/lib/second-brain/logseq";
import { normalizeNoteTitle } from "@/lib/second-brain/parse";
import {
  authenticateSyncDevice,
  consumeSyncQuota,
  maxSyncPushItems,
  rateLimitResponseBody,
  refundSyncNotes,
} from "@/lib/second-brain/sync";
import {
  maxNoteContentLength,
  syncNoteChunks,
  syncNoteLinks,
} from "@/lib/second-brain/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/notes/sync/push -> perubahan dari mesin lokal masuk ke server.
//
// Dipanggil AGEN LOKAL. Autentikasi lewat token perangkat.
//
// Body: { eventId, items: [{ title, content, deleted?, clientUpdatedAt }] }

export const runtime = "nodejs";
export const maxDuration = 60;

type PushItem = {
  /** Identitas yang dipakai AGEN. Konflik dilaporkan memakai ini, bukan judul,
   *  karena inilah yang dilihat pengguna di folder Logseq-nya. */
  fileName: string;
  title: string;
  content: string;
  deleted: boolean;
  clientUpdatedAt: number | null;
  /** Asal catatan, untuk badge di Library. Rute ini melayani dua klien:
   *  jembatan Logseq dan MCP server Hermes. Tanpa pembeda ini, catatan yang
   *  ditulis Hermes akan berlabel "IMPOR LOGSEQ" dan menyesatkan pengguna. */
  source: "ai" | "logseq_import";
};

/** Properti `title::` Logseq lebih dipercaya daripada nama berkas. */
const titlePropertyPattern = /^[ \t]*title:: ?(.+)$/m;

/**
 * Agen mengirim isi berkas MENTAH beserta nama berkasnya, bukan judul dan
 * markdown yang sudah jadi. Semua penerjemahan format tinggal di server
 * (`lib/second-brain/logseq.ts`) supaya tidak ada salinan kedua di skrip agen
 * yang lambat laun menyimpang dari aslinya.
 */
function coerceItems(raw: unknown): PushItem[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const items: PushItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const fileName = typeof record.fileName === "string" ? record.fileName : "";
    const rawBody = typeof record.raw === "string" ? record.raw : "";

    if (!fileName) {
      return null;
    }

    const title = normalizeNoteTitle(
      rawBody.match(titlePropertyPattern)?.[1]?.trim() ||
        logseqFilenameToTitle(fileName),
    );

    if (!title) {
      return null;
    }

    const parsedDate =
      typeof record.clientUpdatedAt === "string"
        ? Date.parse(record.clientUpdatedAt)
        : typeof record.clientUpdatedAt === "number"
          ? record.clientUpdatedAt
          : Number.NaN;

    items.push({
      fileName,
      title,
      content: logseqToMarkdown(rawBody).slice(0, maxNoteContentLength),
      deleted: record.deleted === true,
      clientUpdatedAt: Number.isNaN(parsedDate) ? null : parsedDate,
      // Bawaan tetap logseq_import supaya jembatan Logseq yang sudah ada
      // tidak berubah perilakunya.
      source: record.source === "ai" ? "ai" : "logseq_import",
    });
  }

  return items;
}

export async function POST(request: Request) {
  const admin = createSupabaseServerClient();
  const device = await authenticateSyncDevice(admin, request);

  if (!device) {
    return NextResponse.json(
      { error: "Token perangkat tidak sah." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body permintaan tidak valid." },
      { status: 400 },
    );
  }

  const eventId = (body as { eventId?: unknown })?.eventId;
  const items = coerceItems((body as { items?: unknown })?.items);

  if (typeof eventId !== "string" || eventId.length < 8 || eventId.length > 200) {
    return NextResponse.json(
      { error: "eventId wajib diisi (8-200 karakter)." },
      { status: 400 },
    );
  }

  if (!items) {
    return NextResponse.json(
      { error: "items tidak valid." },
      { status: 400 },
    );
  }

  if (items.length > maxSyncPushItems) {
    return NextResponse.json(
      { error: `Maksimal ${maxSyncPushItems} catatan per pengiriman.` },
      { status: 400 },
    );
  }

  // Idempotensi lebih dulu, meniru webhook Stripe (`billing_events`): insert
  // dulu dan perlakukan tabrakan 23505 sebagai "sudah pernah diproses".
  // Memeriksa dengan SELECT lebih dulu akan meninggalkan celah balapan antara
  // dua kiriman ulang yang datang bersamaan.
  const { error: eventError } = await admin.from("note_sync_events").insert({
    device_id: device.deviceId,
    event_id: eventId,
    user_id: device.userId,
  });

  if (eventError) {
    if ((eventError as { code?: string }).code === "23505") {
      return NextResponse.json({ duplicate: true, applied: 0, skipped: 0, deleted: 0 });
    }

    console.error("Sync event ledger failed:", eventError);
    return NextResponse.json(
      { error: "Gagal memproses pengiriman." },
      { status: 500 },
    );
  }

  // Kuota diperiksa SETELAH buku besar, supaya kiriman ulang yang duplikat
  // tidak ikut memakan jatah. Konsekuensinya, penolakan kuota WAJIB menghapus
  // lagi baris buku besarnya — kalau tidak, eventId itu terkunci selamanya dan
  // batch yang sama tidak akan pernah bisa dikirim ulang setelah kuotanya pulih.
  const notesInBatch = items.filter((item) => !item.deleted).length;
  const quota = await consumeSyncQuota(admin, device.userId, notesInBatch);

  if (!quota.allowed) {
    await admin
      .from("note_sync_events")
      .delete()
      .eq("device_id", device.deviceId)
      .eq("event_id", eventId);

    return NextResponse.json(rateLimitResponseBody(quota), {
      status: 429,
      headers: { "Retry-After": quota.reason === "notes" ? "3600" : "600" },
    });
  }

  try {
    const { data: existingRows, error: lookupError } = await admin
      .from("notes")
      .select("id,title,content,updated_at")
      .eq("user_id", device.userId);

    if (lookupError) {
      throw lookupError;
    }

    const existingByKey = new Map(
      ((existingRows ?? []) as {
        id: string;
        title: string;
        content: string;
        updated_at: string;
      }[]).map((note) => [note.title.trim().toLowerCase(), note]),
    );

    let applied = 0;
    let skipped = 0;
    let deleted = 0;
    const conflicts: string[] = [];

    // Bentuk kanonik tiap catatan yang diterima dikembalikan ke agen.
    //
    // Tanpa ini agen tidak punya cara membedakan "server berubah" dari "gema
    // kiriman saya sendiri yang sudah dinormalkan server", sehingga suntingan
    // lokal berikutnya salah dilaporkan sebagai konflik. Dengan mengembalikan
    // bentuk kanoniknya, kedua sisi langsung sepakat pada isi yang sama persis.
    const canonical: { fileName: string; body: string }[] = [];
    const recordCanonical = (item: PushItem) => {
      const file = noteToLogseqFile({ title: item.title, content: item.content });
      // Dikunci pada nama berkas milik AGEN, bukan hasil sanitasi ulang:
      // agen memetakan balasan ini ke berkas di disknya.
      canonical.push({ fileName: item.fileName, body: file.body });
    };

    for (const item of items) {
      const key = item.title.trim().toLowerCase();
      const existing = existingByKey.get(key);

      if (item.deleted) {
        if (existing) {
          // Trigger `notes_record_deletion` yang mencatat nisannya.
          await admin.from("notes").delete().eq("id", existing.id);
          existingByKey.delete(key);
          deleted += 1;
        }

        continue;
      }

      if (!item.content.trim()) {
        skipped += 1;
        continue;
      }

      if (existing) {
        if (existing.content === item.content) {
          skipped += 1;
          continue;
        }

        // Last-write-wins berdasarkan waktu. Kalau versi server lebih baru
        // daripada saat berkas lokal disentuh, kiriman ini adalah perubahan
        // basi — server menang dan konfliknya DILAPORKAN, bukan ditelan diam
        // diam, supaya pengguna tahu ada tulisannya yang tidak jadi terkirim.
        const serverTime = Date.parse(existing.updated_at);

        if (
          item.clientUpdatedAt !== null &&
          Number.isFinite(serverTime) &&
          serverTime > item.clientUpdatedAt
        ) {
          conflicts.push(item.fileName);
          skipped += 1;
          continue;
        }

        const { error } = await admin
          .from("notes")
          .update({ content: item.content })
          .eq("id", existing.id);

        if (error) {
          throw error;
        }

        await syncNoteChunks(admin, existing.id, device.userId, item.content);
        await syncNoteLinks(admin, existing.id, device.userId, item.content);
        recordCanonical(item);
        applied += 1;
        continue;
      }

      const { data: inserted, error } = await admin
        .from("notes")
        .insert({
          user_id: device.userId,
          title: item.title,
          content: item.content,
          source: item.source,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      await syncNoteChunks(admin, inserted.id, device.userId, item.content);
      await syncNoteLinks(admin, inserted.id, device.userId, item.content);
      recordCanonical(item);
      applied += 1;
    }

    return NextResponse.json({ applied, skipped, deleted, conflicts, canonical });
  } catch (error) {
    console.error("Sync push failed:", error);

    // Buku besar dibersihkan supaya percobaan ulang agen benar-benar diproses
    // ulang, bukan tertolak sebagai duplikat padahal belum pernah berhasil.
    // Pola yang sama dipakai pada webhook Stripe.
    await admin
      .from("note_sync_events")
      .delete()
      .eq("device_id", device.deviceId)
      .eq("event_id", eventId);

    // Jatah dikembalikan juga: kegagalan server berulang tidak boleh memakan
    // kuota harian pengguna padahal tidak ada catatan yang benar-benar masuk.
    await refundSyncNotes(admin, device.userId, notesInBatch);

    return NextResponse.json(
      { error: "Gagal menerapkan perubahan." },
      { status: 500 },
    );
  }
}

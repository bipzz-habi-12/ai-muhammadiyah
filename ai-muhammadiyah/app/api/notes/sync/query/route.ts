import { NextResponse } from "next/server";
import { createEmbedding, isEmbeddingConfigured } from "@/lib/second-brain/embedding";
import {
  authenticateSyncDevice,
  consumeSyncQuota,
  rateLimitResponseBody,
} from "@/lib/second-brain/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/notes/sync/query -> baca Otak Kedua lewat token perangkat.
//
// Dipakai MCP server Hermes Agent (`scripts/hermes-mcp-server.mjs`), bukan
// browser. Tiga mode dijadikan satu rute alih-alih tiga rute terpisah supaya
// permukaan yang diautentikasi token tetap sekecil mungkin — tiap endpoint
// baru di jalur ini adalah pintu tambahan yang harus dijaga.
//
// Hanya BACA. Penulisan tetap lewat /api/notes/sync/push yang sudah punya
// buku besar idempotensi dan penghitungan kuota berbasis embedding.

export const runtime = "nodejs";
export const maxDuration = 60;

const maxLimit = 20;

export async function POST(request: Request) {
  try {
    const admin = createSupabaseServerClient();
    const device = await authenticateSyncDevice(admin, request);

    if (!device) {
      return NextResponse.json(
        { error: "Token perangkat tidak sah." },
        { status: 401 },
      );
    }

    // Membaca tidak memicu embedding catatan baru, jadi hanya menghitung
    // permintaan. (Query semantik memang memakai satu embedding untuk
    // pertanyaannya, tapi itu satu panggilan kecil, bukan per-catatan.)
    const quota = await consumeSyncQuota(admin, device.userId, 0);

    if (!quota.allowed) {
      return NextResponse.json(rateLimitResponseBody(quota), {
        status: 429,
        headers: { "Retry-After": "600" },
      });
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

    const record = (body ?? {}) as Record<string, unknown>;
    const mode = record.mode === "recent" || record.mode === "get" ? record.mode : "search";
    const limit = Math.min(
      Math.max(Number(record.limit) || 6, 1),
      maxLimit,
    );

    if (mode === "recent") {
      const { data, error } = await admin
        .from("notes")
        .select("id,title,content,source,updated_at")
        .eq("user_id", device.userId)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return NextResponse.json({ notes: data ?? [] });
    }

    if (mode === "get") {
      const title = typeof record.title === "string" ? record.title.trim() : "";

      if (!title) {
        return NextResponse.json(
          { error: "title wajib diisi untuk mode get." },
          { status: 400 },
        );
      }

      const { data, error } = await admin
        .from("notes")
        .select("id,title,content,source,updated_at")
        .eq("user_id", device.userId)
        .ilike("title", title)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return NextResponse.json(
          { error: "Catatan tidak ditemukan." },
          { status: 404 },
        );
      }

      // Backlink ikut dikirim: bagi agen, tetangga sebuah catatan sering lebih
      // berguna daripada isinya sendiri.
      const { data: links } = await admin
        .from("note_links")
        .select("target_title,target_note_id")
        .eq("source_note_id", data.id);

      return NextResponse.json({ note: data, links: links ?? [] });
    }

    const query = typeof record.query === "string" ? record.query.trim() : "";

    if (!query) {
      return NextResponse.json(
        { error: "query wajib diisi." },
        { status: 400 },
      );
    }

    const embedding = isEmbeddingConfigured()
      ? await createEmbedding(query).catch((error) => {
          console.error("Query embedding failed:", error);
          return null;
        })
      : null;

    // Varian `_for_user`: `search_notes` biasa menyaring dengan auth.uid(),
    // yang null di jalur token dan akan selalu mengembalikan kosong.
    const { data, error } = await admin.rpc("search_notes_for_user", {
      p_user_id: device.userId,
      p_query: query,
      p_embedding: embedding,
      p_limit: limit,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ results: data ?? [] });
  } catch (error) {
    console.error("Sync query failed:", error);
    return NextResponse.json(
      { error: "Gagal membaca catatan." },
      { status: 500 },
    );
  }
}

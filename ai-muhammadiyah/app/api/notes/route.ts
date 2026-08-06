import { NextResponse } from "next/server";
import {
  coerceNoteInput,
  syncNoteChunks,
  syncNoteLinks,
} from "@/lib/second-brain/store";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// GET  /api/notes -> daftar catatan milik pengguna.
// POST /api/notes -> simpan satu catatan (dari pengguna maupun dari usulan AI).
//
// Semua operasi lewat klien auth ber-RLS, bukan service role: policy
// "Users can create own notes" sudah memaksa user_id = auth.uid(), jadi
// kepemilikan dijamin database (pola sama seperti `app/api/skills/route.ts`).

const NOTE_COLUMNS =
  "id,title,content,source,workspace_id,origin_conversation_id,created_at,updated_at";

export async function GET() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("notes")
      .select(NOTE_COLUMNS)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (error) {
    console.error("List notes failed:", error);
    return NextResponse.json(
      { error: "Gagal memuat catatan." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
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

    const coerced = coerceNoteInput(body);
    if (!coerced.ok) {
      return NextResponse.json({ error: coerced.error }, { status: 400 });
    }

    const { title, content, source, workspaceId, originConversationId } =
      coerced.value;

    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title,
        content,
        source,
        workspace_id: workspaceId,
        origin_conversation_id: originConversationId,
      })
      .select(NOTE_COLUMNS)
      .single();

    if (error) {
      // notes_user_title_key: judul unik per pengguna (model halaman Logseq).
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Catatan dengan judul itu sudah ada." },
          { status: 409 },
        );
      }

      throw error;
    }

    // Chunk + embedding + tautan menyusul setelah baris catatannya ada.
    // Kegagalan di sini tidak membatalkan catatan — pengguna tidak boleh
    // kehilangan tulisannya hanya karena penyedia embedding sedang bermasalah.
    // Konsekuensinya catatan itu belum tercari sampai disimpan ulang.
    let indexed = true;

    try {
      await syncNoteChunks(supabase, note.id, user.id, content);
      await syncNoteLinks(supabase, note.id, user.id, content);
    } catch (indexError) {
      indexed = false;
      console.error("Note indexing failed:", indexError);
    }

    return NextResponse.json({ note, indexed }, { status: 201 });
  } catch (error) {
    console.error("Create note failed:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan." },
      { status: 500 },
    );
  }
}

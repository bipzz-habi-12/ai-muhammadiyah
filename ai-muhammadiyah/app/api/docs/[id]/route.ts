import { NextResponse } from "next/server";
import { deleteDoc, updateDoc } from "@/lib/docs";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { title?: string; content?: string };

    if (typeof body.title !== "string" && typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Tidak ada perubahan yang dikirim." },
        { status: 400 },
      );
    }

    const doc = await updateDoc(supabase, id, {
      title: body.title,
      content: body.content,
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ doc });
  } catch (error) {
    console.error("Doc update failed:", error);

    return NextResponse.json(
      { error: "Dokumen belum bisa disimpan." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const { id } = await params;
    const wasDeleted = await deleteDoc(supabase, id);

    if (!wasDeleted) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Doc delete failed:", error);

    return NextResponse.json(
      { error: "Dokumen belum bisa dihapus." },
      { status: 500 },
    );
  }
}

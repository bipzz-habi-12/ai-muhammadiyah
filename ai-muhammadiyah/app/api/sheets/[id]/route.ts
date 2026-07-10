import { NextResponse } from "next/server";
import { deleteSheet, updateSheet } from "@/lib/sheets";
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
    const body = (await request.json()) as {
      title?: string;
      columns?: string[];
      rows?: string[][];
    };

    if (typeof body.title !== "string" && !body.columns && !body.rows) {
      return NextResponse.json(
        { error: "Tidak ada perubahan yang dikirim." },
        { status: 400 },
      );
    }

    const sheet = await updateSheet(supabase, id, {
      title: body.title,
      columns: body.columns,
      rows: body.rows,
    });

    if (!sheet) {
      return NextResponse.json(
        { error: "Sheet tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ sheet });
  } catch (error) {
    console.error("Sheet update failed:", error);

    return NextResponse.json(
      { error: "Sheet belum bisa disimpan." },
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
    const wasDeleted = await deleteSheet(supabase, id);

    if (!wasDeleted) {
      return NextResponse.json(
        { error: "Sheet tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sheet delete failed:", error);

    return NextResponse.json(
      { error: "Sheet belum bisa dihapus." },
      { status: 500 },
    );
  }
}

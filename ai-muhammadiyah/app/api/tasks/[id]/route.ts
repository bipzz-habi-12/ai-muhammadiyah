import { NextResponse } from "next/server";
import { deleteTaskList, updateTaskList, type TaskItem } from "@/lib/tasks";
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
      items?: TaskItem[];
    };

    if (typeof body.title !== "string" && !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "Tidak ada perubahan yang dikirim." },
        { status: 400 },
      );
    }

    const list = await updateTaskList(supabase, id, {
      title: body.title,
      items: body.items,
    });

    if (!list) {
      return NextResponse.json(
        { error: "Task tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ list });
  } catch (error) {
    console.error("Task list update failed:", error);

    return NextResponse.json(
      { error: "Task belum bisa disimpan." },
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
    const wasDeleted = await deleteTaskList(supabase, id);

    if (!wasDeleted) {
      return NextResponse.json(
        { error: "Task tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Task list delete failed:", error);

    return NextResponse.json(
      { error: "Task belum bisa dihapus." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import {
  deleteCanvas,
  updateCanvas,
  type CanvasEdge,
  type CanvasNode,
} from "@/lib/canvas";
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
      nodes?: CanvasNode[];
      edges?: CanvasEdge[];
    };

    if (typeof body.title !== "string" && !body.nodes && !body.edges) {
      return NextResponse.json(
        { error: "Tidak ada perubahan yang dikirim." },
        { status: 400 },
      );
    }

    const canvas = await updateCanvas(supabase, id, {
      title: body.title,
      nodes: body.nodes,
      edges: body.edges,
    });

    if (!canvas) {
      return NextResponse.json(
        { error: "Canvas tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error("Canvas update failed:", error);

    return NextResponse.json(
      { error: "Canvas belum bisa disimpan." },
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
    const wasDeleted = await deleteCanvas(supabase, id);

    if (!wasDeleted) {
      return NextResponse.json(
        { error: "Canvas tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Canvas delete failed:", error);

    return NextResponse.json(
      { error: "Canvas belum bisa dihapus." },
      { status: 500 },
    );
  }
}

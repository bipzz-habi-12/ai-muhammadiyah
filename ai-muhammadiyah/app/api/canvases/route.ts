import { NextResponse } from "next/server";
import {
  createCanvas,
  listCanvases,
  type CanvasEdge,
  type CanvasNode,
} from "@/lib/canvas";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const workspaceId = new URL(request.url).searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id wajib diisi." },
        { status: 400 },
      );
    }

    // RLS scopes this to workspaces the user owns; a workspaceId that isn't
    // theirs (or doesn't exist) simply resolves to an empty list, same as
    // the docs/tasks/sheets routes trust RLS without a separate ownership
    // check.
    const canvases = await listCanvases(supabase, workspaceId);

    return NextResponse.json({ canvases });
  } catch (error) {
    console.error("Canvases list failed:", error);

    return NextResponse.json(
      { error: "Canvas belum bisa dimuat." },
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

    const body = (await request.json()) as {
      workspaceId?: string;
      title?: string;
      nodes?: CanvasNode[];
      edges?: CanvasEdge[];
      sourceRef?: string | null;
    };

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "workspace_id wajib diisi." },
        { status: 400 },
      );
    }

    const canvas = await createCanvas(supabase, {
      workspaceId: body.workspaceId,
      title: body.title,
      nodes: body.nodes,
      edges: body.edges,
      sourceRef: body.sourceRef ?? null,
    });

    return NextResponse.json({ canvas }, { status: 201 });
  } catch (error) {
    console.error("Canvas create failed:", error);

    return NextResponse.json(
      { error: "Canvas belum bisa dibuat." },
      { status: 500 },
    );
  }
}

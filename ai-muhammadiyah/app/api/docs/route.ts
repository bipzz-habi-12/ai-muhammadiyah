import { NextResponse } from "next/server";
import { createDoc, listDocs } from "@/lib/docs";
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
    // the knowledge-sources route trusts RLS without a separate ownership check.
    const docs = await listDocs(supabase, workspaceId);

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Docs list failed:", error);

    return NextResponse.json(
      { error: "Dokumen belum bisa dimuat." },
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
      content?: string;
      sourceRef?: string | null;
    };

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "workspace_id wajib diisi." },
        { status: 400 },
      );
    }

    const doc = await createDoc(supabase, {
      workspaceId: body.workspaceId,
      title: body.title,
      content: body.content,
      sourceRef: body.sourceRef ?? null,
    });

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error) {
    console.error("Doc create failed:", error);

    return NextResponse.json(
      { error: "Dokumen belum bisa dibuat." },
      { status: 500 },
    );
  }
}

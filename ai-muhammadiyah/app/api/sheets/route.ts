import { NextResponse } from "next/server";
import { createSheet, listSheets } from "@/lib/sheets";
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
    // the docs/tasks routes trust RLS without a separate ownership check.
    const sheets = await listSheets(supabase, workspaceId);

    return NextResponse.json({ sheets });
  } catch (error) {
    console.error("Sheets list failed:", error);

    return NextResponse.json(
      { error: "Sheets belum bisa dimuat." },
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
      columns?: string[];
      rows?: string[][];
      sourceRef?: string | null;
    };

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "workspace_id wajib diisi." },
        { status: 400 },
      );
    }

    const sheet = await createSheet(supabase, {
      workspaceId: body.workspaceId,
      title: body.title,
      columns: body.columns,
      rows: body.rows,
      sourceRef: body.sourceRef ?? null,
    });

    return NextResponse.json({ sheet }, { status: 201 });
  } catch (error) {
    console.error("Sheet create failed:", error);

    return NextResponse.json(
      { error: "Sheet belum bisa dibuat." },
      { status: 500 },
    );
  }
}

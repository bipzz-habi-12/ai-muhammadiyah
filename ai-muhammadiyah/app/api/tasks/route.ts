import { NextResponse } from "next/server";
import { createTaskList, listTaskLists, type TaskItem } from "@/lib/tasks";
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
    // theirs (or doesn't exist) simply resolves to an empty list.
    const lists = await listTaskLists(supabase, workspaceId);

    return NextResponse.json({ lists });
  } catch (error) {
    console.error("Task lists load failed:", error);

    return NextResponse.json(
      { error: "Tasks belum bisa dimuat." },
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
      items?: TaskItem[];
      sourceRef?: string | null;
    };

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "workspace_id wajib diisi." },
        { status: 400 },
      );
    }

    const list = await createTaskList(supabase, {
      workspaceId: body.workspaceId,
      title: body.title,
      items: Array.isArray(body.items) ? body.items : undefined,
      sourceRef: body.sourceRef ?? null,
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    console.error("Task list create failed:", error);

    return NextResponse.json(
      { error: "Task list belum bisa dibuat." },
      { status: 500 },
    );
  }
}

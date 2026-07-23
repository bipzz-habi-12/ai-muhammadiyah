import { NextResponse } from "next/server";
import { isHubAdmin } from "@/lib/admin";
import {
  HUB_RESOURCE_COLUMNS,
  HUB_TABLE_MISSING,
  coerceHubResourceCreate,
  listHubResources,
} from "@/lib/hub";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET  /api/hub  -> public (auth-gated) list of active Hub resources.
// POST /api/hub  -> admin-only: create a curated Hub resource.

export async function GET() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const resources = await listHubResources(supabase);

    return NextResponse.json({
      isAdmin: isHubAdmin(user),
      resources,
    });
  } catch (error) {
    if (error instanceof Error && error.message === HUB_TABLE_MISSING) {
      // Migration not applied yet: report an empty set so the page falls back to
      // its curated defaults instead of surfacing a 500.
      return NextResponse.json({ isAdmin: false, resources: [] });
    }

    console.error("Hub resources load failed:", error);

    return NextResponse.json(
      { error: "Muhammadiyah Hub belum bisa dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    if (!isHubAdmin(user)) {
      return NextResponse.json(
        { error: "Hanya admin yang bisa mengelola Muhammadiyah Hub." },
        { status: 403 },
      );
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

    const coerced = coerceHubResourceCreate(body);
    if (!coerced.ok) {
      return NextResponse.json({ error: coerced.error }, { status: 400 });
    }

    const serverSupabase = createSupabaseServerClient();
    const { data: resource, error } = await serverSupabase
      .from("hub_resources")
      .insert({ ...coerced.value, created_by: user.id })
      .select(HUB_RESOURCE_COLUMNS)
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "URL ini sudah ada di direktori Hub." },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("Hub resource create failed:", error);

    return NextResponse.json(
      { error: "Sumber Hub belum bisa disimpan." },
      { status: 500 },
    );
  }
}

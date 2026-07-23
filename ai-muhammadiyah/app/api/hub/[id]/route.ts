import { NextResponse } from "next/server";
import { isHubAdmin } from "@/lib/admin";
import {
  HUB_RESOURCE_COLUMNS,
  coerceHubResourceUpdate,
} from "@/lib/hub";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// PATCH  /api/hub/[id]  -> admin-only: update a curated Hub resource.
// DELETE /api/hub/[id]  -> admin-only: remove a curated Hub resource.

async function requireHubAdmin() {
  const authSupabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Belum login." }, { status: 401 }),
    };
  }

  if (!isHubAdmin(user)) {
    return {
      response: NextResponse.json(
        { error: "Hanya admin yang bisa mengelola Muhammadiyah Hub." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireHubAdmin();
    if (guard.response) {
      return guard.response;
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body permintaan tidak valid." },
        { status: 400 },
      );
    }

    const coerced = coerceHubResourceUpdate(body);
    if (!coerced.ok) {
      return NextResponse.json({ error: coerced.error }, { status: 400 });
    }

    const serverSupabase = createSupabaseServerClient();
    const { data: resource, error } = await serverSupabase
      .from("hub_resources")
      .update(coerced.value)
      .eq("id", id)
      .select(HUB_RESOURCE_COLUMNS)
      .maybeSingle();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "URL ini sudah ada di direktori Hub." },
          { status: 409 },
        );
      }
      throw error;
    }

    if (!resource) {
      return NextResponse.json(
        { error: "Sumber Hub tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Hub resource update failed:", error);

    return NextResponse.json(
      { error: "Sumber Hub belum bisa diperbarui." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireHubAdmin();
    if (guard.response) {
      return guard.response;
    }

    const { id } = await params;
    const serverSupabase = createSupabaseServerClient();
    const { data: resource, error } = await serverSupabase
      .from("hub_resources")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!resource) {
      return NextResponse.json(
        { error: "Sumber Hub tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Hub resource delete failed:", error);

    return NextResponse.json(
      { error: "Sumber Hub belum bisa dihapus." },
      { status: 500 },
    );
  }
}

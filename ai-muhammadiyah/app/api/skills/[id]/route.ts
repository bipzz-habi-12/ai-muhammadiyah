import { NextResponse } from "next/server";
import {
  SKILL_COLUMNS,
  coerceSkillUpdate,
  mapSkillRow,
  type SkillRow,
} from "@/lib/skills";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// PATCH  /api/skills/[id] -> update the current user's own custom skill.
// DELETE /api/skills/[id] -> remove the current user's own custom skill.
//
// Both use the RLS-scoped auth client and additionally scope every query by
// owner_id = user.id, so a user can never touch a platform skill (owner_id null)
// or another user's skill — a mismatched id simply returns no row -> 404.

async function requireUser() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Belum login." }, { status: 401 }),
    };
  }

  return { supabase, user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireUser();
    if (guard.response) {
      return guard.response;
    }
    const { supabase, user } = guard;

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

    const coerced = coerceSkillUpdate(body);
    if (!coerced.ok) {
      return NextResponse.json({ error: coerced.error }, { status: 400 });
    }

    const { data: skill, error } = await supabase
      .from("skills")
      .update(coerced.value)
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("is_custom", true)
      .select(SKILL_COLUMNS)
      .maybeSingle();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Perintah slash ini sudah dipakai. Pilih yang lain." },
          { status: 409 },
        );
      }
      throw error;
    }

    if (!skill) {
      return NextResponse.json(
        { error: "Skill tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ skill: mapSkillRow(skill as SkillRow) });
  } catch (error) {
    console.error("Skill update failed:", error);

    return NextResponse.json(
      { error: "Skill belum bisa diperbarui." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireUser();
    if (guard.response) {
      return guard.response;
    }
    const { supabase, user } = guard;

    const { id } = await params;

    const { data: skill, error } = await supabase
      .from("skills")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("is_custom", true)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!skill) {
      return NextResponse.json(
        { error: "Skill tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Skill delete failed:", error);

    return NextResponse.json(
      { error: "Skill belum bisa dihapus." },
      { status: 500 },
    );
  }
}

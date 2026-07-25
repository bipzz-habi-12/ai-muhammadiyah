import { NextResponse } from "next/server";
import {
  FREE_CUSTOM_SKILL_LIMIT,
  SKILL_COLUMNS,
  coerceSkillCreate,
  countOwnedCustomSkills,
  mapSkillRow,
  type SkillRow,
} from "@/lib/skills";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { normalizeUsageSnapshot } from "@/lib/usage/limits";

// POST /api/skills -> create a custom skill owned by the current user.
//
// All writes go through the RLS-scoped auth client (not the service role):
// the "Users can create own custom skills" policy already enforces
// owner_id = auth.uid() AND is_custom = true, so ownership is guaranteed by the
// database. The only thing enforced in app code is the free-tier quota.

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
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

    const coerced = coerceSkillCreate(body);
    if (!coerced.ok) {
      return NextResponse.json({ error: coerced.error }, { status: 400 });
    }

    // Free-tier quota: cap the number of custom skills. Paid tiers are
    // unlimited. get_usage_snapshot is read-only (does not consume quota).
    const { data: snapshotRow } = await supabase.rpc("get_usage_snapshot");
    const tier = normalizeUsageSnapshot(snapshotRow)?.tier ?? "free";

    if (tier === "free") {
      const customCount = await countOwnedCustomSkills(supabase, user.id);
      if (customCount >= FREE_CUSTOM_SKILL_LIMIT) {
        return NextResponse.json(
          {
            error: `Paket Free dibatasi ${FREE_CUSTOM_SKILL_LIMIT} skill custom. Upgrade untuk membuat lebih banyak.`,
          },
          { status: 403 },
        );
      }
    }

    const { data: skill, error } = await supabase
      .from("skills")
      .insert({ ...coerced.value, owner_id: user.id, is_custom: true })
      .select(SKILL_COLUMNS)
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Perintah slash ini sudah dipakai. Pilih yang lain." },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json(
      { skill: mapSkillRow(skill as SkillRow) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Skill create failed:", error);

    return NextResponse.json(
      { error: "Skill belum bisa disimpan." },
      { status: 500 },
    );
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { planOrder } from "@/lib/subscriptions/plans";
import type { SubscriptionTier } from "@/lib/usage/limits";

export type Skill = {
  id: string;
  ownerId: string | null;
  name: string;
  category: string | null;
  systemPrompt: string;
  systemPromptPremium: string | null;
  isCustom: boolean;
  minTier: SubscriptionTier;
  slashCommand: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SkillRow = {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  system_prompt: string;
  system_prompt_premium: string | null;
  is_custom: boolean;
  min_tier: string;
  slash_command?: string | null;
  created_at: string;
  updated_at: string;
};

export const defaultSkillName = "Cambridge Tutor";

// Fixed column list selected everywhere skills are read (fetchSkills + the
// /api/skills routes), so mapSkillRow always receives the same shape.
export const SKILL_COLUMNS =
  "id,owner_id,name,category,system_prompt,system_prompt_premium,is_custom,min_tier,slash_command,created_at,updated_at";

// Custom-skill quota for the free tier. Kept as a single constant so it is easy
// to tighten once billing is live (CLAUDE.md pricing: free = "skill bawaan
// saja"). Paid tiers are unlimited. Enforced authoritatively server-side in
// POST /api/skills; the UI mirrors it for a friendly disabled state.
export const FREE_CUSTOM_SKILL_LIMIT = 3;

export const SKILL_NAME_MAX = 80;
export const SKILL_CATEGORY_MAX = 60;
export const SKILL_SYSTEM_PROMPT_MAX = 6000;
export const SKILL_SLASH_COMMAND_MAX = 32;

function normalizeTier(value: unknown): SubscriptionTier {
  if (
    value === "kader_pintar" ||
    value === "muallim_pro" ||
    value === "dakwah_digital" ||
    value === "sinergi_ranting"
  ) {
    return value;
  }

  return "free";
}

export function mapSkillRow(row: SkillRow): Skill {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    category: row.category,
    systemPrompt: row.system_prompt,
    systemPromptPremium: row.system_prompt_premium,
    isCustom: row.is_custom,
    minTier: normalizeTier(row.min_tier),
    slashCommand: row.slash_command ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSkills(
  supabase: SupabaseClient,
  userId: string,
): Promise<Skill[]> {
  const { data, error } = await supabase
    .from("skills")
    .select(SKILL_COLUMNS)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)
    .order("is_custom", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SkillRow[]).map(mapSkillRow);
}

export function canAccessTier(
  userTier: SubscriptionTier | null | undefined,
  minTier: SubscriptionTier,
) {
  const userIndex = planOrder.indexOf(userTier ?? "free");
  const minIndex = planOrder.indexOf(minTier);

  if (userIndex === -1 || minIndex === -1) {
    return minTier === "free";
  }

  return userIndex >= minIndex;
}

export function findDefaultSkill(skills: Skill[]): Skill | null {
  return (
    skills.find(
      (skill) => skill.ownerId === null && skill.name === defaultSkillName,
    ) ??
    skills.find((skill) => skill.ownerId === null && skill.minTier === "free") ??
    skills[0] ??
    null
  );
}

export function resolveAllowedSkill(
  skillId: string | null | undefined,
  tier: SubscriptionTier | null | undefined,
  skills: Skill[],
): Skill | null {
  const requested = skillId
    ? skills.find((skill) => skill.id === skillId)
    : undefined;

  if (requested && canAccessTier(tier, requested.minTier)) {
    return requested;
  }

  return findDefaultSkill(skills);
}

export function getSkillSystemPrompt(
  skill: Skill,
  tier?: SubscriptionTier | null,
) {
  const hasPremiumPrompt = Boolean(skill.systemPromptPremium?.trim());
  const isAboveFree = Boolean(tier && tier !== "free");

  if (hasPremiumPrompt && isAboveFree && canAccessTier(tier, skill.minTier)) {
    return skill.systemPromptPremium as string;
  }

  return skill.systemPrompt;
}

export function getSkillBadge(skill: Skill, tier?: SubscriptionTier | null) {
  const hasPremiumPrompt = Boolean(skill.systemPromptPremium?.trim());
  const isAboveFree = Boolean(tier && tier !== "free");

  if (hasPremiumPrompt) {
    return isAboveFree ? "Advanced" : "Basic";
  }

  return skill.minTier !== "free" ? "Premium" : "Free";
}

// --- Custom-skill write validation ------------------------------------------
// Used by POST/PATCH /api/skills to turn an untrusted request body into a safe
// DB row. Mirrors the shape/return convention of coerceHubResource* in lib/hub.ts.

export type SkillWriteRow = {
  name: string;
  category: string | null;
  system_prompt: string;
  system_prompt_premium: string | null;
  slash_command: string | null;
};

type SkillCoerceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function cleanSkillString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

// Normalize a user-typed slash command to a canonical "/xxx" form: a single
// leading slash, lowercase, only [a-z0-9-]. Empty input is allowed (the command
// is optional — such a skill is still selectable from the skill dropdown, just
// not the "/" quick picker). Invalid characters are rejected with a message.
export function normalizeSlashCommand(
  value: unknown,
): SkillCoerceResult<string | null> {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Perintah slash tidak valid." };
  }

  let slug = value.trim().toLowerCase();
  if (!slug) {
    return { ok: true, value: null };
  }

  slug = slug.replace(/^\/+/, "").replace(/\s+/g, "-");
  if (!slug) {
    return { ok: true, value: null };
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return {
      ok: false,
      error: "Perintah slash hanya boleh huruf kecil, angka, dan tanda hubung.",
    };
  }

  // Leave room for the leading "/".
  slug = slug.slice(0, SKILL_SLASH_COMMAND_MAX - 1);
  return { ok: true, value: `/${slug}` };
}

// Validate + normalize an admin/user create payload into a DB insert row. Only
// name and systemPrompt are required; category/premium prompt/slash are optional.
export function coerceSkillCreate(
  body: unknown,
): SkillCoerceResult<SkillWriteRow> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Data skill tidak valid." };
  }

  const input = body as Record<string, unknown>;

  const name = cleanSkillString(input.name, SKILL_NAME_MAX);
  if (!name) {
    return { ok: false, error: "Nama skill wajib diisi." };
  }

  const systemPrompt = cleanSkillString(
    input.systemPrompt,
    SKILL_SYSTEM_PROMPT_MAX,
  );
  if (!systemPrompt) {
    return { ok: false, error: "Instruksi skill wajib diisi." };
  }

  const slash = normalizeSlashCommand(input.slashCommand);
  if (!slash.ok) {
    return slash;
  }

  return {
    ok: true,
    value: {
      name,
      category: cleanSkillString(input.category, SKILL_CATEGORY_MAX),
      system_prompt: systemPrompt,
      system_prompt_premium: cleanSkillString(
        input.systemPromptPremium,
        SKILL_SYSTEM_PROMPT_MAX,
      ),
      slash_command: slash.value,
    },
  };
}

// Validate + normalize an update payload into a partial patch — only keys that
// are actually present in the body are touched, so unspecified columns keep
// their value (matches coerceHubResourceUpdate).
export function coerceSkillUpdate(
  body: unknown,
): SkillCoerceResult<Partial<SkillWriteRow>> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Data skill tidak valid." };
  }

  const input = body as Record<string, unknown>;
  const patch: Partial<SkillWriteRow> = {};

  if ("name" in input) {
    const name = cleanSkillString(input.name, SKILL_NAME_MAX);
    if (!name) {
      return { ok: false, error: "Nama skill tidak boleh kosong." };
    }
    patch.name = name;
  }

  if ("systemPrompt" in input) {
    const systemPrompt = cleanSkillString(
      input.systemPrompt,
      SKILL_SYSTEM_PROMPT_MAX,
    );
    if (!systemPrompt) {
      return { ok: false, error: "Instruksi skill tidak boleh kosong." };
    }
    patch.system_prompt = systemPrompt;
  }

  if ("category" in input) {
    patch.category = cleanSkillString(input.category, SKILL_CATEGORY_MAX);
  }

  if ("systemPromptPremium" in input) {
    patch.system_prompt_premium = cleanSkillString(
      input.systemPromptPremium,
      SKILL_SYSTEM_PROMPT_MAX,
    );
  }

  if ("slashCommand" in input) {
    const slash = normalizeSlashCommand(input.slashCommand);
    if (!slash.ok) {
      return slash;
    }
    patch.slash_command = slash.value;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Tidak ada perubahan untuk disimpan." };
  }

  return { ok: true, value: patch };
}

// Count a user's own custom skills — the number the free-tier quota checks.
export async function countOwnedCustomSkills(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("skills")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("is_custom", true);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

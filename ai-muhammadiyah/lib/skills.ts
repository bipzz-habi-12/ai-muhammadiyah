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
  createdAt: string;
  updatedAt: string;
};

type SkillRow = {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  system_prompt: string;
  system_prompt_premium: string | null;
  is_custom: boolean;
  min_tier: string;
  created_at: string;
  updated_at: string;
};

export const defaultSkillName = "Cambridge Tutor";

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

function mapSkillRow(row: SkillRow): Skill {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    category: row.category,
    systemPrompt: row.system_prompt,
    systemPromptPremium: row.system_prompt_premium,
    isCustom: row.is_custom,
    minTier: normalizeTier(row.min_tier),
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
    .select(
      "id,owner_id,name,category,system_prompt,system_prompt_premium,is_custom,min_tier,created_at,updated_at",
    )
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

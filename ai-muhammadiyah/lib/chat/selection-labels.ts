import type { Skill } from "@/lib/skills";
import type { PlanModelId } from "@/lib/subscriptions/plans";
import { getPlanByTier, getUpgradePlanForModel } from "@/lib/subscriptions/plans";

export function getModelProviderLabel(model: PlanModelId) {
  if (model === "document") {
    return "Powered by GPT-5.6 Terra · konteks panjang";
  }

  return "Powered by GPT-5.6 Terra";
}

export function getLockedModelRequirement(model: PlanModelId) {
  if (model === "document") {
    return "Requires Muallim Pro or higher";
  }

  return `Mulai dari ${getUpgradePlanForModel(model).name}`;
}

export function getLockedSkillRequirement(skill: Skill) {
  if (skill.minTier === "free") {
    return "Available in your plan";
  }

  return `Mulai dari ${getPlanByTier(skill.minTier).name}`;
}

import type { Skill } from "@/lib/skills";
import type { PlanModelId } from "@/lib/subscriptions/plans";
import {
  getPlanByTier,
  getUpgradePlanForModel,
  modelCatalog,
} from "@/lib/subscriptions/plans";

export function getModelProviderLabel(model: PlanModelId) {
  return `Ditenagai ${modelCatalog[model].engineLabel}`;
}

export function getLockedModelRequirement(model: PlanModelId) {
  return `Mulai dari ${getUpgradePlanForModel(model).name}`;
}

export function getLockedSkillRequirement(skill: Skill) {
  if (skill.minTier === "free") {
    return "Available in your plan";
  }

  return `Mulai dari ${getPlanByTier(skill.minTier).name}`;
}

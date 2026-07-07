"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { resolveAllowedSkill, type Skill } from "@/lib/skills";
import { getPlanByTier, type PlanModelId } from "@/lib/subscriptions/plans";
import { tierLabels, type UsageSnapshot, fetchUsageSnapshot } from "@/lib/usage/limits";

export function useUsage() {
  const [usageSnapshot, setUsageSnapshot] = useState<UsageSnapshot | null>(null);
  const [usageError, setUsageError] = useState("");

  const loadUsage = useCallback(async (): Promise<UsageSnapshot | null> => {
    try {
      setUsageError("");
      const snapshot = await fetchUsageSnapshot();
      setUsageSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      console.error(error);
      setUsageSnapshot(null);
      setUsageError(
        error instanceof Error
          ? error.message
          : "Status penggunaan belum bisa dimuat.",
      );
      return null;
    }
  }, []);

  const currentTierLabel = usageSnapshot
    ? tierLabels[usageSnapshot.tier]
    : "Memuat";
  const allowedModels = usageSnapshot?.allowedModels ?? ["auto", "fast"];
  const currentPlan = usageSnapshot ? getPlanByTier(usageSnapshot.tier) : null;
  const hasMessageQuota =
    !usageSnapshot || usageSnapshot.remainingMessagesToday > 0;
  const hasUploadQuota =
    !usageSnapshot || usageSnapshot.remainingUploadsToday > 0;

  return {
    usageSnapshot,
    usageError,
    loadUsage,
    currentTierLabel,
    allowedModels,
    currentPlan,
    hasMessageQuota,
    hasUploadQuota,
  };
}

export function applyUsageConstraints(
  snapshot: UsageSnapshot | null,
  skillsRef: MutableRefObject<Skill[]>,
  setSelectedModel: Dispatch<SetStateAction<PlanModelId>>,
  setSelectedSkillId: Dispatch<SetStateAction<string | null>>,
) {
  setSelectedModel((currentModel) =>
    snapshot && !snapshot.allowedModels.includes(currentModel)
      ? "auto"
      : currentModel,
  );
  setSelectedSkillId((currentId) =>
    resolveAllowedSkill(currentId, snapshot?.tier, skillsRef.current)?.id ??
      null,
  );
}

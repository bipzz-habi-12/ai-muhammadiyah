"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { resolveAllowedSkill, type Skill } from "@/lib/skills";
import {
  defaultModelProvider,
  getPlanByTier,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/subscriptions/plans";
import {
  fetchUsageSnapshot,
  getTightestWindow,
  hasQuota,
  tierLabels,
  type UsageSnapshot,
} from "@/lib/usage/limits";
import { defaultModelId } from "@/lib/subscriptions/plans";

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
  // Sebelum snapshot tiba, anggap hanya OpenAI yang hidup: itu perilaku
  // sebelum Langkah 54, jadi pemilih model tidak pernah sempat menawarkan
  // penyedia yang kuncinya kosong.
  const availableProviders: ModelProviderId[] =
    usageSnapshot?.availableProviders ?? [defaultModelProvider];
  const currentPlan = usageSnapshot ? getPlanByTier(usageSnapshot.tier) : null;
  // Satu meteran token untuk semuanya: pesan & upload memakai kolam yang sama.
  const hasMessageQuota = !usageSnapshot || hasQuota(usageSnapshot.tokens);
  const hasUploadQuota = hasMessageQuota;
  // Jendela yang paling mepet — itu yang benar-benar membatasi user, dan itu
  // yang ditampilkan sebagai persentase di UI.
  const tightestMessageWindow = usageSnapshot
    ? getTightestWindow(usageSnapshot.tokens)
    : null;

  return {
    usageSnapshot,
    usageError,
    loadUsage,
    currentTierLabel,
    allowedModels,
    availableProviders,
    currentPlan,
    hasMessageQuota,
    hasUploadQuota,
    tightestMessageWindow,
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
      ? defaultModelId
      : currentModel,
  );
  setSelectedSkillId((currentId) =>
    resolveAllowedSkill(currentId, snapshot?.tier, skillsRef.current)?.id ??
      null,
  );
}

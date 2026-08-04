"use client";

import { useState } from "react";
import {
  defaultEffortLevel,
  defaultModelId,
  getUpgradePlanForModel,
  modelCatalog,
  normalizeEffortLevel,
  type EffortLevel,
  type PlanModelId,
} from "@/lib/subscriptions/plans";

const EFFORT_STORAGE_KEY = "ai-mu-effort";
const THINKING_STORAGE_KEY = "ai-mu-thinking";

export function useModelSelection(allowedModels: string[]) {
  const [selectedModel, setSelectedModel] =
    useState<PlanModelId>(defaultModelId);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  // Submenu "Upaya" di dalam menu model (pola sama seperti referensi desain).
  const [isEffortMenuOpen, setIsEffortMenuOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeTargetModel, setUpgradeTargetModel] =
    useState<PlanModelId>(defaultModelId);

  // Upaya & Pemikiran adalah preferensi (bukan bagian percakapan), jadi
  // disimpan di localStorage seperti pilihan skill sesi.
  const [effort, setEffortState] = useState<EffortLevel>(() => {
    if (typeof window === "undefined") {
      return defaultEffortLevel;
    }

    return normalizeEffortLevel(
      window.localStorage.getItem(EFFORT_STORAGE_KEY),
    );
  });
  const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(THINKING_STORAGE_KEY) !== "off";
  });

  function setEffort(level: EffortLevel) {
    setEffortState(level);
    window.localStorage.setItem(EFFORT_STORAGE_KEY, level);
    setIsEffortMenuOpen(false);
  }

  function toggleThinking() {
    setIsThinkingEnabled((enabled) => {
      const next = !enabled;
      window.localStorage.setItem(THINKING_STORAGE_KEY, next ? "on" : "off");
      return next;
    });
  }

  function openUpgradeModal(model: PlanModelId = defaultModelId) {
    setUpgradeTargetModel(model);
    setIsUpgradeOpen(true);
    setIsModelMenuOpen(false);
  }

  function selectModel(model: PlanModelId) {
    if (!allowedModels.includes(model)) {
      openUpgradeModal(model);
      return;
    }

    setSelectedModel(model);
    setIsModelMenuOpen(false);
    setIsEffortMenuOpen(false);
  }

  const selectedModelInfo = modelCatalog[selectedModel];
  const upgradePlan = getUpgradePlanForModel(upgradeTargetModel);

  return {
    selectedModel,
    setSelectedModel,
    isModelMenuOpen,
    setIsModelMenuOpen,
    isEffortMenuOpen,
    setIsEffortMenuOpen,
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeTargetModel,
    selectedModelInfo,
    upgradePlan,
    selectModel,
    openUpgradeModal,
    effort,
    setEffort,
    isThinkingEnabled,
    toggleThinking,
  };
}

"use client";

import { useState } from "react";
import {
  getUpgradePlanForModel,
  modelCatalog,
  type PlanModelId,
} from "@/lib/subscriptions/plans";

export function useModelSelection(allowedModels: string[]) {
  const [selectedModel, setSelectedModel] = useState<PlanModelId>("auto");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeTargetModel, setUpgradeTargetModel] =
    useState<PlanModelId>("smart");

  function openUpgradeModal(model: PlanModelId = "smart") {
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
  }

  const selectedModelInfo = modelCatalog[selectedModel];
  const upgradePlan = getUpgradePlanForModel(upgradeTargetModel);

  return {
    selectedModel,
    setSelectedModel,
    isModelMenuOpen,
    setIsModelMenuOpen,
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeTargetModel,
    selectedModelInfo,
    upgradePlan,
    selectModel,
    openUpgradeModal,
  };
}

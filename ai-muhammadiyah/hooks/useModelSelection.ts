"use client";

import { useState } from "react";
import {
  getEquivalentModel,
  getModelProvider,
  credentialModeStorageKey,
  modelOptions,
  normalizeCredentialMode,
  type CredentialMode,
} from "@/lib/ai/model-catalog";
import {
  defaultEffortLevel,
  defaultModelId,
  defaultModelProvider,
  getUpgradePlanForModel,
  modelCatalog,
  normalizeEffortLevel,
  type EffortLevel,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/subscriptions/plans";

const EFFORT_STORAGE_KEY = "ai-mu-effort";
const THINKING_STORAGE_KEY = "ai-mu-thinking";

export function useModelSelection(
  allowedModels: string[],
  availableProviders: ModelProviderId[] = [defaultModelProvider],
  byokProviders: ModelProviderId[] = [],
) {
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
  const [credentialMode, setCredentialModeState] = useState<CredentialMode>(() =>
    typeof window === "undefined"
      ? "platform"
      : normalizeCredentialMode(
          window.localStorage.getItem(credentialModeStorageKey),
        ),
  );

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

  function canUseModel(model: PlanModelId, mode = credentialMode) {
    const provider = getModelProvider(model);
    return mode === "byok"
      ? byokProviders.includes(provider)
      : allowedModels.includes(model) && availableProviders.includes(provider);
  }

  function selectModel(
    model: PlanModelId,
    keepMenuOpen = false,
    mode = credentialMode,
  ) {
    if (mode === "platform" && !allowedModels.includes(model)) {
      openUpgradeModal(model);
      return;
    }

    if (!canUseModel(model, mode)) {
      return;
    }

    setSelectedModel(model);
    setCredentialMode(mode);

    // Pemilih dua kolom memanggil ini dengan keepMenuOpen: memilih NAMA model
    // belum tentu keputusan akhir — pengguna mungkin mau ganti mesinnya juga.
    if (!keepMenuOpen) {
      setIsModelMenuOpen(false);
      setIsEffortMenuOpen(false);
    }
  }

  function resolveProvider(model: PlanModelId): ModelProviderId {
    return getModelProvider(model);
  }

  function selectProvider(model: PlanModelId, provider: ModelProviderId) {
    const equivalent = getEquivalentModel(model, provider);
    if (!equivalent) {
      return;
    }

    selectModel(equivalent);
  }

  function setCredentialMode(mode: CredentialMode) {
    if (!canUseModel(selectedModel, mode)) {
      const fallbackModel = modelOptions.find((model) => canUseModel(model, mode));
      if (fallbackModel) {
        setSelectedModel(fallbackModel);
      }
    }

    setCredentialModeState(mode);
    window.localStorage.setItem(credentialModeStorageKey, mode);
  }

  const selectedProvider = resolveProvider(selectedModel);
  const selectedModelInfo = modelCatalog[selectedModel];
  const selectedEngineLabel = selectedModelInfo.label;
  const upgradePlan = getUpgradePlanForModel(upgradeTargetModel);

  return {
    selectedModel,
    setSelectedModel,
    selectedProvider,
    selectedEngineLabel,
    credentialMode,
    setCredentialMode,
    canUseModel,
    byokProviders,
    modelOptions,
    resolveProvider,
    selectProvider,
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

"use client";

import { useState } from "react";
import {
  defaultEffortLevel,
  defaultModelId,
  defaultModelProvider,
  getModelEngine,
  getUpgradePlanForModel,
  modelCatalog,
  normalizeEffortLevel,
  normalizeModelProvider,
  resolveEngineLabel,
  type EffortLevel,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/subscriptions/plans";

const EFFORT_STORAGE_KEY = "ai-mu-effort";
const THINKING_STORAGE_KEY = "ai-mu-thinking";
// Mesin dipilih PER MODEL (Langkah 54), jadi yang disimpan sebuah peta, bukan
// satu nilai: pengguna bisa menjalankan Aether di Gemini sambil tetap memakai
// GPT untuk Prism.
const PROVIDER_STORAGE_KEY = "ai-mu-model-provider";

function readStoredProviders(): Partial<Record<PlanModelId, ModelProviderId>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([model]) =>
        model === "aether" ||
        model === "cosmos" ||
        model === "prism" ||
        model === "velo",
    );

    return Object.fromEntries(
      entries.map(([model, provider]) => [
        model,
        normalizeModelProvider(provider),
      ]),
    );
  } catch (error) {
    console.error(error);
    return {};
  }
}

export function useModelSelection(
  allowedModels: string[],
  availableProviders: ModelProviderId[] = [defaultModelProvider],
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

  const [providerByModel, setProviderByModel] = useState<
    Partial<Record<PlanModelId, ModelProviderId>>
  >(readStoredProviders);

  function openUpgradeModal(model: PlanModelId = defaultModelId) {
    setUpgradeTargetModel(model);
    setIsUpgradeOpen(true);
    setIsModelMenuOpen(false);
  }

  function selectModel(model: PlanModelId, keepMenuOpen = false) {
    if (!allowedModels.includes(model)) {
      openUpgradeModal(model);
      return;
    }

    setSelectedModel(model);

    // Pemilih dua kolom memanggil ini dengan keepMenuOpen: memilih NAMA model
    // belum tentu keputusan akhir — pengguna mungkin mau ganti mesinnya juga.
    if (!keepMenuOpen) {
      setIsModelMenuOpen(false);
      setIsEffortMenuOpen(false);
    }
  }

  // Pilihan yang tersimpan bisa jadi menunjuk penyedia yang kuncinya SUDAH
  // dicabut lagi. Server tetap yang memutuskan, tapi UI tidak boleh memamerkan
  // mesin yang tidak akan dipakai — jadi di sini pun jatuh ke bawaan.
  function resolveProvider(model: PlanModelId): ModelProviderId {
    const stored = providerByModel[model];

    if (stored && availableProviders.includes(stored)) {
      return stored;
    }

    return availableProviders.includes(defaultModelProvider)
      ? defaultModelProvider
      : availableProviders[0] ?? defaultModelProvider;
  }

  function selectProvider(model: PlanModelId, provider: ModelProviderId) {
    if (!allowedModels.includes(model)) {
      openUpgradeModal(model);
      return;
    }

    // Penyedia tanpa mesin untuk model itu, atau tanpa kunci, tidak bisa
    // dipilih — barisnya memang dirender mati di menu.
    if (!getModelEngine(model, provider) || !availableProviders.includes(provider)) {
      return;
    }

    const next = { ...providerByModel, [model]: provider };
    setProviderByModel(next);
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(next));
    setSelectedModel(model);
    setIsModelMenuOpen(false);
    setIsEffortMenuOpen(false);
  }

  const selectedProvider = resolveProvider(selectedModel);
  const selectedModelInfo = modelCatalog[selectedModel];
  const selectedEngineLabel = resolveEngineLabel(selectedModel, selectedProvider);
  const upgradePlan = getUpgradePlanForModel(upgradeTargetModel);

  return {
    selectedModel,
    setSelectedModel,
    selectedProvider,
    selectedEngineLabel,
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

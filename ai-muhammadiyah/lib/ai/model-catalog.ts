import type { SubscriptionTier } from "@/lib/usage/limits";

export type ModelProviderId = "google" | "openai" | "anthropic";
export type CredentialMode = "platform" | "byok";
export type LegacyModelSlot = "aether" | "cosmos" | "prism" | "velo";
export type AiRoute = "fast" | "smart" | "document";

export type ModelCapabilities = {
  vision: boolean;
  tools: boolean;
  reasoning: boolean;
  webSearch: boolean;
};

export type ModelDefinition = {
  label: string;
  shortLabel: string;
  engineLabel: string;
  description: string;
  premiumLabel: string;
  minimumTier: SubscriptionTier;
  provider: ModelProviderId;
  apiModelId: string;
  legacySlot: LegacyModelSlot;
  route: AiRoute;
  capabilities: ModelCapabilities;
};

/**
 * Katalog model publik M-Agent.
 *
 * ID katalog selalu memuat provider dan ID API yang sebenarnya. Nama lama
 * Aether/Cosmos/Prism/Velo hanya tersisa sebagai `legacySlot` internal untuk
 * menjaga env dan fallback produksi yang sudah ada tetap kompatibel.
 */
export const modelCatalog = {
  "openai:gpt-5.6-sol": {
    label: "GPT-5.6 Sol",
    shortLabel: "GPT-5.6 Sol",
    engineLabel: "GPT-5.6 Sol",
    description: "Model OpenAI tercanggih untuk penalaran dan pekerjaan kompleks.",
    premiumLabel: "Muallim Pro",
    minimumTier: "muallim_pro",
    provider: "openai",
    apiModelId: "gpt-5.6-sol",
    legacySlot: "aether",
    route: "fast",
    capabilities: { vision: true, tools: true, reasoning: true, webSearch: false },
  },
  "openai:gpt-5.6-terra": {
    label: "GPT-5.6 Terra",
    shortLabel: "GPT-5.6 Terra",
    engineLabel: "GPT-5.6 Terra",
    description: "Model OpenAI seimbang untuk tugas harian dan analisis mendalam.",
    premiumLabel: "Muallim Pro",
    minimumTier: "muallim_pro",
    provider: "openai",
    apiModelId: "gpt-5.6-terra",
    legacySlot: "cosmos",
    route: "smart",
    capabilities: { vision: true, tools: true, reasoning: true, webSearch: false },
  },
  "openai:gpt-5.6-luna": {
    label: "GPT-5.6 Luna",
    shortLabel: "GPT-5.6 Luna",
    engineLabel: "GPT-5.6 Luna",
    description: "Model OpenAI yang tajam untuk belajar, strategi, dan analisis.",
    premiumLabel: "Included",
    minimumTier: "free",
    provider: "openai",
    apiModelId: "gpt-5.6-luna",
    legacySlot: "prism",
    route: "smart",
    capabilities: { vision: true, tools: true, reasoning: true, webSearch: false },
  },
  "openai:gpt-5.5-pro": {
    label: "GPT-5.5 Pro",
    shortLabel: "GPT-5.5 Pro",
    engineLabel: "GPT-5.5 Pro",
    description: "Model OpenAI untuk dokumen besar dan pekerjaan konteks panjang.",
    premiumLabel: "Included",
    minimumTier: "free",
    provider: "openai",
    apiModelId: "gpt-5.5-pro",
    legacySlot: "velo",
    route: "document",
    capabilities: { vision: true, tools: true, reasoning: true, webSearch: false },
  },
  "google:gemini-2.5-pro": {
    label: "Gemini 2.5 Pro",
    shortLabel: "Gemini 2.5 Pro",
    engineLabel: "Gemini 2.5 Pro",
    description: "Model Google untuk penalaran kompleks, multimodal, dan pencarian.",
    premiumLabel: "Muallim Pro",
    minimumTier: "muallim_pro",
    provider: "google",
    apiModelId: "gemini-2.5-pro",
    legacySlot: "aether",
    route: "smart",
    capabilities: { vision: true, tools: true, reasoning: true, webSearch: true },
  },
  "google:gemini-2.5-flash": {
    label: "Gemini 2.5 Flash",
    shortLabel: "Gemini 2.5 Flash",
    engineLabel: "Gemini 2.5 Flash",
    description: "Model Google yang cepat dan hemat untuk kebutuhan sehari-hari.",
    premiumLabel: "Included",
    minimumTier: "free",
    provider: "google",
    apiModelId: "gemini-2.5-flash",
    legacySlot: "prism",
    route: "fast",
    capabilities: { vision: true, tools: true, reasoning: true, webSearch: true },
  },
  "anthropic:claude-opus-4-1-20250805": {
    label: "Claude Opus 4.1",
    shortLabel: "Claude Opus 4.1",
    engineLabel: "Claude Opus 4.1",
    description: "Model Anthropic unggulan untuk analisis dan pekerjaan kompleks.",
    premiumLabel: "Muallim Pro",
    minimumTier: "muallim_pro",
    provider: "anthropic",
    apiModelId: "claude-opus-4-1-20250805",
    legacySlot: "aether",
    route: "smart",
    capabilities: { vision: true, tools: false, reasoning: true, webSearch: false },
  },
  "anthropic:claude-sonnet-4-20250514": {
    label: "Claude Sonnet 4",
    shortLabel: "Claude Sonnet 4",
    engineLabel: "Claude Sonnet 4",
    description: "Model Anthropic seimbang untuk coding, menulis, dan analisis.",
    premiumLabel: "Muallim Pro",
    minimumTier: "muallim_pro",
    provider: "anthropic",
    apiModelId: "claude-sonnet-4-20250514",
    legacySlot: "cosmos",
    route: "smart",
    capabilities: { vision: true, tools: false, reasoning: true, webSearch: false },
  },
  "anthropic:claude-3-7-sonnet-20250219": {
    label: "Claude 3.7 Sonnet",
    shortLabel: "Claude 3.7 Sonnet",
    engineLabel: "Claude 3.7 Sonnet",
    description: "Model Anthropic dengan penalaran kuat untuk tugas terstruktur.",
    premiumLabel: "Included",
    minimumTier: "free",
    provider: "anthropic",
    apiModelId: "claude-3-7-sonnet-20250219",
    legacySlot: "prism",
    route: "smart",
    capabilities: { vision: true, tools: false, reasoning: true, webSearch: false },
  },
  "anthropic:claude-3-5-haiku-20241022": {
    label: "Claude 3.5 Haiku",
    shortLabel: "Claude 3.5 Haiku",
    engineLabel: "Claude 3.5 Haiku",
    description: "Model Anthropic yang ringan dan cepat untuk tugas rutin.",
    premiumLabel: "Included",
    minimumTier: "free",
    provider: "anthropic",
    apiModelId: "claude-3-5-haiku-20241022",
    legacySlot: "velo",
    route: "fast",
    capabilities: { vision: true, tools: false, reasoning: false, webSearch: false },
  },
} as const satisfies Record<string, ModelDefinition>;

export type AiModelId = keyof typeof modelCatalog;
/** Nama lama tipe dipertahankan sementara agar refactor lintas UI tetap kecil. */
export type PlanModelId = AiModelId;

export const modelOptions = Object.keys(modelCatalog) as AiModelId[];
export const defaultModelId: AiModelId = "openai:gpt-5.6-luna";
export const defaultModelProvider: ModelProviderId = "openai";

export const modelProviderOrder: ModelProviderId[] = [
  "openai",
  "google",
  "anthropic",
];

export const modelProviderLabels: Record<ModelProviderId, string> = {
  google: "Google",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

export const credentialModeLabels: Record<CredentialMode, string> = {
  platform: "Kuota M-Agent",
  byok: "API key saya",
};

export function isModelId(value: unknown): value is AiModelId {
  return typeof value === "string" && value in modelCatalog;
}

export function normalizeModelId(value: unknown): AiModelId {
  return isModelId(value) ? value : defaultModelId;
}

export function normalizeCredentialMode(value: unknown): CredentialMode {
  return value === "byok" ? "byok" : "platform";
}

export function normalizeModelProvider(value: unknown): ModelProviderId {
  return value === "google" || value === "openai" || value === "anthropic"
    ? value
    : defaultModelProvider;
}

export function getModelDefinition(model: AiModelId) {
  return modelCatalog[model];
}

export function getModelProvider(model: AiModelId): ModelProviderId {
  return modelCatalog[model].provider;
}

export function getEquivalentModel(
  model: AiModelId,
  provider: ModelProviderId,
): AiModelId | null {
  const slot = modelCatalog[model].legacySlot;
  return (
    modelOptions.find(
      (candidate) =>
        modelCatalog[candidate].provider === provider &&
        modelCatalog[candidate].legacySlot === slot,
    ) ??
    modelOptions.find(
      (candidate) =>
        modelCatalog[candidate].provider === provider &&
        modelCatalog[candidate].route === modelCatalog[model].route,
    ) ??
    (provider === "google"
      ? "google:gemini-2.5-flash"
      : modelOptions.find(
          (candidate) => modelCatalog[candidate].provider === provider,
        )) ??
    null
  );
}

export function getModelsForProvider(provider: ModelProviderId) {
  return modelOptions.filter((model) => modelCatalog[model].provider === provider);
}

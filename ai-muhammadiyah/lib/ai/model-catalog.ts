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

function defineModel(
  provider: ModelProviderId,
  apiModelId: string,
  label: string,
  description: string,
  legacySlot: LegacyModelSlot,
  route: AiRoute,
  minimumTier: SubscriptionTier = "muallim_pro",
): ModelDefinition {
  return {
    label,
    shortLabel: label,
    engineLabel: label,
    description,
    premiumLabel: minimumTier === "free" ? "Included" : "Muallim Pro",
    minimumTier,
    provider,
    apiModelId,
    legacySlot,
    route,
    capabilities: {
      vision: true,
      tools: provider !== "anthropic",
      reasoning: !apiModelId.includes("nano"),
      webSearch: provider === "google",
    },
  };
}

/**
 * Katalog model publik M-Agent.
 *
 * ID katalog selalu memuat provider dan ID API yang sebenarnya. Nama lama
 * Aether/Cosmos/Prism/Velo hanya tersisa sebagai `legacySlot` internal untuk
 * menjaga env dan fallback produksi yang sudah ada tetap kompatibel.
 */
export const modelCatalog = {
  "openai:gpt-6-astra": defineModel(
    "openai",
    "gpt-6-astra",
    "GPT-6 Astra",
    "Model OpenAI terbaru untuk pekerjaan end-to-end paling sulit.",
    "aether",
    "smart",
  ),
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
  "openai:gpt-5.5": defineModel(
    "openai",
    "gpt-5.5",
    "GPT-5.5",
    "Model flagship untuk coding dan pekerjaan profesional kompleks.",
    "cosmos",
    "smart",
  ),
  "openai:gpt-5.4": defineModel(
    "openai",
    "gpt-5.4",
    "GPT-5.4",
    "Model profesional generasi sebelumnya dengan biaya lebih rendah.",
    "cosmos",
    "smart",
  ),
  "openai:gpt-5.4-pro": defineModel(
    "openai",
    "gpt-5.4-pro",
    "GPT-5.4 Pro",
    "Versi GPT-5.4 dengan compute lebih besar untuk jawaban presisi.",
    "aether",
    "smart",
  ),
  "openai:gpt-5.4-mini": defineModel(
    "openai",
    "gpt-5.4-mini",
    "GPT-5.4 Mini",
    "Model mini kuat untuk coding, tool use, dan tugas cepat.",
    "prism",
    "fast",
    "free",
  ),
  "openai:gpt-5.4-nano": defineModel(
    "openai",
    "gpt-5.4-nano",
    "GPT-5.4 Nano",
    "Model GPT-5.4 paling hemat untuk tugas sederhana berfrekuensi tinggi.",
    "velo",
    "fast",
    "free",
  ),
  "openai:gpt-5.3-codex": defineModel(
    "openai",
    "gpt-5.3-codex",
    "GPT-5.3 Codex",
    "Model agentic coding untuk pekerjaan software yang panjang.",
    "aether",
    "smart",
  ),
  "openai:gpt-5.2": defineModel(
    "openai",
    "gpt-5.2",
    "GPT-5.2",
    "Flagship sebelumnya untuk pekerjaan profesional dan reasoning.",
    "cosmos",
    "smart",
  ),
  "openai:gpt-5.2-pro": defineModel(
    "openai",
    "gpt-5.2-pro",
    "GPT-5.2 Pro",
    "Versi GPT-5.2 dengan compute lebih tinggi untuk tugas berat.",
    "aether",
    "smart",
  ),
  "openai:gpt-5.1": defineModel(
    "openai",
    "gpt-5.1",
    "GPT-5.1",
    "Model coding dan agentic generasi GPT-5.1.",
    "cosmos",
    "smart",
  ),
  "openai:gpt-5": defineModel(
    "openai",
    "gpt-5",
    "GPT-5",
    "Model reasoning GPT-5 untuk coding dan tugas agentic.",
    "cosmos",
    "smart",
  ),
  "openai:gpt-5-pro": defineModel(
    "openai",
    "gpt-5-pro",
    "GPT-5 Pro",
    "Versi GPT-5 dengan compute lebih besar untuk analisis sulit.",
    "aether",
    "smart",
  ),
  "openai:gpt-5-mini": defineModel(
    "openai",
    "gpt-5-mini",
    "GPT-5 Mini",
    "Model cepat dan hemat untuk beban kerja berjumlah besar.",
    "prism",
    "fast",
    "free",
  ),
  "openai:gpt-5-nano": defineModel(
    "openai",
    "gpt-5-nano",
    "GPT-5 Nano",
    "Model GPT-5 tercepat untuk tugas ringan.",
    "velo",
    "fast",
    "free",
  ),
  "openai:o3-pro": defineModel(
    "openai",
    "o3-pro",
    "o3 Pro",
    "Model reasoning dengan compute tinggi untuk masalah kompleks.",
    "aether",
    "smart",
  ),
  "openai:o3": defineModel(
    "openai",
    "o3",
    "o3",
    "Model reasoning untuk matematika, sains, coding, dan visual.",
    "cosmos",
    "smart",
  ),
  "openai:gpt-4.1-mini": defineModel(
    "openai",
    "gpt-4.1-mini",
    "GPT-4.1 Mini",
    "Model GPT-4.1 yang lebih kecil dan cepat.",
    "prism",
    "fast",
    "free",
  ),
  "openai:gpt-4o": defineModel(
    "openai",
    "gpt-4o",
    "GPT-4o",
    "Model multimodal fleksibel generasi GPT-4o.",
    "cosmos",
    "smart",
    "free",
  ),
  "openai:gpt-4o-mini": defineModel(
    "openai",
    "gpt-4o-mini",
    "GPT-4o Mini",
    "Model multimodal kecil untuk tugas fokus berbiaya rendah.",
    "velo",
    "fast",
    "free",
  ),
  "google:gemini-3.6-flash": defineModel(
    "google",
    "gemini-3.6-flash",
    "Gemini 3.6 Flash",
    "Model Gemini terbaru yang menyeimbangkan kecerdasan dan kecepatan.",
    "aether",
    "smart",
  ),
  "google:gemini-3.5-flash": defineModel(
    "google",
    "gemini-3.5-flash",
    "Gemini 3.5 Flash",
    "Model Gemini frontier untuk coding dan alur kerja agentic.",
    "aether",
    "smart",
  ),
  "google:gemini-3.5-flash-lite": defineModel(
    "google",
    "gemini-3.5-flash-lite",
    "Gemini 3.5 Flash-Lite",
    "Model Gemini cepat dan hemat untuk throughput tinggi.",
    "velo",
    "fast",
    "free",
  ),
  "google:gemini-3.1-pro-preview": defineModel(
    "google",
    "gemini-3.1-pro-preview",
    "Gemini 3.1 Pro",
    "Model preview untuk problem solving dan agentic reasoning kompleks.",
    "aether",
    "smart",
  ),
  "google:gemini-3-flash": defineModel(
    "google",
    "gemini-3-flash",
    "Gemini 3 Flash",
    "Model Gemini frontier yang cepat untuk tugas multimodal.",
    "cosmos",
    "fast",
  ),
  "google:gemini-3.1-flash-lite": defineModel(
    "google",
    "gemini-3.1-flash-lite",
    "Gemini 3.1 Flash-Lite",
    "Model ringan untuk ekstraksi data dan tugas sederhana.",
    "velo",
    "fast",
    "free",
  ),
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
  "google:gemini-2.5-flash-lite": defineModel(
    "google",
    "gemini-2.5-flash-lite",
    "Gemini 2.5 Flash-Lite",
    "Model Gemini 2.5 paling hemat untuk tugas berfrekuensi tinggi.",
    "velo",
    "fast",
    "free",
  ),
  "anthropic:claude-fable-5-1": defineModel(
    "anthropic",
    "claude-fable-5-1",
    "Claude Fable 5.1",
    "Model Claude paling mampu untuk reasoning dan pekerjaan agentic panjang.",
    "aether",
    "smart",
  ),
  "anthropic:claude-fable-5": defineModel(
    "anthropic",
    "claude-fable-5",
    "Claude Fable 5",
    "Model Claude frontier untuk riset, coding, dan knowledge work.",
    "aether",
    "smart",
  ),
  "anthropic:claude-opus-5": defineModel(
    "anthropic",
    "claude-opus-5",
    "Claude Opus 5",
    "Model Claude untuk coding agentic dan pekerjaan enterprise kompleks.",
    "aether",
    "smart",
  ),
  "anthropic:claude-sonnet-5": defineModel(
    "anthropic",
    "claude-sonnet-5",
    "Claude Sonnet 5",
    "Model Claude seimbang untuk coding, menulis, dan tugas sehari-hari.",
    "cosmos",
    "smart",
  ),
  "anthropic:claude-opus-4-8": defineModel(
    "anthropic",
    "claude-opus-4-8",
    "Claude Opus 4.8",
    "Model Opus generasi sebelumnya yang masih aktif.",
    "aether",
    "smart",
  ),
  "anthropic:claude-opus-4-7": defineModel(
    "anthropic",
    "claude-opus-4-7",
    "Claude Opus 4.7",
    "Model Opus untuk coding dan tugas kompleks jangka panjang.",
    "aether",
    "smart",
  ),
  "anthropic:claude-opus-4-6": defineModel(
    "anthropic",
    "claude-opus-4-6",
    "Claude Opus 4.6",
    "Model Opus aktif untuk reasoning dan analisis kompleks.",
    "aether",
    "smart",
  ),
  "anthropic:claude-opus-4-5-20251101": defineModel(
    "anthropic",
    "claude-opus-4-5-20251101",
    "Claude Opus 4.5",
    "Snapshot Opus 4.5 yang masih didukung Anthropic.",
    "aether",
    "smart",
  ),
  "anthropic:claude-sonnet-4-6": defineModel(
    "anthropic",
    "claude-sonnet-4-6",
    "Claude Sonnet 4.6",
    "Model Sonnet aktif dengan konteks panjang dan agent planning.",
    "cosmos",
    "smart",
  ),
  "anthropic:claude-sonnet-4-5-20250929": defineModel(
    "anthropic",
    "claude-sonnet-4-5-20250929",
    "Claude Sonnet 4.5",
    "Snapshot Sonnet 4.5 yang masih tersedia melalui Claude API.",
    "prism",
    "smart",
  ),
  "anthropic:claude-haiku-4-5-20251001": defineModel(
    "anthropic",
    "claude-haiku-4-5-20251001",
    "Claude Haiku 4.5",
    "Model Claude tercepat untuk tugas rutin dan volume tinggi.",
    "velo",
    "fast",
    "free",
  ),
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
  platform: "Model bawaan",
  byok: "API key saya",
};
export const credentialModeStorageKey = "ai-mu-credential-mode";

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
  if (modelCatalog[model].provider === provider) {
    return model;
  }

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

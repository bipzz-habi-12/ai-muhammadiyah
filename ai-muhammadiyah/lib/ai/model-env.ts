import {
  getEquivalentModel,
  modelCatalog,
  modelOptions,
  type LegacyModelSlot,
  type ModelProviderId,
  type PlanModelId,
} from "./model-catalog.ts";

/**
 * Satu tempat untuk SEMUA nama env kunci & id mesin — SERVER-ONLY.
 *
 * Polanya seragam untuk ketiga penyedia, jadi memasang mesin baru cukup
 * menempelkan dua baris env, tanpa menyentuh kode:
 *
 *   <PENYEDIA>_API_KEY_<MODEL>   kunci khusus model itu
 *   <PENYEDIA>_MODEL_<MODEL>     id mesin yang dipakai model itu
 *
 * dengan PENYEDIA = OPENAI | GEMINI | ANTHROPIC dan MODEL = AETHER | COSMOS |
 * PRISM | VELO. Contoh: `GEMINI_API_KEY_AETHER`, `ANTHROPIC_MODEL_VELO`.
 *
 * Kunci per model ada alasannya (Langkah 39): satu model yang kena rate limit
 * tidak ikut menjatuhkan tiga lainnya. Kalau tidak diisi, semuanya jatuh ke
 * kunci bersama penyedia itu (`OPENAI_API_KEY`, `GEMINI_API_KEY`,
 * `ANTHROPIC_API_KEY`) — jadi memasang satu kunci untuk semua model tetap sah.
 */

const modelEnvSuffix: Record<LegacyModelSlot, string> = {
  aether: "AETHER",
  cosmos: "COSMOS",
  prism: "PRISM",
  velo: "VELO",
};

/**
 * Empat id model asli yang masih boleh mewarisi `OPENAI_MODEL` /
 * `GEMINI_PRO_MODEL` / `GEMINI_FLASH_MODEL`. Model native baru memakai
 * `apiModelId` dari katalog — jangan sampai `OPENAI_MODEL=gpt-5.6-terra`
 * ikut menimpa GPT-6 Astra.
 */
const sharedModelIdFallbacks = new Set<PlanModelId>([
  "openai:gpt-5.6-sol",
  "openai:gpt-5.6-terra",
  "openai:gpt-5.6-luna",
  "openai:gpt-5.5-pro",
  "google:gemini-2.5-pro",
  "google:gemini-2.5-flash",
  "anthropic:claude-fable-5",
  "anthropic:claude-opus-5",
  "anthropic:claude-opus-4-8",
  "anthropic:claude-sonnet-5",
]);

const providerEnvPrefix: Record<ModelProviderId, string> = {
  openai: "OPENAI",
  google: "GEMINI",
  anthropic: "ANTHROPIC",
};

/** Kunci bersama satu penyedia — cadangan kalau kunci per model kosong. */
const providerSharedKeyEnv: Record<ModelProviderId, string> = {
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function nativeEnvSuffix(model: PlanModelId) {
  return modelCatalog[model].apiModelId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function slotKeyEnvName(provider: ModelProviderId, model: PlanModelId) {
  const slot = modelCatalog[model].legacySlot;
  return `${providerEnvPrefix[provider]}_API_KEY_${modelEnvSuffix[slot]}`;
}

function slotModelIdEnvName(provider: ModelProviderId, model: PlanModelId) {
  if (!sharedModelIdFallbacks.has(model)) {
    return "";
  }

  const slot = modelCatalog[model].legacySlot;
  return `${providerEnvPrefix[provider]}_MODEL_${modelEnvSuffix[slot]}`;
}

export function engineApiKeyEnvName(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  return `${providerEnvPrefix[provider]}_API_KEY_${nativeEnvSuffix(model)}`;
}

export function engineModelEnvName(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  return `${providerEnvPrefix[provider]}_MODEL_${nativeEnvSuffix(model)}`;
}

/**
 * Kunci request-scoped pengguna menang hanya bila diberikan secara eksplisit.
 * Selain itu gunakan kunci platform per model lalu kunci bersama.
 */
export function resolveEngineApiKey(
  provider: ModelProviderId,
  model: PlanModelId,
  userApiKey?: string,
) {
  if (userApiKey?.trim()) {
    return userApiKey.trim();
  }

  const equivalentModel = getEquivalentModel(model, provider);
  if (!equivalentModel) {
    return "";
  }

  return (
    readEnv(engineApiKeyEnvName(provider, equivalentModel)) ||
    readEnv(slotKeyEnvName(provider, equivalentModel)) ||
    readEnv(providerSharedKeyEnv[provider])
  );
}

/**
 * Id mesin per model. Urutan: env per model → env lama milik penyedia (dijaga
 * supaya pemasangan yang sudah jalan tidak rusak) → bawaan. "" = belum ada id
 * yang bisa dipakai, dan pemanggilnya harus memperlakukan mesin itu sebagai
 * belum terpasang.
 */
export function resolveEngineModelId(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  const equivalentModel = getEquivalentModel(model, provider);
  if (!equivalentModel) {
    return "";
  }
  const oldModelEnv = slotModelIdEnvName(provider, equivalentModel);
  const perModel =
    readEnv(engineModelEnvName(provider, equivalentModel)) ||
    (oldModelEnv ? readEnv(oldModelEnv) : "");

  if (perModel) {
    return perModel.replace(/^models\//, "");
  }

  const catalogModelId = modelCatalog[equivalentModel].apiModelId;

  if (
    provider === "openai" &&
    sharedModelIdFallbacks.has(equivalentModel)
  ) {
    return readEnv("OPENAI_MODEL") || catalogModelId;
  }

  if (
    provider === "google" &&
    sharedModelIdFallbacks.has(equivalentModel)
  ) {
    const slot = modelCatalog[equivalentModel].legacySlot;
    const legacy =
      slot === "aether"
        ? readEnv("GEMINI_PRO_MODEL")
        : readEnv("GEMINI_FLASH_MODEL") || readEnv("GEMINI_MODEL");

    return (legacy || catalogModelId).replace(/^models\//, "");
  }

  return catalogModelId;
}

/** Mesin itu bisa dipakai kalau kunci DAN id modelnya sama-sama ada. */
export function isEngineConfigured(
  provider: ModelProviderId,
  model: PlanModelId,
  userApiKey?: string,
) {
  return Boolean(
    resolveEngineApiKey(provider, model, userApiKey) &&
      resolveEngineModelId(provider, model),
  );
}

/** True kalau penyedia itu punya SETIDAKNYA satu model miliknya yang ber-key. */
export function isProviderEngineConfigured(provider: ModelProviderId) {
  return modelOptions.some(
    (model) =>
      modelCatalog[model].provider === provider &&
      isEngineConfigured(provider, model),
  );
}

export function listConfiguredEngineModels(): PlanModelId[] {
  return modelOptions.filter((model) =>
    isEngineConfigured(modelCatalog[model].provider, model),
  );
}

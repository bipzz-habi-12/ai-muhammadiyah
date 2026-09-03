import type {
  ModelProviderId,
  PlanModelId,
} from "@/lib/subscriptions/plans";

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

const modelEnvSuffix: Record<PlanModelId, string> = {
  aether: "AETHER",
  cosmos: "COSMOS",
  prism: "PRISM",
  velo: "VELO",
};

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

/**
 * Id mesin bawaan kalau env-nya belum diisi.
 *
 * Anthropic SENGAJA kosong: id model Claude belum pernah diverifikasi di
 * proyek ini, dan menebaknya berarti mengirim id karangan ke API. Selama
 * `ANTHROPIC_MODEL_<MODEL>` kosong, model itu dianggap belum terpasang.
 */
const defaultEngineIds: Record<
  ModelProviderId,
  Partial<Record<PlanModelId, string>>
> = {
  openai: {
    aether: "gpt-5.6-sol",
    cosmos: "gpt-5.6-terra",
    prism: "gpt-5.6-luna",
    velo: "gpt-5.5-pro",
  },
  google: {
    // Aether memakai jalur Pro, tiga sisanya Flash — sama dengan peta mesin di
    // lib/subscriptions/plans.ts.
    aether: "gemini-2.5-pro",
    cosmos: "gemini-2.5-flash",
    prism: "gemini-2.5-flash",
    velo: "gemini-2.5-flash",
  },
  anthropic: {},
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function engineApiKeyEnvName(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  return `${providerEnvPrefix[provider]}_API_KEY_${modelEnvSuffix[model]}`;
}

export function engineModelEnvName(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  return `${providerEnvPrefix[provider]}_MODEL_${modelEnvSuffix[model]}`;
}

/** Kunci per model dulu, lalu kunci bersama penyedia. "" = belum terpasang. */
export function resolveEngineApiKey(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  return (
    readEnv(engineApiKeyEnvName(provider, model)) ||
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
  const perModel = readEnv(engineModelEnvName(provider, model));

  if (perModel) {
    return perModel.replace(/^models\//, "");
  }

  if (provider === "openai") {
    return readEnv("OPENAI_MODEL") || defaultEngineIds.openai[model] || "";
  }

  if (provider === "google") {
    const legacy =
      model === "aether"
        ? readEnv("GEMINI_PRO_MODEL")
        : readEnv("GEMINI_FLASH_MODEL") || readEnv("GEMINI_MODEL");

    return (legacy || defaultEngineIds.google[model] || "").replace(
      /^models\//,
      "",
    );
  }

  return defaultEngineIds.anthropic[model] ?? "";
}

/** Mesin itu bisa dipakai kalau kunci DAN id modelnya sama-sama ada. */
export function isEngineConfigured(
  provider: ModelProviderId,
  model: PlanModelId,
) {
  return Boolean(
    resolveEngineApiKey(provider, model) && resolveEngineModelId(provider, model),
  );
}

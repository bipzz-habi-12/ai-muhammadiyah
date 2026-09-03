import { contextWindowTokens } from "@/lib/ai/context-window";

import type { ModelProviderId } from "@/lib/subscriptions/plans";

export type SubscriptionTier =
  | "free"
  | "kader_pintar"
  | "muallim_pro"
  | "dakwah_digital"
  | "sinergi_ranting";

export type UsageAction = "message" | "document_upload";

/** Dua jendela berjalan ala Claude: sesi 5 jam + jatah mingguan. */
export type UsageWindowKey = "session" | "weekly";

export const usageWindowLabels: Record<UsageWindowKey, string> = {
  session: "5 jam",
  weekly: "mingguan",
};

export type UsageWindow = {
  limit: number;
  used: number;
  remaining: number;
  /** 0-100, dibulatkan. Ini yang ditampilkan di UI. */
  percentUsed: number;
  percentRemaining: number;
  /** ISO timestamp; null = jendela belum berjalan (belum ada pemakaian). */
  resetsAt: string | null;
};

export type UsageSnapshot = {
  tier: SubscriptionTier;
  allowedModels: string[];
  /**
   * Penyedia model yang kuncinya benar-benar terpasang di server (Langkah 54).
   * Dihitung di `/api/usage`, bukan dari RPC — klien memakainya untuk mematikan
   * baris penyedia di pemilih model, dan server tetap memvalidasi ulang.
   */
  availableProviders: ModelProviderId[];
  contextWindowTokens: number;
  /** Satu meteran untuk semua pemakaian: TOKEN (pesan & upload sekaligus). */
  tokens: Record<UsageWindowKey, UsageWindow>;
};

export const tierLabels: Record<SubscriptionTier, string> = {
  free: "Free",
  kader_pintar: "Kader Pintar",
  muallim_pro: "Muallim Pro",
  dakwah_digital: "Dakwah Digital",
  sinergi_ranting: "Sinergi Ranting",
};

export const sessionWindowHours = 5;
export const weeklyWindowDays = 7;

/**
 * Kuota dihitung langsung dalam TOKEN, granular apa adanya (1001, 1003, ...),
 * bukan dibulatkan ke unit. Batas per tier = batas unit lama x 4000 token,
 * jadi daya beli tiap paket tidak berubah — hanya satuannya yang jujur.
 */
export type TierLimits = {
  sessionTokenLimit: number;
  weeklyTokenLimit: number;
  allowedModels: string[];
};

export const tierLimits: Record<SubscriptionTier, TierLimits> = {
  free: {
    sessionTokenLimit: 160_000,
    weeklyTokenLimit: 960_000,
    allowedModels: ["prism", "velo"],
  },
  kader_pintar: {
    sessionTokenLimit: 800_000,
    weeklyTokenLimit: 5_600_000,
    allowedModels: ["prism", "velo"],
  },
  muallim_pro: {
    sessionTokenLimit: 2_400_000,
    weeklyTokenLimit: 16_000_000,
    allowedModels: ["aether", "cosmos", "prism", "velo"],
  },
  dakwah_digital: {
    sessionTokenLimit: 4_800_000,
    weeklyTokenLimit: 32_000_000,
    allowedModels: ["aether", "cosmos", "prism", "velo"],
  },
  sinergi_ranting: {
    sessionTokenLimit: 16_000_000,
    weeklyTokenLimit: 112_000_000,
    allowedModels: ["aether", "cosmos", "prism", "velo"],
  },
};

/**
 * Batas jembatan sinkronisasi Logseq, per paket.
 *
 * Dua sumbu, karena keduanya membatasi hal yang berbeda:
 *   - `requestsPerHour` menjaga server dari agen yang salah setel (mis. loop
 *     tiap detik). Nyaris tidak terasa dalam pemakaian wajar: interval 5 menit
 *     hanya menghabiskan 12 dari 60 jatah paket Gratis.
 *   - `notesPerDay` membatasi biaya yang sebenarnya, yaitu embedding — tiap
 *     catatan yang masuk memicu satu panggilan embedding.
 *
 * Paket Gratis sengaja diberi jatah lapang: 300 catatan/hari cukup untuk
 * mengimpor graf berukuran wajar dan menyinkronkannya seharian penuh. Yang
 * dibatasi adalah penyalahgunaan, bukan pemakaian normal.
 */
export type SyncTierLimits = {
  requestsPerHour: number;
  notesPerDay: number;
};

export const syncTierLimits: Record<SubscriptionTier, SyncTierLimits> = {
  free: { requestsPerHour: 60, notesPerDay: 300 },
  kader_pintar: { requestsPerHour: 180, notesPerDay: 1_500 },
  muallim_pro: { requestsPerHour: 600, notesPerDay: 6_000 },
  dakwah_digital: { requestsPerHour: 1_200, notesPerDay: 20_000 },
  sinergi_ranting: { requestsPerHour: 2_400, notesPerDay: 60_000 },
};

export function getSyncTierLimits(tier: SubscriptionTier) {
  return syncTierLimits[tier] ?? syncTierLimits.free;
}

function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  if (
    value === "kader_pintar" ||
    value === "muallim_pro" ||
    value === "dakwah_digital" ||
    value === "sinergi_ranting"
  ) {
    return value;
  }

  return "free";
}

function getPositiveNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function getNonNegativeNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function getSnapshotValue(
  snapshot: Record<string, unknown>,
  snakeCaseKey: string,
  camelCaseKey: string,
) {
  return snapshot[snakeCaseKey] ?? snapshot[camelCaseKey];
}

function getIsoString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildUsageWindow(
  limit: number,
  used: number,
  resetsAt: string | null,
): UsageWindow {
  const safeLimit = Math.max(limit, 1);
  const safeUsed = Math.max(used, 0);
  const percentUsed = Math.min(100, Math.round((safeUsed / safeLimit) * 100));

  return {
    limit: safeLimit,
    used: safeUsed,
    remaining: Math.max(safeLimit - safeUsed, 0),
    percentUsed,
    percentRemaining: 100 - percentUsed,
    resetsAt,
  };
}

export function estimateTokenUsage(...parts: string[]) {
  const characters = parts.reduce((total, part) => total + part.length, 0);

  return Math.max(1, Math.ceil(characters / 4));
}

/**
 * Toleran terhadap RPC versi lama: kalau kolom jendela belum ada (migrasi belum
 * di-apply), snapshot tetap terbentuk memakai batas dari `tierLimits` dengan
 * pemakaian 0 — UI tidak pecah, cuma angkanya belum hidup.
 */
export function normalizeUsageSnapshot(value: unknown): UsageSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const tier = normalizeSubscriptionTier(snapshot.tier);
  const fallback = tierLimits[tier];

  const rawAllowedModels = getSnapshotValue(
    snapshot,
    "allowed_models",
    "allowedModels",
  );
  const allowedModels = Array.isArray(rawAllowedModels)
    ? rawAllowedModels.map(String)
    : fallback.allowedModels;

  const rawProviders = getSnapshotValue(
    snapshot,
    "available_providers",
    "availableProviders",
  );
  // Tanpa daftar dari server, anggap hanya OpenAI yang hidup — itu perilaku
  // sebelum Langkah 54, jadi kegagalan membaca tidak pernah membuka penyedia.
  const availableProviders = (
    Array.isArray(rawProviders) ? rawProviders : ["openai"]
  ).filter(
    (provider): provider is ModelProviderId =>
      provider === "google" || provider === "openai" || provider === "anthropic",
  );

  const sessionTokenLimit = getPositiveNumber(
    getSnapshotValue(snapshot, "session_token_limit", "sessionTokenLimit"),
    fallback.sessionTokenLimit,
  );
  const weeklyTokenLimit = getPositiveNumber(
    getSnapshotValue(snapshot, "weekly_token_limit", "weeklyTokenLimit"),
    fallback.weeklyTokenLimit,
  );

  const sessionTokensUsed = getNonNegativeNumber(
    getSnapshotValue(snapshot, "session_tokens_used", "sessionTokensUsed"),
  );
  const weeklyTokensUsed = getNonNegativeNumber(
    getSnapshotValue(snapshot, "weekly_tokens_used", "weeklyTokensUsed"),
  );

  const sessionResetsAt = getIsoString(
    getSnapshotValue(snapshot, "session_resets_at", "sessionResetsAt"),
  );
  const weeklyResetsAt = getIsoString(
    getSnapshotValue(snapshot, "weekly_resets_at", "weeklyResetsAt"),
  );

  return {
    tier,
    allowedModels: allowedModels.length ? allowedModels : fallback.allowedModels,
    availableProviders,
    contextWindowTokens: getPositiveNumber(
      getSnapshotValue(snapshot, "context_window_tokens", "contextWindowTokens"),
      contextWindowTokens,
    ),
    tokens: {
      session: buildUsageWindow(
        sessionTokenLimit,
        sessionTokensUsed,
        sessionResetsAt,
      ),
      weekly: buildUsageWindow(
        weeklyTokenLimit,
        weeklyTokensUsed,
        weeklyResetsAt,
      ),
    },
  };
}

/** Jendela yang paling mepet — itu yang benar-benar membatasi user. */
export function getTightestWindow(
  windows: Record<UsageWindowKey, UsageWindow>,
): { key: UsageWindowKey; window: UsageWindow } {
  return windows.session.percentUsed >= windows.weekly.percentUsed
    ? { key: "session", window: windows.session }
    : { key: "weekly", window: windows.weekly };
}

export function hasQuota(windows: Record<UsageWindowKey, UsageWindow>) {
  return windows.session.remaining > 0 && windows.weekly.remaining > 0;
}

export function formatResetCountdown(resetsAt: string | null) {
  if (!resetsAt) {
    return "belum berjalan";
  }

  const diffMs = new Date(resetsAt).getTime() - Date.now();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "segera reset";
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}h ${hours}j lagi`;
  }

  if (hours > 0) {
    return `${hours}j ${minutes}m lagi`;
  }

  return `${minutes}m lagi`;
}

export async function fetchUsageSnapshot() {
  const response = await fetch("/api/usage", {
    method: "GET",
    cache: "no-store",
  });
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData.error ?? "Status penggunaan belum bisa dimuat.");
  }

  return normalizeUsageSnapshot(data);
}

export function getLimitErrorMessage(error: string | undefined) {
  if (error === "session_token_limit_exceeded") {
    return `Kuota token ${sessionWindowHours} jam terakhir sudah habis. Tunggu jendela berikutnya atau upgrade paket.`;
  }

  if (error === "weekly_token_limit_exceeded") {
    return "Kuota token mingguan paket kamu sudah habis. Tunggu reset mingguan atau upgrade paket.";
  }

  if (error === "model_not_allowed") {
    return "Model ini belum tersedia untuk paket kamu.";
  }

  return "Pemakaian belum bisa diproses. Silakan coba lagi.";
}

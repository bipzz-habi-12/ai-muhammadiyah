export type SubscriptionTier =
  | "free"
  | "kader_pintar"
  | "muallim_pro"
  | "dakwah_digital"
  | "sinergi_ranting";

export type UsageAction = "message" | "document_upload";

export type UsageSnapshot = {
  tier: SubscriptionTier;
  dailyMessageLimit: number;
  dailyUploadLimit: number;
  messagesUsedToday: number;
  uploadsUsedToday: number;
  remainingMessagesToday: number;
  remainingUploadsToday: number;
  allowedModels: string[];
};

export const tierLabels: Record<SubscriptionTier, string> = {
  free: "Free",
  kader_pintar: "Kader Pintar",
  muallim_pro: "Muallim Pro",
  dakwah_digital: "Dakwah Digital",
  sinergi_ranting: "Sinergi Ranting",
};

const tierLimitFallbacks: Record<
  SubscriptionTier,
  Pick<
    UsageSnapshot,
    "dailyMessageLimit" | "dailyUploadLimit" | "allowedModels"
  >
> = {
  free: {
    dailyMessageLimit: 20,
    dailyUploadLimit: 3,
    allowedModels: ["auto", "fast"],
  },
  kader_pintar: {
    dailyMessageLimit: 100,
    dailyUploadLimit: 10,
    allowedModels: ["auto", "fast", "smart"],
  },
  muallim_pro: {
    dailyMessageLimit: 300,
    dailyUploadLimit: 30,
    allowedModels: ["auto", "fast", "smart", "document"],
  },
  dakwah_digital: {
    dailyMessageLimit: 600,
    dailyUploadLimit: 60,
    allowedModels: ["auto", "fast", "smart", "document"],
  },
  sinergi_ranting: {
    dailyMessageLimit: 2000,
    dailyUploadLimit: 200,
    allowedModels: ["auto", "fast", "smart", "document"],
  },
};

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

export function estimateTokenUsage(...parts: string[]) {
  const characters = parts.reduce((total, part) => total + part.length, 0);

  return Math.max(1, Math.ceil(characters / 4));
}

export function normalizeUsageSnapshot(value: unknown): UsageSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const tier = normalizeSubscriptionTier(snapshot.tier);
  const fallback = tierLimitFallbacks[tier];
  const dailyMessageLimit = getPositiveNumber(
    getSnapshotValue(snapshot, "daily_message_limit", "dailyMessageLimit"),
    fallback.dailyMessageLimit,
  );
  const dailyUploadLimit = getPositiveNumber(
    getSnapshotValue(snapshot, "daily_upload_limit", "dailyUploadLimit"),
    fallback.dailyUploadLimit,
  );
  const messagesUsedToday = getNonNegativeNumber(
    getSnapshotValue(snapshot, "messages_used_today", "messagesUsedToday"),
  );
  const uploadsUsedToday = getNonNegativeNumber(
    getSnapshotValue(snapshot, "uploads_used_today", "uploadsUsedToday"),
  );
  const rawAllowedModels = getSnapshotValue(
    snapshot,
    "allowed_models",
    "allowedModels",
  );
  const allowedModels = Array.isArray(rawAllowedModels)
    ? rawAllowedModels.map(String)
    : fallback.allowedModels;

  return {
    tier,
    dailyMessageLimit,
    dailyUploadLimit,
    messagesUsedToday,
    uploadsUsedToday,
    remainingMessagesToday: Math.max(dailyMessageLimit - messagesUsedToday, 0),
    remainingUploadsToday: Math.max(dailyUploadLimit - uploadsUsedToday, 0),
    allowedModels: allowedModels.length ? allowedModels : fallback.allowedModels,
  };
}

export function getLimitErrorMessage(error: string | undefined) {
  if (error === "daily_message_limit_exceeded") {
    return "Limit pesan harian paket kamu sudah habis. Silakan coba lagi besok atau upgrade paket.";
  }

  if (error === "daily_upload_limit_exceeded") {
    return "Limit upload dokumen harian paket kamu sudah habis. Silakan coba lagi besok atau upgrade paket.";
  }

  if (error === "model_not_allowed") {
    return "Model ini belum tersedia untuk paket kamu. Paket Free hanya dapat memakai Auto / Free Model dan Fast Model.";
  }

  return "Pemakaian belum bisa diproses. Silakan coba lagi.";
}

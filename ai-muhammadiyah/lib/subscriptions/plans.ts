import { tierLabels, type SubscriptionTier } from "@/lib/usage/limits";

export type PlanModelId = "auto" | "fast" | "smart" | "document";

export type SubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  price: string;
  tagline: string;
  sessionTokenLimit: number;
  weeklyTokenLimit: number;
  modelNames: string[];
  modelBadges: string[];
  isGptPowered: boolean;
  allowedModels: PlanModelId[];
  features: string[];
  quotas: string[];
};

export const planOrder: SubscriptionTier[] = [
  "free",
  "kader_pintar",
  "muallim_pro",
  "dakwah_digital",
  "sinergi_ranting",
];

export const modelCatalog: Record<
  PlanModelId,
  {
    label: string;
    shortLabel: string;
    description: string;
    premiumLabel: string;
    minimumTier: SubscriptionTier;
  }
> = {
  auto: {
    label: "Auto / Free Model",
    shortLabel: "Auto",
    description: "Memilih rute tercepat yang tersedia untuk paket kamu.",
    premiumLabel: "Included",
    minimumTier: "free",
  },
  fast: {
    label: "Fast Model",
    shortLabel: "Fast",
    description: "Rute cepat untuk obrolan belajar harian.",
    premiumLabel: "Included",
    minimumTier: "free",
  },
  smart: {
    label: "GPT-5.6 Terra Smart",
    shortLabel: "Smart",
    description: "Rute GPT-5.6 Terra untuk penalaran, strategi, dan analisis.",
    premiumLabel: "Included",
    minimumTier: "free",
  },
  document: {
    label: "Document Model",
    shortLabel: "Document",
    description:
      "Rute konteks panjang untuk analisis dokumen (GPT-5.6 Terra, cadangan Gemini 2.5 Pro).",
    premiumLabel: "Konteks panjang",
    minimumTier: "muallim_pro",
  },
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    tier: "free",
    name: tierLabels.free,
    price: "Rp0",
    tagline: "Mulai belajar dengan AI-mu.",
    sessionTokenLimit: 160_000,
    weeklyTokenLimit: 960_000,
    modelNames: ["GPT-5.6 Terra", "Auto", "Fast", "Smart"],
    modelBadges: ["Includes GPT-5.6 Terra"],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart"],
    features: [
      "Chat AI streaming ditenagai GPT-5.6 Terra",
      "Riwayat obrolan tersimpan",
      "Upload dokumen dasar",
      "Quick Explain dan Cambridge Tutor Basic",
    ],
    quotas: ["160rb token / 5 jam", "960rb token / minggu"],
  },
  {
    tier: "kader_pintar",
    name: tierLabels.kader_pintar,
    price: "Rp29.000",
    tagline: "Untuk kader dan pelajar aktif.",
    sessionTokenLimit: 800_000,
    weeklyTokenLimit: 5_600_000,
    modelNames: ["GPT-5.6 Terra", "Auto", "Fast", "Smart"],
    modelBadges: ["Includes GPT-5.6 Terra", "Kuota lebih besar"],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart"],
    features: [
      "Akses Smart Model",
      "Kuota 5 jam & mingguan lebih besar untuk belajar intensif",
      "Rute GPT-5.6 Terra untuk penalaran mendalam",
      "OSN Coach, Research Mode, Advanced Cambridge, dan Full Step-by-Step",
    ],
    quotas: ["800rb token / 5 jam", "5,6jt token / minggu"],
  },
  {
    tier: "muallim_pro",
    name: tierLabels.muallim_pro,
    price: "Rp79.000",
    tagline: "Untuk guru, mentor, dan pembimbing.",
    sessionTokenLimit: 2_400_000,
    weeklyTokenLimit: 16_000_000,
    modelNames: ["GPT-5.6 Terra", "Document", "Gemini 2.5 Pro (cadangan)"],
    modelBadges: ["Includes GPT-5.6 Terra", "Rute Document konteks panjang"],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart", "document"],
    features: [
      "Akses Document Model",
      "Rute konteks panjang untuk dokumen besar",
      "Rute GPT-5.6 Terra untuk materi ajar dan kajian",
      "Study Modes premium untuk guru dan mentor",
    ],
    quotas: ["2,4jt token / 5 jam", "16jt token / minggu"],
  },
  {
    tier: "dakwah_digital",
    name: tierLabels.dakwah_digital,
    price: "Rp149.000",
    tagline: "Untuk konten, dakwah, dan publikasi.",
    sessionTokenLimit: 4_800_000,
    weeklyTokenLimit: 32_000_000,
    modelNames: ["GPT-5.6 Terra", "Voice-ready routing", "Document"],
    modelBadges: [
      "Includes GPT-5.6 Terra",
      "Rute Document konteks panjang",
      "Voice routing ready",
    ],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart", "document"],
    features: [
      "Routing GPT-5.6 Terra untuk naskah dan ide konten",
      "Rute siap voice untuk fitur suara berikutnya",
      "Kuota besar untuk tim konten kecil",
      "Study Modes premium untuk riset, coding, dan OSN",
    ],
    quotas: ["4,8jt token / 5 jam", "32jt token / minggu"],
  },
  {
    tier: "sinergi_ranting",
    name: tierLabels.sinergi_ranting,
    price: "Rp299.000",
    tagline: "Untuk ranting, sekolah, dan tim bersama.",
    sessionTokenLimit: 16_000_000,
    weeklyTokenLimit: 112_000_000,
    modelNames: ["Full premium routing", "GPT-5.6 Terra", "Document"],
    modelBadges: [
      "Includes GPT-5.6 Terra",
      "Rute Document konteks panjang",
      "Full routing access",
    ],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart", "document"],
    features: [
      "Semua model bersama untuk tim",
      "Kuota tertinggi untuk aktivitas organisasi",
      "Placeholder administrasi upgrade manual",
      "Semua Study Modes untuk sekolah dan tim",
    ],
    quotas: ["16jt token / 5 jam", "112jt token / minggu"],
  },
];

export function getPlanByTier(tier: SubscriptionTier) {
  return (
    subscriptionPlans.find((plan) => plan.tier === tier) ??
    subscriptionPlans[0]
  );
}

export function getUpgradePlanForModel(model: PlanModelId) {
  return getPlanByTier(modelCatalog[model].minimumTier);
}

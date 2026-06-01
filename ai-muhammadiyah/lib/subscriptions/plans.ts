import { tierLabels, type SubscriptionTier } from "@/lib/usage/limits";

export type PlanModelId = "auto" | "fast" | "smart" | "document";

export type SubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  price: string;
  tagline: string;
  dailyMessageLimit: number;
  dailyUploadLimit: number;
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
    description: "Gemini Flash untuk obrolan belajar harian yang cepat.",
    premiumLabel: "Included",
    minimumTier: "free",
  },
  smart: {
    label: "GPT-5 mini Smart",
    shortLabel: "Smart",
    description: "Rute GPT-5 mini untuk penalaran, strategi, dan analisis.",
    premiumLabel: "GPT premium",
    minimumTier: "kader_pintar",
  },
  document: {
    label: "Gemini 2.5 Pro Document",
    shortLabel: "Document",
    description: "Gemini 2.5 Pro untuk analisis dokumen dan konteks panjang.",
    premiumLabel: "Gemini Pro",
    minimumTier: "muallim_pro",
  },
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    tier: "free",
    name: tierLabels.free,
    price: "Rp0",
    tagline: "Mulai belajar dengan AI-mu.",
    dailyMessageLimit: 20,
    dailyUploadLimit: 3,
    modelNames: ["Gemini Flash", "Auto", "Fast"],
    modelBadges: ["Gemini Flash only"],
    isGptPowered: false,
    allowedModels: ["auto", "fast"],
    features: [
      "Chat AI streaming",
      "Riwayat obrolan tersimpan",
      "Upload dokumen dasar",
      "Quick Explain dan Cambridge Tutor Basic",
    ],
    quotas: ["20 pesan per hari", "3 upload dokumen per hari"],
  },
  {
    tier: "kader_pintar",
    name: tierLabels.kader_pintar,
    price: "Rp29.000",
    tagline: "Untuk kader dan pelajar aktif.",
    dailyMessageLimit: 100,
    dailyUploadLimit: 10,
    modelNames: ["Gemini Flash", "GPT-5 mini limited", "Auto", "Fast"],
    modelBadges: ["Includes GPT-5 mini", "Gemini Flash"],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart"],
    features: [
      "Akses Smart Model",
      "Rute Gemini Flash untuk jawaban cepat",
      "Rute GPT mini untuk penalaran ringan",
      "OSN Coach, Research Mode, Advanced Cambridge, dan Full Step-by-Step",
    ],
    quotas: ["100 pesan per hari", "10 upload dokumen per hari"],
  },
  {
    tier: "muallim_pro",
    name: tierLabels.muallim_pro,
    price: "Rp79.000",
    tagline: "Untuk guru, mentor, dan pembimbing.",
    dailyMessageLimit: 300,
    dailyUploadLimit: 30,
    modelNames: ["Gemini 2.5 Pro", "GPT-5 mini", "Fast"],
    modelBadges: ["Includes GPT-5 mini", "Includes Gemini 2.5 Pro"],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart", "document"],
    features: [
      "Akses Document Model",
      "Rute Gemini Pro untuk dokumen panjang",
      "Rute GPT premium untuk materi ajar dan kajian",
      "Study Modes premium untuk guru dan mentor",
    ],
    quotas: ["300 pesan per hari", "30 upload dokumen per hari"],
  },
  {
    tier: "dakwah_digital",
    name: tierLabels.dakwah_digital,
    price: "Rp149.000",
    tagline: "Untuk konten, dakwah, dan publikasi.",
    dailyMessageLimit: 600,
    dailyUploadLimit: 60,
    modelNames: ["GPT-5 mini", "Voice-ready routing", "Gemini 2.5 Pro"],
    modelBadges: [
      "Includes GPT-5 mini",
      "Includes Gemini 2.5 Pro",
      "Voice routing ready",
    ],
    isGptPowered: true,
    allowedModels: ["auto", "fast", "smart", "document"],
    features: [
      "Routing GPT untuk naskah dan ide konten",
      "Rute siap voice untuk fitur suara berikutnya",
      "Kuota besar untuk tim konten kecil",
      "Study Modes premium untuk riset, coding, dan OSN",
    ],
    quotas: ["600 pesan per hari", "60 upload dokumen per hari"],
  },
  {
    tier: "sinergi_ranting",
    name: tierLabels.sinergi_ranting,
    price: "Rp299.000",
    tagline: "Untuk ranting, sekolah, dan tim bersama.",
    dailyMessageLimit: 2000,
    dailyUploadLimit: 200,
    modelNames: ["Full premium routing", "GPT-5 mini", "Gemini 2.5 Pro"],
    modelBadges: [
      "Includes GPT-5 mini",
      "Includes Gemini 2.5 Pro",
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
    quotas: ["2.000 pesan per hari", "200 upload dokumen per hari"],
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

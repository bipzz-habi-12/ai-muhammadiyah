import { tierLabels, type SubscriptionTier } from "@/lib/usage/limits";
import {
  defaultModelId,
  defaultModelProvider,
  getEquivalentModel,
  modelCatalog,
  modelOptions,
  modelProviderLabels,
  modelProviderOrder,
  normalizeModelProvider,
  type ModelProviderId,
  type PlanModelId,
} from "@/lib/ai/model-catalog";

export {
  defaultModelId,
  defaultModelProvider,
  modelCatalog,
  modelOptions,
  modelProviderLabels,
  modelProviderOrder,
  normalizeModelProvider,
};
export type { CredentialMode, ModelProviderId, PlanModelId } from "@/lib/ai/model-catalog";

/**
 * Level "Upaya". Makin tinggi levelnya, makin dalam model berpikir dan makin
 * panjang jawabannya — artinya makin banyak token terpakai, jadi kuota token
 * (jendela 5 jam / mingguan) habis lebih cepat. Efeknya nyata di sisi provider,
 * bukan sekadar label.
 */
export type EffortLevel = "low" | "medium" | "high" | "extra" | "ultra";

export const effortLevels: {
  id: EffortLevel;
  label: string;
  description: string;
  isDefault?: boolean;
}[] = [
  {
    id: "low",
    label: "Rendah",
    description:
      "Berpikir seperlunya, jawaban ringkas. Paling hemat kuota.",
  },
  {
    id: "medium",
    label: "Sedang",
    description:
      "Berpikir cukup dalam untuk kebanyakan tugas. Pilihan seimbang.",
    isDefault: true,
  },
  {
    id: "high",
    label: "Tinggi",
    description:
      "Berpikir lebih lama untuk soal rumit dan analisis bertahap.",
  },
  {
    id: "extra",
    label: "Ekstra",
    description:
      "Berpikir jauh lebih lama dan menyeluruh. Kuota terpakai lebih cepat.",
  },
  {
    id: "ultra",
    label: "Ultra",
    description:
      "Upaya maksimal: paling menyeluruh, paling lama, paling boros kuota.",
  },
];

export const defaultEffortLevel: EffortLevel = "medium";

export function normalizeEffortLevel(value: unknown): EffortLevel {
  return effortLevels.some((level) => level.id === value)
    ? (value as EffortLevel)
    : defaultEffortLevel;
}

export function getEffortLabel(effort: EffortLevel) {
  return (
    effortLevels.find((level) => level.id === effort)?.label ??
    effortLevels[1].label
  );
}

export type SubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  /** Label harga siap tampil, diturunkan dari `priceIdr`. */
  price: string;
  /** Harga bulanan dalam rupiah penuh. Ini yang dipakai Stripe Checkout. */
  priceIdr: number;
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

/** "Rp29.000" — dipakai kartu harga dan ringkasan checkout. */
export function formatIdrPrice(amount: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(Math.round(amount))}`;
}

export const planOrder: SubscriptionTier[] = [
  "free",
  "kader_pintar",
  "muallim_pro",
  "dakwah_digital",
  "sinergi_ranting",
];

const includedPlatformModels = modelOptions.filter(
  (model) => modelCatalog[model].minimumTier === "free",
);
const allPlatformModels = [...modelOptions];

export type ModelEngine = {
  provider: ModelProviderId;
  /** Nama mesin yang ditampilkan, mis. "Gemini 3.1 Pro". */
  engineLabel: string;
};

export const modelEngines = Object.fromEntries(
  modelOptions.map((model) => [
    model,
    modelProviderOrder.flatMap((provider) => {
      const equivalent = getEquivalentModel(model, provider);
      return equivalent
        ? [{ provider, engineLabel: modelCatalog[equivalent].label }]
        : [];
    }),
  ]),
) as Record<PlanModelId, ModelEngine[]>;

export function getModelEngine(
  model: PlanModelId,
  provider: ModelProviderId,
): ModelEngine | null {
  const equivalent = getEquivalentModel(model, provider);
  return equivalent
    ? { provider, engineLabel: modelCatalog[equivalent].label }
    : null;
}

/**
 * Label mesin yang benar-benar dipakai. Kalau penyedia pilihan pengguna tidak
 * punya padanan untuk model itu, jatuh ke OpenAI — sama dengan yang dilakukan
 * server saat merutekan.
 */
export function resolveEngineLabel(
  model: PlanModelId,
  provider: ModelProviderId,
) {
  return getModelEngine(model, provider)?.engineLabel ?? modelCatalog[model].label;
}

/**
 * Fitur diskusi antar-AI. Belum aktif — ditampilkan di pemilih model sebagai
 * entri "segera hadir" (tidak bisa dipilih), bukan halaman terpisah.
 */
export const aiDiscussion = {
  label: "AI Discussion",
  description: "Dua model berdiskusi untuk menajamkan jawaban.",
  comingSoonLabel: "Segera hadir",
  isAvailable: false,
} as const;

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    tier: "free",
    name: tierLabels.free,
    price: formatIdrPrice(0),
    priceIdr: 0,
    tagline: "Mulai belajar dengan M-Agent.",
    sessionTokenLimit: 160_000,
    weeklyTokenLimit: 960_000,
    modelNames: ["GPT-5.6 Luna", "GPT-5.5 Pro", "Gemini 2.5 Flash", "Claude cepat"],
    modelBadges: ["GPT-5.6 Luna", "Pilihan model asli"],
    isGptPowered: true,
    allowedModels: includedPlatformModels,
    features: [
      "Chat AI streaming dengan model asli dari penyedia",
      "Riwayat obrolan tersimpan",
      "Upload dokumen dasar",
      "Skill bawaan siap pakai lewat perintah /",
    ],
    quotas: ["160rb token / 5 jam", "960rb token / minggu"],
  },
  {
    tier: "kader_pintar",
    name: tierLabels.kader_pintar,
    price: formatIdrPrice(29_000),
    priceIdr: 29_000,
    tagline: "Untuk kader dan pelajar aktif.",
    sessionTokenLimit: 800_000,
    weeklyTokenLimit: 5_600_000,
    modelNames: ["GPT-5.6 Luna", "GPT-5.5 Pro", "Gemini 2.5 Flash", "Claude cepat"],
    modelBadges: ["Model included", "Kuota lebih besar"],
    isGptPowered: true,
    allowedModels: includedPlatformModels,
    features: [
      "Akses model included OpenAI, Google, dan Anthropic",
      "Kuota 5 jam & mingguan lebih besar untuk belajar intensif",
      "Upaya tinggi untuk penalaran mendalam",
      "Skill custom tanpa batas + upaya tinggi",
    ],
    quotas: ["800rb token / 5 jam", "5,6jt token / minggu"],
  },
  {
    tier: "muallim_pro",
    name: tierLabels.muallim_pro,
    price: formatIdrPrice(79_000),
    priceIdr: 79_000,
    tagline: "Untuk guru, mentor, dan pembimbing.",
    sessionTokenLimit: 2_400_000,
    weeklyTokenLimit: 16_000_000,
    modelNames: modelOptions.map((model) => modelCatalog[model].label),
    modelBadges: ["Semua model platform", "Model unggulan"],
    isGptPowered: true,
    allowedModels: allPlatformModels,
    features: [
      "Buka GPT-5.6 Sol, GPT-5.6 Terra, Gemini Pro, dan Claude unggulan",
      "Pilihan model untuk dokumen besar dan riset konteks panjang",
      "Skill domain untuk guru dan mentor",
    ],
    quotas: ["2,4jt token / 5 jam", "16jt token / minggu"],
  },
  {
    tier: "dakwah_digital",
    name: tierLabels.dakwah_digital,
    price: formatIdrPrice(149_000),
    priceIdr: 149_000,
    tagline: "Untuk konten, dakwah, dan publikasi.",
    sessionTokenLimit: 4_800_000,
    weeklyTokenLimit: 32_000_000,
    modelNames: modelOptions.map((model) => modelCatalog[model].label),
    modelBadges: [
      "Includes GPT-5.6 Terra",
      "Model konteks panjang",
      "Voice routing ready",
    ],
    isGptPowered: true,
    allowedModels: allPlatformModels,
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
    price: formatIdrPrice(299_000),
    priceIdr: 299_000,
    tagline: "Untuk ranting, sekolah, dan tim bersama.",
    sessionTokenLimit: 16_000_000,
    weeklyTokenLimit: 112_000_000,
    modelNames: modelOptions.map((model) => modelCatalog[model].label),
    modelBadges: [
      "Includes GPT-5.6 Terra",
      "Model konteks panjang",
      "Full routing access",
    ],
    isGptPowered: true,
    allowedModels: allPlatformModels,
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

/** Semua tier selain Free bisa dibeli lewat Stripe Checkout. */
export const purchasableTiers = planOrder.filter(
  (tier) => tier !== "free",
) as Exclude<SubscriptionTier, "free">[];

export type PurchasableTier = (typeof purchasableTiers)[number];

export function isPurchasableTier(value: unknown): value is PurchasableTier {
  return (
    typeof value === "string" &&
    (purchasableTiers as string[]).includes(value)
  );
}

/** Urutan tier: dipakai untuk membedakan upgrade dari downgrade. */
export function getTierRank(tier: SubscriptionTier) {
  const index = planOrder.indexOf(tier);

  return index === -1 ? 0 : index;
}

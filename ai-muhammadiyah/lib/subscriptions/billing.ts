import type { SubscriptionTier } from "@/lib/usage/limits";

// Bentuk data billing yang dipakai BERSAMA client & server. File ini sengaja
// bebas dari SDK Stripe dan dari env server — komponen client boleh
// mengimpornya. Semua yang menyentuh secret key ada di
// `lib/subscriptions/stripe.ts` (server-only).

/** Status langganan Stripe, apa adanya seperti yang dikirim Stripe. */
export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type BillingSubscription = {
  tier: SubscriptionTier;
  status: BillingSubscriptionStatus;
  /** ISO timestamp akhir periode berjalan; null kalau Stripe belum mengisi. */
  currentPeriodEnd: string | null;
  /** true = langganan berhenti di akhir periode, belum berhenti sekarang. */
  cancelAtPeriodEnd: boolean;
  /** true = status ini masih memberi akses premium. */
  isEntitled: boolean;
};

export type BillingState = {
  tier: SubscriptionTier;
  /** true kalau user sudah punya customer Stripe (syarat buka billing portal). */
  hasStripeCustomer: boolean;
  subscription: BillingSubscription | null;
  /** false = env Stripe belum diisi, jadi tombol bayar harus mati. */
  isStripeConfigured: boolean;
};

export const emptyBillingState: BillingState = {
  tier: "free",
  hasStripeCustomer: false,
  subscription: null,
  isStripeConfigured: false,
};

const billingStatuses: BillingSubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
];

function normalizeTier(value: unknown): SubscriptionTier {
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

function normalizeStatus(value: unknown): BillingSubscriptionStatus {
  return billingStatuses.includes(value as BillingSubscriptionStatus)
    ? (value as BillingSubscriptionStatus)
    : "canceled";
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Toleran seperti `normalizeUsageSnapshot`: kalau migrasi Stripe belum
 * di-apply dan RPC `get_billing_state` belum ada, UI tetap dapat state kosong
 * (tombol bayar mati) alih-alih meledak.
 */
export function normalizeBillingState(
  value: unknown,
  isStripeConfigured: boolean,
): BillingState {
  if (!value || typeof value !== "object") {
    return { ...emptyBillingState, isStripeConfigured };
  }

  const raw = value as Record<string, unknown>;
  const rawSubscription = raw.subscription;

  const subscription =
    rawSubscription && typeof rawSubscription === "object"
      ? (rawSubscription as Record<string, unknown>)
      : null;

  return {
    tier: normalizeTier(raw.tier),
    hasStripeCustomer: Boolean(
      raw.has_stripe_customer ?? raw.hasStripeCustomer,
    ),
    subscription: subscription
      ? {
          tier: normalizeTier(subscription.tier),
          status: normalizeStatus(subscription.status),
          currentPeriodEnd: normalizeIsoDate(
            subscription.current_period_end ?? subscription.currentPeriodEnd,
          ),
          cancelAtPeriodEnd: Boolean(
            subscription.cancel_at_period_end ??
              subscription.cancelAtPeriodEnd,
          ),
          isEntitled: Boolean(
            subscription.is_entitled ?? subscription.isEntitled,
          ),
        }
      : null,
    isStripeConfigured,
  };
}

/** true = perlu tombol "Kelola langganan" (billing portal), bukan checkout. */
export function canManageBilling(state: BillingState) {
  return state.isStripeConfigured && state.hasStripeCustomer;
}

export function formatBillingDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

/** Kalimat status langganan untuk ditampilkan di kartu paket & Settings. */
export function describeBillingSubscription(state: BillingState) {
  const subscription = state.subscription;

  if (!subscription) {
    return null;
  }

  const periodEnd = formatBillingDate(subscription.currentPeriodEnd);

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    return "Pembayaran terakhir gagal. Perbarui metode pembayaran supaya paket tetap aktif.";
  }

  if (subscription.status === "incomplete") {
    return "Pembayaran belum selesai. Selesaikan dari halaman kelola langganan.";
  }

  if (!subscription.isEntitled) {
    return periodEnd
      ? `Langganan berakhir ${periodEnd}. Paket kembali ke Free.`
      : "Langganan sudah berakhir. Paket kembali ke Free.";
  }

  if (subscription.cancelAtPeriodEnd) {
    return periodEnd
      ? `Aktif sampai ${periodEnd}, lalu berhenti otomatis.`
      : "Aktif sampai akhir periode, lalu berhenti otomatis.";
  }

  return periodEnd ? `Perpanjang otomatis ${periodEnd}.` : null;
}

/** Aksi yang boleh dilakukan tombol pada satu kartu paket. */
export type BillingAction =
  | { kind: "none"; label: string }
  | { kind: "checkout"; label: string }
  | { kind: "switch"; label: string }
  | { kind: "portal"; label: string };

/**
 * Satu tempat memutuskan tombol paket, dipakai halaman /plans dan UpgradeModal
 * supaya keduanya tidak bisa berbeda pendapat.
 *
 * Aturan yang paling penting: user yang SUDAH punya langganan aktif tidak
 * pernah diarahkan ke Checkout. Checkout mode subscription selalu membuat
 * langganan baru, jadi "upgrade" lewat checkout = dua langganan berjalan dan
 * dua tagihan tiap bulan.
 */
export function resolveBillingAction({
  planTier,
  planName,
  currentTier,
  state,
  tierRank,
}: {
  planTier: SubscriptionTier;
  planName: string;
  currentTier: SubscriptionTier;
  state: BillingState;
  /** Peringkat tier, untuk membedakan naik vs turun paket. */
  tierRank: (tier: SubscriptionTier) => number;
}): BillingAction {
  const isCurrent = planTier === currentTier;
  const hasSubscription = Boolean(state.subscription);
  const isEntitled = Boolean(state.subscription?.isEntitled);
  const canOpenPortal = state.isStripeConfigured && hasSubscription;

  if (planTier === "free") {
    if (isCurrent) {
      return { kind: "none", label: "Paket kamu saat ini" };
    }

    // Turun ke Free = membatalkan langganan, dan itu dilakukan di portal Stripe.
    return canOpenPortal
      ? { kind: "portal", label: "Kelola langganan" }
      : { kind: "none", label: "Selalu gratis" };
  }

  if (!state.isStripeConfigured) {
    return { kind: "none", label: "Segera hadir" };
  }

  if (isCurrent) {
    return canOpenPortal
      ? { kind: "portal", label: "Kelola langganan" }
      : { kind: "none", label: "Paket kamu saat ini" };
  }

  if (isEntitled) {
    return {
      kind: "switch",
      label:
        tierRank(planTier) < tierRank(currentTier)
          ? "Turunkan ke paket ini"
          : "Naik ke paket ini",
    };
  }

  return { kind: "checkout", label: `Pilih ${planName}` };
}

export type CheckoutResponse = { url?: string; error?: string };

async function postBilling(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await response.json()) as CheckoutResponse;

  if (!response.ok || !data.url) {
    throw new Error(data.error ?? "Pembayaran belum bisa dibuka. Coba lagi.");
  }

  return data.url;
}

export function startCheckout(tier: SubscriptionTier) {
  return postBilling("/api/billing/checkout", { tier });
}

export function openBillingPortal() {
  return postBilling("/api/billing/portal");
}

/** Ganti paket pada langganan yang sudah berjalan (tanpa meninggalkan app). */
export async function changePlan(tier: SubscriptionTier) {
  const response = await fetch("/api/billing/change-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });
  const data = (await response.json()) as { error?: string; changed?: boolean };

  if (!response.ok || !data.changed) {
    throw new Error(data.error ?? "Paket belum bisa diubah. Coba lagi.");
  }

  return true;
}

export async function fetchBillingState(): Promise<BillingState | null> {
  const response = await fetch("/api/billing/state", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    billing?: unknown;
    isStripeConfigured?: boolean;
  };

  return normalizeBillingState(
    data.billing,
    Boolean(data.isStripeConfigured),
  );
}

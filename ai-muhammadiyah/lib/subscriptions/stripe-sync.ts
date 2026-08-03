import type Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getStripeClient,
  getStripeCustomerId,
  resolveCurrentPeriod,
  resolveSubscriptionTier,
  toIsoOrNull,
} from "@/lib/subscriptions/stripe";

// SERVER-ONLY. Satu-satunya tempat status langganan Stripe diterjemahkan
// menjadi tier di database. Dipakai oleh webhook (jalur utama) dan oleh
// /api/billing/sync (jaring pengaman setelah user kembali dari Checkout,
// supaya paket tetap naik walau webhook telat atau belum dipasang).

/** Status yang diterima constraint `subscriptions_status_check`. */
const knownStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

export type SyncResult =
  | { ok: true; tier: string; status: string; entitled: boolean }
  | { ok: false; reason: string };

function normalizeStatus(status: string) {
  return knownStatuses.has(status) ? status : "canceled";
}

/**
 * Subscription yang sudah membawa item + price. Event webhook umumnya sudah
 * menyertakan items, tapi price.product belum tentu ter-expand — kita ambil
 * ulang saat tier tidak bisa ditentukan dari data yang ada.
 */
async function ensureExpandedSubscription(subscription: Stripe.Subscription) {
  if (resolveSubscriptionTier(subscription)) {
    return subscription;
  }

  return getStripeClient().subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price.product"],
  });
}

async function resolveUserId(
  subscription: Stripe.Subscription,
  customerId: string | null,
) {
  const fromMetadata = subscription.metadata?.user_id?.trim();

  if (fromMetadata) {
    return fromMetadata;
  }

  if (!customerId) {
    return null;
  }

  // Fallback: langganan yang dibuat langsung dari Dashboard tidak punya
  // metadata kita, tapi customer-nya sudah tercatat saat checkout pertama.
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Stripe sync: customer lookup failed:", error);

    return null;
  }

  return data?.user_id ?? null;
}

export async function syncStripeSubscription(
  input: Stripe.Subscription,
): Promise<SyncResult> {
  const subscription = await ensureExpandedSubscription(input);
  const customerId = getStripeCustomerId(subscription.customer);
  const userId = await resolveUserId(subscription, customerId);

  if (!userId) {
    return { ok: false, reason: "user_not_resolved" };
  }

  const tier = resolveSubscriptionTier(subscription);

  if (!tier) {
    // Menebak tier di sini berarti memberi akses yang belum tentu dibayar.
    return { ok: false, reason: "tier_not_resolved" };
  }

  const period = resolveCurrentPeriod(subscription);
  const status = normalizeStatus(subscription.status);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.rpc("apply_stripe_subscription", {
    p_user_id: userId,
    p_tier: tier,
    p_status: status,
    p_stripe_subscription_id: subscription.id,
    p_stripe_customer_id: customerId,
    p_stripe_price_id: subscription.items?.data?.[0]?.price?.id ?? null,
    p_current_period_start: period.start,
    p_current_period_end: period.end,
    p_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    p_canceled_at: toIsoOrNull(subscription.canceled_at),
  });

  if (error) {
    console.error("Stripe sync: apply_stripe_subscription failed:", error);

    throw new Error("Gagal menyimpan status langganan.");
  }

  return {
    ok: true,
    tier,
    status,
    entitled: status === "active" || status === "trialing",
  };
}

export async function syncStripeSubscriptionById(subscriptionId: string) {
  const subscription = await getStripeClient().subscriptions.retrieve(
    subscriptionId,
    { expand: ["items.data.price.product"] },
  );

  return syncStripeSubscription(subscription);
}

/** Simpan customer id ke profil (dipakai saat checkout membuat customer baru). */
export async function persistStripeCustomerId(
  userId: string,
  customerId: string,
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ stripe_customer_id: customerId })
    .eq("user_id", userId);

  if (error) {
    console.error("Stripe: failed to persist customer id:", error);
  }
}

/** Customer id tersimpan milik user, kalau ada. */
export async function findStripeCustomerId(userId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Stripe: failed to read customer id:", error);

    return null;
  }

  return data?.stripe_customer_id ?? null;
}

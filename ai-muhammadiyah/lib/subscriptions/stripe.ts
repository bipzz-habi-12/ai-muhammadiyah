import Stripe from "stripe";
import {
  getPlanByTier,
  purchasableTiers,
  type PurchasableTier,
} from "@/lib/subscriptions/plans";
import type { SubscriptionTier } from "@/lib/usage/limits";

// SERVER-ONLY. Modul ini membaca STRIPE_SECRET_KEY — jangan pernah diimpor
// dari komponen client (pola sama seperti `lib/supabase/server.ts`).

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

/**
 * Mata uang presentasi. Default IDR karena semua harga paket ditulis dalam
 * rupiah. Bisa ditimpa lewat env kalau akun Stripe-nya tidak bisa menagih IDR
 * — tapi kalau ditimpa, WAJIB pasang STRIPE_PRICE_* juga, karena angka rupiah
 * di `plans.ts` tidak otomatis dikonversi.
 */
const currency = (process.env.STRIPE_CURRENCY?.trim() || "idr").toLowerCase();

/**
 * Stripe menagih dalam satuan terkecil. Sebagian besar mata uang punya 2
 * desimal (Rp29.000 -> 2900000), sebagian tidak punya desimal sama sekali
 * (JPY 100 -> 100). Salah di sini = salah tagih 100x, jadi daftarnya eksplisit.
 * Sumber: daftar zero-decimal currencies Stripe.
 */
const zeroDecimalCurrencies = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const priceEnvKeys: Record<PurchasableTier, string> = {
  kader_pintar: "STRIPE_PRICE_KADER_PINTAR",
  muallim_pro: "STRIPE_PRICE_MUALLIM_PRO",
  dakwah_digital: "STRIPE_PRICE_DAKWAH_DIGITAL",
  sinergi_ranting: "STRIPE_PRICE_SINERGI_RANTING",
};

let cachedClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(secretKey);
}

export function isStripeWebhookConfigured() {
  return Boolean(webhookSecret);
}

export function getStripeClient() {
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!cachedClient) {
    // apiVersion sengaja tidak dipaksa: SDK sudah mengunci versi yang cocok
    // dengan tipe TypeScript-nya sendiri.
    cachedClient = new Stripe(secretKey, {
      appInfo: { name: "AI Muhammadiyah", url: "https://aimuhammadiyah.my.id" },
    });
  }

  return cachedClient;
}

export function getStripeWebhookSecret() {
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return webhookSecret;
}

export function getStripeCurrency() {
  return currency;
}

export function toStripeAmount(amountIdr: number) {
  const whole = Math.round(amountIdr);

  return zeroDecimalCurrencies.has(currency) ? whole : whole * 100;
}

export function getConfiguredPriceId(tier: PurchasableTier) {
  return process.env[priceEnvKeys[tier]]?.trim() || null;
}

/** Product id deterministik supaya tidak pernah ada produk kembar per tier. */
function getProductId(tier: PurchasableTier) {
  return `aimu_plan_${tier}`;
}

/**
 * Lookup key ikut memuat nominal: kalau harga paket diubah di `plans.ts`, key
 * ikut berubah sehingga Price BARU yang dibuat — bukan diam-diam memakai Price
 * lama dengan harga usang.
 */
function getPriceLookupKey(tier: PurchasableTier, unitAmount: number) {
  return `aimu_${tier}_monthly_${currency}_${unitAmount}`;
}

const resolvedPriceIds = new Map<PurchasableTier, string>();

async function ensureTierProduct(tier: PurchasableTier) {
  const stripe = getStripeClient();
  const productId = getProductId(tier);
  const plan = getPlanByTier(tier);

  try {
    const existing = await stripe.products.retrieve(productId);

    if (!existing.deleted) {
      return existing.id;
    }
  } catch {
    // Belum ada — lanjut membuatnya di bawah.
  }

  try {
    const created = await stripe.products.create({
      id: productId,
      name: `AI Muhammadiyah — ${plan.name}`,
      description: plan.tagline,
      metadata: { tier },
    });

    return created.id;
  } catch (error) {
    // Dua request bersamaan bisa sama-sama mencoba membuat; yang kalah cukup
    // memakai produk yang sudah jadi.
    if (
      error instanceof Error &&
      /already exists/i.test(error.message)
    ) {
      return productId;
    }

    throw error;
  }
}

/**
 * Price id yang dipakai Checkout dan penggantian paket.
 *
 * STRIPE_PRICE_<TIER> selalu menang kalau diisi (jalur produksi: katalog
 * dikelola di Dashboard). Kalau kosong, Price dibuat sekali lewat API dan
 * dipakai ulang lewat `lookup_key` — bukan `price_data` inline, karena
 * `subscriptions.update` (ganti paket dengan prorata) hanya menerima Price id,
 * jadi harga inline akan membuat upgrade/downgrade mustahil.
 */
export async function resolveTierPriceId(
  tier: PurchasableTier,
): Promise<string> {
  const configured = getConfiguredPriceId(tier);

  if (configured) {
    return configured;
  }

  const cached = resolvedPriceIds.get(tier);

  if (cached) {
    return cached;
  }

  const stripe = getStripeClient();
  const unitAmount = toStripeAmount(getPlanByTier(tier).priceIdr);
  const lookupKey = getPriceLookupKey(tier, unitAmount);

  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });

  if (existing.data[0]) {
    resolvedPriceIds.set(tier, existing.data[0].id);

    return existing.data[0].id;
  }

  try {
    const price = await stripe.prices.create({
      currency,
      unit_amount: unitAmount,
      recurring: { interval: "month" },
      product: await ensureTierProduct(tier),
      lookup_key: lookupKey,
      metadata: { tier },
    });

    resolvedPriceIds.set(tier, price.id);

    return price.id;
  } catch (error) {
    // Balapan pada lookup_key: ambil ulang yang sudah dibuat request lain.
    const retry = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    if (retry.data[0]) {
      resolvedPriceIds.set(tier, retry.data[0].id);

      return retry.data[0].id;
    }

    throw error;
  }
}

export async function buildLineItem(
  tier: PurchasableTier,
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  return { price: await resolveTierPriceId(tier), quantity: 1 };
}

/** Peta price id -> tier, untuk webhook saat metadata tidak terbawa. */
export function getTierByPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  return (
    purchasableTiers.find(
      (tier) =>
        getConfiguredPriceId(tier) === priceId ||
        resolvedPriceIds.get(tier) === priceId,
    ) ?? null
  );
}

function normalizeTier(value: unknown): SubscriptionTier | null {
  if (
    value === "free" ||
    value === "kader_pintar" ||
    value === "muallim_pro" ||
    value === "dakwah_digital" ||
    value === "sinergi_ranting"
  ) {
    return value;
  }

  return null;
}

/**
 * Tier dari sebuah subscription Stripe. Urutan sengaja: metadata dulu (kita
 * yang menulisnya saat checkout, jadi paling dapat dipercaya), baru peta price
 * id, baru metadata produk. Kalau ketiganya gagal, kembalikan null — jangan
 * menebak, karena salah tebak = user dapat tier yang tidak dibayar.
 */
export function resolveSubscriptionTier(
  subscription: Stripe.Subscription,
): SubscriptionTier | null {
  const fromMetadata = normalizeTier(subscription.metadata?.tier);

  if (fromMetadata) {
    return fromMetadata;
  }

  const item = subscription.items?.data?.[0];
  const fromPrice = getTierByPriceId(item?.price?.id);

  if (fromPrice) {
    return fromPrice;
  }

  // Price yang dibuat otomatis membawa metadata tier — ini yang menyelamatkan
  // webhook setelah cold start, saat cache price id di memori sudah kosong.
  const fromPriceMetadata = normalizeTier(item?.price?.metadata?.tier);

  if (fromPriceMetadata) {
    return fromPriceMetadata;
  }

  const product = item?.price?.product;
  const productMetadata =
    product && typeof product === "object" && !("deleted" in product)
      ? product.metadata
      : null;

  return normalizeTier(productMetadata?.tier);
}

/**
 * Akhir periode berjalan. Di versi API Stripe saat ini `current_period_end`
 * TIDAK lagi ada di objek Subscription — ia pindah ke tiap subscription item,
 * jadi ambilnya dari item (yang paling jauh, kalau ada beberapa).
 */
export function resolveCurrentPeriod(subscription: Stripe.Subscription) {
  const items = subscription.items?.data ?? [];

  let start: number | null = null;
  let end: number | null = null;

  for (const item of items) {
    if (
      typeof item.current_period_start === "number" &&
      (start === null || item.current_period_start < start)
    ) {
      start = item.current_period_start;
    }

    if (
      typeof item.current_period_end === "number" &&
      (end === null || item.current_period_end > end)
    ) {
      end = item.current_period_end;
    }
  }

  return {
    start: start === null ? null : new Date(start * 1000).toISOString(),
    end: end === null ? null : new Date(end * 1000).toISOString(),
  };
}

export function toIsoOrNull(seconds: number | null | undefined) {
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : null;
}

export function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

/**
 * URL dasar aplikasi untuk success/cancel/return URL. Env diutamakan supaya
 * host dari request tidak dipakai mentah-mentah sebagai target redirect.
 */
export function getAppOrigin(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const origin = request.headers.get("origin");

  if (origin && /^https?:\/\//.test(origin)) {
    return origin.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}

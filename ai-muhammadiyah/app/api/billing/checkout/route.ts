import { NextResponse } from "next/server";
import { isPurchasableTier, getPlanByTier } from "@/lib/subscriptions/plans";
import {
  findStripeCustomerId,
  persistStripeCustomerId,
} from "@/lib/subscriptions/stripe-sync";
import {
  buildLineItem,
  getAppOrigin,
  getStripeClient,
  isStripeConfigured,
} from "@/lib/subscriptions/stripe";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

// POST /api/billing/checkout -> buka Stripe Checkout untuk satu paket berbayar.
//
// Tier TIDAK diambil dari body untuk menentukan harga secara langsung: body
// hanya memilih paket, sedangkan harga selalu dibentuk server dari `plans.ts`
// atau dari Price id di env. Jadi client tidak bisa menawar harganya sendiri.

type CheckoutBody = { tier?: unknown };

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Pembayaran belum diaktifkan di server." },
        { status: 503 },
      );
    }

    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutBody;

    if (!isPurchasableTier(body.tier)) {
      return NextResponse.json(
        { error: "Paket tidak dikenali." },
        { status: 400 },
      );
    }

    const tier = body.tier;
    const plan = getPlanByTier(tier);
    const stripe = getStripeClient();

    // Pakai kembali customer yang sudah ada supaya riwayat pembayaran user
    // tidak terpecah jadi beberapa customer di Stripe.
    let customerId = await findStripeCustomerId(user.id);

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });

      customerId = customer.id;
      await persistStripeCustomerId(user.id, customerId);
    }

    const origin = getAppOrigin(request);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [await buildLineItem(tier)],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "id",
      success_url: `${origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancel`,
      metadata: { user_id: user.id, tier },
      // Metadata di subscription-nya sendiri: ini yang dibaca webhook untuk
      // tahu siapa pemiliknya dan paket apa, termasuk pada event perpanjangan
      // berbulan-bulan kemudian yang tidak lagi menyertakan session.
      subscription_data: {
        metadata: { user_id: user.id, tier },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe tidak mengembalikan URL pembayaran." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url, tier, plan: plan.name });
  } catch (error) {
    console.error("Stripe checkout failed:", error);

    return NextResponse.json(
      { error: "Halaman pembayaran belum bisa dibuka. Coba lagi." },
      { status: 500 },
    );
  }
}

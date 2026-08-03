import { NextResponse } from "next/server";
import { isPurchasableTier } from "@/lib/subscriptions/plans";
import { syncStripeSubscription } from "@/lib/subscriptions/stripe-sync";
import {
  getStripeClient,
  isStripeConfigured,
  resolveTierPriceId,
} from "@/lib/subscriptions/stripe";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

// POST /api/billing/change-plan -> pindah paket pada langganan yang SUDAH ada.
//
// Kenapa bukan Checkout lagi: Checkout mode subscription selalu MEMBUAT
// langganan baru. Kalau user yang sudah berlangganan menekan "upgrade" lalu
// checkout ulang, ia akan ditagih dua kali untuk dua langganan sekaligus.
// Di sini item langganan yang ada diganti harganya dan Stripe menghitung
// prorata-nya sendiri.

type ChangePlanBody = { tier?: unknown };

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

    const body = (await request.json().catch(() => ({}))) as ChangePlanBody;

    if (!isPurchasableTier(body.tier)) {
      return NextResponse.json(
        { error: "Paket tidak dikenali." },
        { status: 400 },
      );
    }

    const tier = body.tier;

    // Langganan diambil dari DB dengan klien ber-RLS: baris yang terbaca pasti
    // milik user yang sedang login, jadi tidak mungkin mengubah langganan
    // orang lain dengan menebak id.
    const { data: subscriptionRow, error: lookupError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, tier, status")
      .eq("user_id", user.id)
      .eq("provider", "stripe")
      .in("status", ["active", "trialing"])
      .not("stripe_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("Change plan: subscription lookup failed:", lookupError);

      return NextResponse.json(
        { error: "Status langganan belum bisa dibaca." },
        { status: 500 },
      );
    }

    if (!subscriptionRow?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Belum ada langganan aktif untuk diubah." },
        { status: 400 },
      );
    }

    if (subscriptionRow.tier === tier) {
      return NextResponse.json(
        { error: "Paket ini sudah aktif." },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionRow.stripe_subscription_id,
    );
    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json(
        { error: "Langganan tidak punya item yang bisa diubah." },
        { status: 409 },
      );
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: currentItem.id, price: await resolveTierPriceId(tier) }],
      // Prorata dibuat sekarang; selisihnya ikut di tagihan berikutnya.
      proration_behavior: "create_prorations",
      metadata: { ...subscription.metadata, user_id: user.id, tier },
    });

    // Tulis langsung, jangan menunggu webhook: user sedang menatap layar dan
    // harus langsung melihat paket barunya.
    const result = await syncStripeSubscription(updated);

    if (!result.ok) {
      console.error("Change plan: sync failed:", result.reason);

      return NextResponse.json(
        { error: "Paket sudah diubah di Stripe, tapi status belum tersimpan." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      changed: true,
      tier: result.tier,
      status: result.status,
    });
  } catch (error) {
    console.error("Change plan failed:", error);

    return NextResponse.json(
      { error: "Paket belum bisa diubah. Coba lagi." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { syncStripeSubscriptionById } from "@/lib/subscriptions/stripe-sync";
import {
  getStripeClient,
  getStripeCustomerId,
  isStripeConfigured,
} from "@/lib/subscriptions/stripe";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

// POST /api/billing/sync -> jaring pengaman setelah user kembali dari Checkout.
//
// Webhook tetap jalur utama. Endpoint ini ada karena dua hal yang nyata:
// webhook bisa telat beberapa detik (user sudah melihat halaman "paket lama"),
// dan saat pertama kali dipasang webhook-nya mungkin belum terdaftar sama
// sekali. Yang penting: ini TIDAK mempercayai body request soal paket apa pun
// — ia mengambil sesi/langganan langsung dari Stripe, lalu memeriksa bahwa
// customer-nya memang milik user yang sedang login.

type SyncBody = { sessionId?: unknown };

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

    const body = (await request.json().catch(() => ({}))) as SyncBody;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Sesi pembayaran tidak dikenali." },
        { status: 400 },
      );
    }

    const session = await getStripeClient().checkout.sessions.retrieve(
      sessionId,
    );

    // Session id muncul di URL, jadi harus dibuktikan miliknya sendiri sebelum
    // apa pun ditulis — kalau tidak, orang bisa menempelkan session id orang
    // lain ke URL-nya dan ikut menaikkan tier.
    if (session.client_reference_id !== user.id) {
      return NextResponse.json(
        { error: "Sesi pembayaran bukan milik akun ini." },
        { status: 403 },
      );
    }

    if (session.mode !== "subscription") {
      return NextResponse.json({ synced: false, reason: "not_a_subscription" });
    }

    if (session.status !== "complete") {
      return NextResponse.json({ synced: false, reason: "session_incomplete" });
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      return NextResponse.json({ synced: false, reason: "no_subscription" });
    }

    const result = await syncStripeSubscriptionById(subscriptionId);

    if (!result.ok) {
      console.error(
        "Billing sync: subscription could not be applied:",
        result.reason,
        { sessionId, customer: getStripeCustomerId(session.customer) },
      );

      return NextResponse.json({ synced: false, reason: result.reason });
    }

    return NextResponse.json({
      synced: true,
      tier: result.tier,
      status: result.status,
      entitled: result.entitled,
    });
  } catch (error) {
    console.error("Billing sync failed:", error);

    return NextResponse.json(
      { error: "Status langganan belum bisa disinkronkan." },
      { status: 500 },
    );
  }
}

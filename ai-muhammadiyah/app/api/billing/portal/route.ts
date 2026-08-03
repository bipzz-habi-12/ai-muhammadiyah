import { NextResponse } from "next/server";
import { findStripeCustomerId } from "@/lib/subscriptions/stripe-sync";
import {
  getAppOrigin,
  getStripeClient,
  isStripeConfigured,
} from "@/lib/subscriptions/stripe";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

// POST /api/billing/portal -> buka Stripe Billing Portal.
//
// Semua aksi kelola langganan (ganti kartu, upgrade/downgrade, batalkan,
// unduh invoice) dilakukan di portal Stripe, bukan di app ini. Konsekuensinya:
// pembatalan tidak perlu endpoint sendiri, dan status yang berubah di portal
// kembali ke DB lewat webhook `customer.subscription.updated/deleted`.

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

    const customerId = await findStripeCustomerId(user.id);

    if (!customerId) {
      return NextResponse.json(
        { error: "Belum ada langganan berbayar untuk dikelola." },
        { status: 400 },
      );
    }

    const session = await getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppOrigin(request)}/plans`,
      locale: "id",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal failed:", error);

    // Kegagalan paling sering di sini: konfigurasi Billing Portal belum
    // disimpan di Dashboard Stripe. Pesannya dibedakan supaya jelas apa yang
    // harus diperbaiki, bukan sekadar "coba lagi".
    const message =
      error instanceof Error && /configuration/i.test(error.message)
        ? "Billing Portal belum dikonfigurasi di Dashboard Stripe (Settings → Billing → Customer portal)."
        : "Halaman kelola langganan belum bisa dibuka. Coba lagi.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

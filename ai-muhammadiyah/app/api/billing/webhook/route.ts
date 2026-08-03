import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  syncStripeSubscription,
  syncStripeSubscriptionById,
} from "@/lib/subscriptions/stripe-sync";
import {
  getStripeClient,
  getStripeWebhookSecret,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from "@/lib/subscriptions/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Body harus dibaca mentah untuk verifikasi tanda tangan; jangan sampai
// di-cache atau di-prerender.
export const dynamic = "force-dynamic";

// POST /api/billing/webhook -> satu-satunya sumber kebenaran status langganan.
//
// Endpoint ini TIDAK memakai sesi login: pemanggilnya Stripe, bukan browser
// user. Otentikasinya adalah tanda tangan `stripe-signature` — tanpa verifikasi
// itu, siapa pun bisa mengirim JSON palsu dan menaikkan tier-nya sendiri.
// Karena itu request tanpa tanda tangan valid ditolak sebelum apa pun dibaca.

const handledEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  // Di versi API Stripe saat ini invoice tidak lagi punya field `subscription`
  // yang datar — tautannya pindah ke `parent.subscription_details`, dengan
  // baris item sebagai cadangan.
  const fromParent = invoice.parent?.subscription_details?.subscription;

  if (fromParent) {
    return typeof fromParent === "string" ? fromParent : fromParent.id;
  }

  for (const line of invoice.lines?.data ?? []) {
    const fromLine = line.parent?.subscription_item_details?.subscription;

    if (fromLine) {
      return fromLine;
    }
  }

  return null;
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode !== "subscription") {
        return { skipped: "not_a_subscription" };
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        return { skipped: "no_subscription_on_session" };
      }

      return syncStripeSubscriptionById(subscriptionId);
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return syncStripeSubscription(event.data.object as Stripe.Subscription);

    case "invoice.paid":
    case "invoice.payment_failed": {
      // Perpanjangan bulanan & kegagalan tagihan: ambil ulang subscription-nya
      // supaya status (`active` / `past_due`) dan periode baru ikut tersimpan.
      const subscriptionId = getSubscriptionIdFromInvoice(
        event.data.object as Stripe.Invoice,
      );

      if (!subscriptionId) {
        return { skipped: "no_subscription_on_invoice" };
      }

      return syncStripeSubscriptionById(subscriptionId);
    }

    default:
      return { skipped: "unhandled_event" };
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "Stripe webhook belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Tanda tangan hilang." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = await getStripeClient().webhooks.constructEventAsync(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);

    return NextResponse.json(
      { error: "Tanda tangan tidak valid." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();

  // Idempotensi: Stripe mengirim ulang event yang sama kalau kita lambat atau
  // sempat error. Primary key `billing_events.id` yang menolak duplikat, bukan
  // pengecekan "select dulu" yang bisa balapan antar dua pengiriman.
  const { error: insertError } = await supabase.from("billing_events").insert({
    id: event.id,
    type: event.type,
    // Jejak minimal untuk menelusuri masalah tanpa menyimpan objek Stripe utuh
    // (isinya bisa besar dan memuat data pelanggan yang tidak kita butuhkan).
    payload: { created: event.created, livemode: event.livemode },
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.error("Stripe webhook: failed to record event:", insertError);

    // Balas 500 supaya Stripe mengirim ulang — lebih baik diulang daripada
    // event pembayaran hilang diam-diam.
    return NextResponse.json(
      { error: "Event belum bisa dicatat." },
      { status: 500 },
    );
  }

  if (!handledEvents.has(event.type)) {
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    const result = await handleEvent(event);

    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error(`Stripe webhook: handling ${event.type} failed:`, error);

    // Hapus jejak idempotensi supaya percobaan ulang Stripe benar-benar
    // diproses ulang, bukan langsung dianggap duplikat.
    await supabase.from("billing_events").delete().eq("id", event.id);

    return NextResponse.json(
      { error: "Event gagal diproses." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/subscriptions/stripe";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

// GET /api/billing/state -> status langganan user untuk UI (tombol upgrade vs
// kelola langganan, tanggal perpanjangan). Dipanggil juga sebagai polling
// setelah user kembali dari Checkout sampai webhook mendarat.

export async function GET() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_billing_state");

  if (error) {
    console.error("Billing state failed:", error);

    return NextResponse.json(
      { error: "Status langganan belum bisa dimuat." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    billing: data,
    isStripeConfigured: isStripeConfigured(),
  });
}

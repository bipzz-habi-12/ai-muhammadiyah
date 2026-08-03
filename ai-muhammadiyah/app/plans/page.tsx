import Link from "next/link";
import { redirect } from "next/navigation";
import PlansBilling from "@/app/plans/PlansBilling";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { normalizeBillingState } from "@/lib/subscriptions/billing";
import { modelCatalog } from "@/lib/subscriptions/plans";
import { isStripeConfigured } from "@/lib/subscriptions/stripe";
import { tierLabels } from "@/lib/usage/limits";

// Pricing v2 (Pricing.dc.html port). Design layout, real data: the actual
// subscriptionPlans (5 tiers, monthly-only) and the live current tier. No
// billing toggle — there is no yearly pricing in the data, so a Monthly/Yearly
// switch would be a dead control. Pembayaran memakai Stripe Checkout; kartu
// harga dan hasil kembalinya user dari Stripe ditangani <PlansBilling>.

type PlansPageProps = {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
};

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { checkout, session_id: sessionId = "" } = await searchParams;
  const { data: billingData } = await supabase.rpc("get_billing_state");
  const billingState = normalizeBillingState(billingData, isStripeConfigured());
  const checkoutOutcome =
    checkout === "success" ? "success" : checkout === "cancel" ? "cancel" : null;

  return (
    <main className="min-h-dvh bg-[#f5f3ec] text-[#16211c]">
      <div className="mx-auto max-w-[1180px] px-6 pb-16 pt-10 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f5a3d] transition hover:text-[#0a3d2a]"
          >
            <span aria-hidden="true">&larr;</span> Kembali ke chat
          </Link>
          <span className="rounded-full bg-[#0f5a3d]/[0.08] px-3.5 py-1.5 text-[13px] font-semibold text-[#0f5a3d]">
            Paket aktif: {tierLabels[billingState.tier]}
          </span>
        </div>

        <header className="mx-auto mt-8 max-w-[720px] text-center">
          <div className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[#b08833]">
            Pricing
          </div>
          <h1 className="font-serif text-[42px] font-normal leading-[1.08] tracking-[-0.02em] text-[#12211b] sm:text-[52px]">
            Mulai gratis. Berkembang sesuai kebutuhan.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-relaxed text-[#4a554f]">
            Muhammadiyah Hub tetap gratis di setiap paket — selamanya.
          </p>
        </header>

        <PlansBilling
          initialBillingState={billingState}
          checkoutOutcome={checkoutOutcome}
          sessionId={sessionId}
        />

        <section className="mt-14">
          <h2 className="font-serif text-[26px] font-normal text-[#12211b]">
            Akses model berdasarkan paket
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(modelCatalog).map(([model, detail]) => (
              <div
                key={model}
                className="rounded-[16px] border border-[#0b3d2a]/10 bg-[#fbfaf6] p-5"
              >
                <p className="font-semibold text-[#25302a]">{detail.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#5d6862]">
                  {detail.description}
                </p>
                <p className="mt-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#0f5a3d]">
                  Mulai {tierLabels[detail.minimumTier]}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

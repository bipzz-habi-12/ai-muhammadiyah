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
    <main className="min-h-dvh bg-[var(--background)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1180px] px-6 pb-16 pt-10 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] transition hover:text-[var(--brand-hover-text)]"
          >
            <span aria-hidden="true">&larr;</span> Kembali ke chat
          </Link>
          <span className="rounded-full bg-[var(--brand)]/[0.08] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--brand)]">
            Paket aktif: {tierLabels[billingState.tier]}
          </span>
        </div>

        <header className="mx-auto mt-8 max-w-[720px] text-center">
          <div className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[var(--gold-ink)]">
            Pricing
          </div>
          <h1 className="font-serif text-[42px] font-normal leading-[1.08] tracking-[-0.02em] text-[var(--ink-deep)] sm:text-[52px]">
            Mulai gratis. Berkembang sesuai kebutuhan.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-relaxed text-[var(--c-4a554f)]">
            Muhammadiyah Hub tetap gratis di setiap paket — selamanya.
          </p>
        </header>

        <PlansBilling
          initialBillingState={billingState}
          checkoutOutcome={checkoutOutcome}
          sessionId={sessionId}
        />

        <section className="mt-14">
          <h2 className="font-serif text-[26px] font-normal text-[var(--ink-deep)]">
            Akses model berdasarkan paket
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(modelCatalog).map(([model, detail]) => (
              <div
                key={model}
                className="rounded-[16px] border border-[var(--brand-deep-line)]/10 bg-[var(--surface)] p-5"
              >
                <p className="font-semibold text-[var(--ink-soft)]">{detail.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-2)]">
                  {detail.description}
                </p>
                <p className="mt-3 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--brand)]">
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

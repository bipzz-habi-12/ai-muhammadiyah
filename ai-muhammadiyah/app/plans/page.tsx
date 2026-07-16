import Link from "next/link";
import { redirect } from "next/navigation";
import PlanCard from "@/app/plans/PlanCard";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { modelCatalog, subscriptionPlans } from "@/lib/subscriptions/plans";
import { normalizeUsageSnapshot, tierLabels } from "@/lib/usage/limits";

// Pricing v2 (Pricing.dc.html port). Design layout, real data: the actual
// subscriptionPlans (5 tiers, monthly-only) and the live current tier. No
// billing toggle — there is no yearly pricing in the data, so a Monthly/Yearly
// switch would be a dead control. Payments aren't active yet, so the CTAs stay
// honestly disabled (see PlanCard).

const popularTier = "kader_pintar";

export default async function PlansPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase.rpc("get_usage_snapshot");
  const usageSnapshot = normalizeUsageSnapshot(data);
  const currentTier = usageSnapshot?.tier ?? "free";

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
            Paket aktif: {tierLabels[currentTier]}
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

        <section className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {subscriptionPlans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              isCurrent={plan.tier === currentTier}
              isPopular={plan.tier === popularTier}
            />
          ))}
        </section>

        <p className="mt-7 text-center text-[13.5px] text-[#8a9089]">
          Semua paket mencakup Muhammadiyah Hub, respons streaming, dan upload
          dokumen. Harga dalam IDR, belum termasuk pajak. Pembayaran otomatis
          belum aktif.
        </p>

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

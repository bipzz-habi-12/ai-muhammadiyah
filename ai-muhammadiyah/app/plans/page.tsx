import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import {
  modelCatalog,
  subscriptionPlans,
} from "@/lib/subscriptions/plans";
import { normalizeUsageSnapshot, tierLabels } from "@/lib/usage/limits";

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
    <main className="min-h-dvh bg-[#f7fbf8] px-4 py-5 text-[#04140b] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-[#d9e9df] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#008d54]">
              Paket AI-mu
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-[#05150d] sm:text-4xl">
              Plans
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4f665c]">
              Pilih paket untuk membuka model yang lebih kuat, kuota lebih
              besar, dan rute dokumen premium. Pembayaran otomatis belum aktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf]">
              Aktif: {tierLabels[currentTier]}
            </span>
            <Link
              href="/"
              className="rounded-full bg-[#009252] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#007c46]"
            >
              Kembali ke chat
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-5">
          {subscriptionPlans.map((plan) => {
            const isCurrent = plan.tier === currentTier;

            return (
              <article
                key={plan.tier}
                className={
                  isCurrent
                    ? "rounded-[26px] bg-white p-5 shadow-[0_16px_42px_rgba(27,77,50,0.08)] ring-2 ring-[#95d6b9]"
                    : "rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-[#d8eadf]"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#18392e]">
                      {plan.name}
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-[#05150d]">
                      {plan.price}
                    </p>
                    <p className="text-sm font-semibold text-[#4f665c]">
                      per bulan
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-[#eef8f1] px-3 py-1 text-xs font-bold text-[#008d54]">
                      Aktif
                    </span>
                  )}
                </div>

                <p className="mt-4 min-h-12 text-sm leading-relaxed text-[#4f665c]">
                  {plan.tagline}
                </p>

                <div className="mt-5 rounded-[20px] bg-[#f7fbf8] p-4 ring-1 ring-[#d8eadf]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#008d54]">
                    Model AI
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-[#18392e]">
                    {plan.modelNames.join(", ")}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#008d54]">
                      Upload limits
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#18392e]">
                      {plan.dailyUploadLimit} dokumen per hari
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#008d54]">
                      Quotas
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#18392e]">
                      {plan.dailyMessageLimit} pesan per hari
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[#38534a]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#009252]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled
                  className="mt-6 h-11 w-full rounded-full bg-[#eef8f1] text-sm font-bold text-[#008d54] ring-1 ring-[#d8eadf] disabled:cursor-not-allowed disabled:opacity-80"
                >
                  Coming Soon
                </button>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-[26px] bg-white p-5 ring-1 ring-[#d8eadf]">
          <h2 className="text-xl font-bold text-[#18392e]">
            Akses model berdasarkan paket
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(modelCatalog).map(([model, detail]) => (
              <div
                key={model}
                className="rounded-[20px] bg-[#f7fbf8] p-4 ring-1 ring-[#d8eadf]"
              >
                <p className="font-bold text-[#18392e]">{detail.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#4f665c]">
                  {detail.description}
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#008d54]">
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

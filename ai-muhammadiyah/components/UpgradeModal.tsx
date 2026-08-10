"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useBilling } from "@/hooks/useBilling";
import {
  resolveBillingAction,
  type BillingState,
} from "@/lib/subscriptions/billing";
import {
  getTierRank,
  modelCatalog,
  subscriptionPlans,
  type PlanModelId,
  type SubscriptionPlan,
} from "@/lib/subscriptions/plans";
import type { SubscriptionTier, UsageSnapshot } from "@/lib/usage/limits";

interface UpgradeModalProps {
  isUpgradeOpen: boolean;
  setIsUpgradeOpen: Dispatch<SetStateAction<boolean>>;
  upgradeTargetModel: PlanModelId;
  currentTierLabel: string;
  upgradePlan: SubscriptionPlan;
  usageSnapshot: UsageSnapshot | null;
}

/**
 * Tombol aksi tiap kartu paket. Keputusannya diambil `resolveBillingAction`
 * yang sama dengan halaman /plans — jadi kedua tempat ini tidak bisa berbeda
 * pendapat soal kapan boleh membuka Checkout (aturan pentingnya: user yang
 * sudah berlangganan TIDAK pernah, karena itu akan membuat langganan kedua).
 */
function UpgradeAction({
  plan,
  currentTier,
  billingState,
  isPending,
  onCheckout,
  onSwitchPlan,
  onManage,
}: {
  plan: SubscriptionPlan;
  currentTier: SubscriptionTier;
  billingState: BillingState;
  isPending: boolean;
  onCheckout: () => void;
  onSwitchPlan: () => void;
  onManage: () => void;
}) {
  const activeClassName =
    "mt-4 h-10 w-full rounded-full bg-[var(--brand)] text-xs font-bold text-[var(--on-brand)] transition hover:bg-[var(--brand-hover)]";
  const mutedClassName =
    "mt-4 h-10 w-full rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)] ring-1 ring-[var(--brand-deep-line)]/10 disabled:cursor-not-allowed disabled:opacity-80";

  if (isPending) {
    return (
      <button type="button" disabled className={mutedClassName}>
        Menyiapkan…
      </button>
    );
  }

  const action = resolveBillingAction({
    planTier: plan.tier,
    planName: plan.name,
    currentTier,
    state: billingState,
    tierRank: getTierRank,
  });

  if (action.kind === "none") {
    return (
      <button type="button" disabled className={mutedClassName}>
        {action.label}
      </button>
    );
  }

  const onClick =
    action.kind === "checkout"
      ? onCheckout
      : action.kind === "switch"
        ? onSwitchPlan
        : onManage;

  return (
    <button
      type="button"
      onClick={onClick}
      className={action.kind === "portal" ? mutedClassName : activeClassName}
    >
      {action.label}
    </button>
  );
}

export default function UpgradeModal({
  isUpgradeOpen,
  setIsUpgradeOpen,
  upgradeTargetModel,
  currentTierLabel,
  upgradePlan,
  usageSnapshot,
}: UpgradeModalProps) {
  const {
    billingState,
    isBillingLoaded,
    loadBillingState,
    checkout,
    switchPlan,
    manageBilling,
    pendingTier,
    isPortalPending,
    billingError,
  } = useBilling();

  // Status langganan hanya diambil saat modal benar-benar dibuka: modal ini
  // ikut ter-render di setiap halaman chat, dan tanpa syarat ini setiap orang
  // akan menembak /api/billing/state di tiap load.
  useEffect(() => {
    if (isUpgradeOpen) {
      void loadBillingState();
    }
  }, [isUpgradeOpen, loadBillingState]);

  if (!isUpgradeOpen) {
    return null;
  }

  // Setelah ganti paket, `usageSnapshot` milik halaman induk masih tier lama —
  // begitu billing state termuat, itu yang dipakai menandai kartu "Aktif".
  const currentTier = isBillingLoaded
    ? billingState.tier
    : usageSnapshot?.tier;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[var(--scrim)]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-[24px] bg-[var(--surface-panel)] p-5 shadow-2xl ring-1 ring-[var(--brand-deep-line)]/10 sm:max-w-5xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
              Upgrade paket
            </p>
            <h2 className="mt-2 font-serif text-[26px] font-normal text-[var(--ink-deep)]">
              Buka {modelCatalog[upgradeTargetModel].label}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-2)]">
              Paket kamu saat ini: {currentTierLabel}. Upgrade mulai dari{" "}
              <strong className="text-[var(--ink)]">{upgradePlan.name}</strong>{" "}
              untuk memakai {modelCatalog[upgradeTargetModel].description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUpgradeOpen(false)}
            aria-label="Tutup upgrade"
            title="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--surface-border)]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              x
            </span>
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {subscriptionPlans.map((plan) => {
            const isCurrentPlan = currentTier === plan.tier;
            const unlocksTarget = plan.allowedModels.includes(upgradeTargetModel);

            return (
              <article
                key={plan.tier}
                className={
                  unlocksTarget
                    ? "rounded-[24px] bg-[var(--surface)] p-4 ring-2 ring-[var(--brand)]"
                    : "rounded-[24px] bg-[var(--surface)] p-4 ring-1 ring-[var(--brand-deep-line)]/10"
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[var(--ink)]">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-[var(--ink)]">
                      {plan.price}
                    </p>
                    <p className="text-xs font-semibold text-[var(--muted-2)]">
                      per bulan
                    </p>
                  </div>
                  {isCurrentPlan && (
                    <span className="rounded-full bg-[var(--brand)]/10 px-2 py-1 text-[11px] font-bold text-[var(--brand)]">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-2)]">
                  {plan.tagline}
                </p>
                <div className="mt-4 space-y-2 text-xs font-semibold text-[var(--muted-2)]">
                  <p>{plan.quotas[0]}</p>
                  <p>{plan.quotas[1]}</p>
                  <p>{plan.modelNames.join(", ")}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.modelBadges.map((badge) => (
                    <span
                      key={badge}
                      className={
                        badge.includes("GPT")
                          ? "rounded-full bg-[var(--gold)] px-2 py-0.5 text-[11px] font-bold text-[var(--gold-ink-2)]"
                          : badge.includes("Gemini 2.5 Pro")
                            ? "rounded-full bg-[var(--c-e0e0ff)] px-2 py-0.5 text-[11px] font-bold text-[var(--c-343d96)]"
                            : "rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--brand)]"
                      }
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <UpgradeAction
                  plan={plan}
                  currentTier={currentTier ?? "free"}
                  billingState={billingState}
                  isPending={pendingTier === plan.tier || isPortalPending}
                  onCheckout={() => checkout(plan.tier)}
                  onSwitchPlan={() => switchPlan(plan.tier)}
                  onManage={manageBilling}
                />
              </article>
            );
          })}
        </div>

        {billingError && (
          <div
            role="alert"
            className="mt-5 rounded-[22px] bg-[var(--gold)]/25 p-4 text-sm font-semibold leading-relaxed text-[var(--gold-ink-2)]"
          >
            {billingError}
          </div>
        )}

        <div className="mt-5 rounded-[22px] bg-[var(--brand)]/10 p-4 text-sm leading-relaxed text-[var(--muted-2)] ring-1 ring-[var(--brand-deep-line)]/10">
          {billingState.isStripeConfigured
            ? "Pembayaran diproses aman oleh Stripe. Langganan berulang tiap bulan dan bisa dibatalkan kapan saja dari halaman kelola langganan."
            : "Pembayaran otomatis belum diaktifkan di server ini. Rute premium dan kuota tetap mengikuti data subscription yang ada."}
        </div>
      </div>
    </div>
  );
}

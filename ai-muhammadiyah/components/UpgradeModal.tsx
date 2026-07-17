"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  modelCatalog,
  subscriptionPlans,
  type PlanModelId,
  type SubscriptionPlan,
} from "@/lib/subscriptions/plans";
import type { UsageSnapshot } from "@/lib/usage/limits";

interface UpgradeModalProps {
  isUpgradeOpen: boolean;
  setIsUpgradeOpen: Dispatch<SetStateAction<boolean>>;
  upgradeTargetModel: PlanModelId;
  currentTierLabel: string;
  upgradePlan: SubscriptionPlan;
  usageSnapshot: UsageSnapshot | null;
}

export default function UpgradeModal({
  isUpgradeOpen,
  setIsUpgradeOpen,
  upgradeTargetModel,
  currentTierLabel,
  upgradePlan,
  usageSnapshot,
}: UpgradeModalProps) {
  if (!isUpgradeOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#16211c]/40 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-[24px] bg-[#f7f5ee] p-5 shadow-2xl ring-1 ring-[#0b3d2a]/10 sm:max-w-5xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f5a3d]">
              Upgrade paket
            </p>
            <h2 className="mt-2 font-serif text-[26px] font-normal text-[#12211b]">
              Buka {modelCatalog[upgradeTargetModel].label}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5d6862]">
              Paket kamu saat ini: {currentTierLabel}. Upgrade mulai dari{" "}
              <strong className="text-[#16211c]">{upgradePlan.name}</strong>{" "}
              untuk memakai {modelCatalog[upgradeTargetModel].description}
            </p>
            {(upgradeTargetModel === "smart" ||
              upgradeTargetModel === "document") && (
              <p className="mt-2 inline-flex rounded-full bg-[#e7c77e] px-3 py-1 text-xs font-bold text-[#8a6a1f]">
                Requires Muallim Pro or higher
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsUpgradeOpen(false)}
            aria-label="Tutup upgrade"
            title="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5d6862] transition hover:bg-[#ece9df]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              x
            </span>
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {subscriptionPlans.map((plan) => {
            const isCurrentPlan = usageSnapshot?.tier === plan.tier;
            const unlocksTarget = plan.allowedModels.includes(upgradeTargetModel);

            return (
              <article
                key={plan.tier}
                className={
                  unlocksTarget
                    ? "rounded-[24px] bg-[#fbfaf6] p-4 ring-2 ring-[#0f5a3d]"
                    : "rounded-[24px] bg-[#fbfaf6] p-4 ring-1 ring-[#0b3d2a]/10"
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[#16211c]">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-[#16211c]">
                      {plan.price}
                    </p>
                    <p className="text-xs font-semibold text-[#5d6862]">
                      per bulan
                    </p>
                  </div>
                  {isCurrentPlan && (
                    <span className="rounded-full bg-[#0f5a3d]/10 px-2 py-1 text-[11px] font-bold text-[#0f5a3d]">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#5d6862]">
                  {plan.tagline}
                </p>
                <div className="mt-4 space-y-2 text-xs font-semibold text-[#5d6862]">
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
                          ? "rounded-full bg-[#e7c77e] px-2 py-0.5 text-[11px] font-bold text-[#8a6a1f]"
                          : badge.includes("Gemini 2.5 Pro")
                            ? "rounded-full bg-[#e0e0ff] px-2 py-0.5 text-[11px] font-bold text-[#343d96]"
                            : "rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 text-[11px] font-bold text-[#0f5a3d]"
                      }
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-4 h-10 w-full rounded-full bg-[#0f5a3d]/10 text-xs font-bold text-[#0f5a3d] ring-1 ring-[#0b3d2a]/10 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  Coming Soon
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-[22px] bg-[#0f5a3d]/10 p-4 text-sm leading-relaxed text-[#5d6862] ring-1 ring-[#0b3d2a]/10">
          Pembayaran otomatis belum diaktifkan. Untuk sekarang, upgrade
          ditampilkan sebagai placeholder manual sambil rute premium dan kuota
          subscription tetap siap dipakai dari data subscription.
        </div>
      </div>
    </div>
  );
}

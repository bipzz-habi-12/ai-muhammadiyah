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
    <div className="fixed inset-0 z-50 flex items-end bg-[#04140b]/35 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-[28px] bg-[#fbfdfb] p-5 shadow-2xl ring-1 ring-[#d8eadf] sm:max-w-5xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#008d54]">
              Upgrade paket
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#05150d]">
              Buka {modelCatalog[upgradeTargetModel].label}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4f665c]">
              Paket kamu saat ini: {currentTierLabel}. Upgrade mulai dari{" "}
              <strong className="text-[#18392e]">{upgradePlan.name}</strong>{" "}
              untuk memakai {modelCatalog[upgradeTargetModel].description}
            </p>
            {(upgradeTargetModel === "smart" ||
              upgradeTargetModel === "document") && (
              <p className="mt-2 inline-flex rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-bold text-[#8a5a00]">
                Requires Muallim Pro or higher
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsUpgradeOpen(false)}
            aria-label="Tutup upgrade"
            title="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#566d62] transition hover:bg-[#eef8f1]"
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
                    ? "rounded-[24px] bg-white p-4 ring-2 ring-[#95d6b9]"
                    : "rounded-[24px] bg-white p-4 ring-1 ring-[#d8eadf]"
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[#18392e]">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-[#05150d]">
                      {plan.price}
                    </p>
                    <p className="text-xs font-semibold text-[#4f665c]">
                      per bulan
                    </p>
                  </div>
                  {isCurrentPlan && (
                    <span className="rounded-full bg-[#eef8f1] px-2 py-1 text-[11px] font-bold text-[#008d54]">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#4f665c]">
                  {plan.tagline}
                </p>
                <div className="mt-4 space-y-2 text-xs font-semibold text-[#38534a]">
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
                          ? "rounded-full bg-[#fff4d8] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]"
                          : badge.includes("Gemini 2.5 Pro")
                            ? "rounded-full bg-[#e8f1ff] px-2 py-0.5 text-[11px] font-bold text-[#28528a]"
                            : "rounded-full bg-[#eef8f1] px-2 py-0.5 text-[11px] font-bold text-[#008d54]"
                      }
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-4 h-10 w-full rounded-full bg-[#eef8f1] text-xs font-bold text-[#008d54] ring-1 ring-[#d8eadf] disabled:cursor-not-allowed disabled:opacity-80"
                >
                  Coming Soon
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-[22px] bg-[#eef8f1] p-4 text-sm leading-relaxed text-[#38534a] ring-1 ring-[#d8eadf]">
          Pembayaran otomatis belum diaktifkan. Untuk sekarang, upgrade
          ditampilkan sebagai placeholder manual sambil rute premium dan kuota
          subscription tetap siap dipakai dari data subscription.
        </div>
      </div>
    </div>
  );
}

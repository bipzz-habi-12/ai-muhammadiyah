"use client";

import { getTierRank, type SubscriptionPlan } from "@/lib/subscriptions/plans";
import {
  describeBillingSubscription,
  resolveBillingAction,
  type BillingState,
} from "@/lib/subscriptions/billing";
import type { SubscriptionTier } from "@/lib/usage/limits";

// Design v2 pricing card. Highlighted ("popular") variant is the dark-green
// card; the rest are cream. CTA-nya nyata sekarang: paket berbayar membuka
// Stripe Checkout, paket aktif membuka Billing Portal. Tombol hanya mati kalau
// Stripe memang belum dikonfigurasi di server.

// Diamond-grid texture for the highlighted card (inline data URI).
const cardPattern =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%23FFFFFF' stroke-opacity='.05' stroke-width='1'%3E%3Crect x='24' y='24' width='48' height='48'/%3E%3Crect x='24' y='24' width='48' height='48' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E\")";

function Check({ popular }: { popular: boolean }) {
  return (
    <span
      className={`shrink-0 ${popular ? "text-[#e7c77e]" : "text-[#0f5a3d]"}`}
      aria-hidden="true"
    >
      ✓
    </span>
  );
}

type PlanCardAction = {
  label: string;
  disabled: boolean;
  onClick?: () => void;
};

function toCardAction({
  plan,
  billingState,
  isPending,
  onCheckout,
  onSwitchPlan,
  onManage,
}: {
  plan: SubscriptionPlan;
  billingState: BillingState;
  isPending: boolean;
  onCheckout: (tier: SubscriptionTier) => void;
  onSwitchPlan: (tier: SubscriptionTier) => void;
  onManage: () => void;
}): PlanCardAction {
  if (isPending) {
    return { label: "Menyiapkan…", disabled: true };
  }

  const action = resolveBillingAction({
    planTier: plan.tier,
    planName: plan.name,
    currentTier: billingState.tier,
    state: billingState,
    tierRank: getTierRank,
  });

  switch (action.kind) {
    case "checkout":
      return {
        label: action.label,
        disabled: false,
        onClick: () => onCheckout(plan.tier),
      };
    case "switch":
      return {
        label: action.label,
        disabled: false,
        onClick: () => onSwitchPlan(plan.tier),
      };
    case "portal":
      return { label: action.label, disabled: false, onClick: onManage };
    default:
      return { label: action.label, disabled: true };
  }
}

export default function PlanCard({
  plan,
  isCurrent,
  isPopular,
  billingState,
  isPending,
  onCheckout,
  onSwitchPlan,
  onManage,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isPopular: boolean;
  billingState: BillingState;
  isPending: boolean;
  onCheckout: (tier: SubscriptionTier) => void;
  onSwitchPlan: (tier: SubscriptionTier) => void;
  onManage: () => void;
}) {
  const checklist = [...plan.quotas, ...plan.features];
  const action = toCardAction({
    plan,
    billingState,
    isPending,
    onCheckout,
    onSwitchPlan,
    onManage,
  });
  const statusNote = isCurrent ? describeBillingSubscription(billingState) : null;

  if (isPopular) {
    return (
      <article
        className="relative flex flex-col overflow-hidden rounded-[18px] bg-[#0b3d2a] px-6 py-8 text-[#ede9dc] shadow-[0_30px_60px_-40px_rgba(11,61,42,0.9)]"
        style={{ backgroundImage: cardPattern, backgroundSize: "96px 96px" }}
      >
        <span className="absolute left-1/2 top-[-11px] -translate-x-1/2 rounded-full bg-[#e7c77e] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#0b3d2a]">
          Paling populer
        </span>
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#f3efe2]">{plan.name}</span>
          {isCurrent && (
            <span className="rounded-full bg-[#e7c77e]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#e7c77e]">
              Aktif
            </span>
          )}
        </div>
        <div className="mb-5 min-h-[36px] text-[13px] text-[#9fb3a5]">
          {plan.tagline}
        </div>
        <div className="mb-[22px] flex items-baseline gap-1.5">
          <span className="font-serif text-[40px] text-[#f3efe2]">{plan.price}</span>
          <span className="text-[13px] text-[#9fb3a5]">/bulan</span>
        </div>
        <button
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className="mb-2 h-11 rounded-[11px] bg-[#e7c77e] text-sm font-bold text-[#0b3d2a] transition hover:bg-[#f0d69a] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#e7c77e]"
        >
          {action.label}
        </button>
        {statusNote && (
          <p className="mb-4 text-[12px] leading-relaxed text-[#9fb3a5]">
            {statusNote}
          </p>
        )}
        <div className={`flex flex-col gap-2.5 text-[13.5px] text-[#dce4db] ${statusNote ? "" : "mt-4"}`}>
          {checklist.map((item) => (
            <div key={item} className="flex gap-2.5">
              <Check popular /> {item}
            </div>
          ))}
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col rounded-[18px] border border-[#0b3d2a]/11 bg-[#fbfaf6] px-6 py-8">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[15px] font-bold text-[#25302a]">{plan.name}</span>
        {isCurrent && (
          <span className="rounded-full bg-[#0f5a3d]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0f5a3d]">
            Aktif
          </span>
        )}
      </div>
      <div className="mb-5 min-h-[36px] text-[13px] text-[#8a9089]">
        {plan.tagline}
      </div>
      <div className="mb-[22px] flex items-baseline gap-1.5">
        <span className="font-serif text-[40px] text-[#12211b]">{plan.price}</span>
        {plan.priceIdr > 0 && (
          <span className="text-[13px] text-[#8a9089]">/bulan</span>
        )}
      </div>
      <button
        type="button"
        disabled={action.disabled}
        onClick={action.onClick}
        className={
          isCurrent
            ? "mb-2 h-11 rounded-[11px] bg-[#0f5a3d] text-sm font-semibold text-[#f5f3ec] transition hover:bg-[#0a3d2a] disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:bg-[#0f5a3d]"
            : "mb-2 h-11 rounded-[11px] border border-[#0b3d2a]/16 text-sm font-semibold text-[#25302a] transition hover:border-[#0f5a3d] hover:bg-[#0f5a3d]/[0.06] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-[#0b3d2a]/16 disabled:hover:bg-transparent"
        }
      >
        {action.label}
      </button>
      {statusNote && (
        <p className="mb-4 text-[12px] leading-relaxed text-[#7c857f]">
          {statusNote}
        </p>
      )}
      <div className={`flex flex-col gap-2.5 text-[13.5px] text-[#3a453e] ${statusNote ? "" : "mt-4"}`}>
        {checklist.map((item) => (
          <div key={item} className="flex gap-2.5">
            <Check popular={false} /> {item}
          </div>
        ))}
      </div>
    </article>
  );
}

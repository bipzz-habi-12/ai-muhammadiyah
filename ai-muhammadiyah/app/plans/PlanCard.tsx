import type { SubscriptionPlan } from "@/lib/subscriptions/plans";

// Design v2 pricing card. Presentational + boundary-agnostic. Highlighted
// ("popular") variant is the dark-green card; the rest are cream. Payments
// aren't active yet, so the CTA is always disabled — current tier reads "Paket
// kamu saat ini", others "Segera hadir".

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

export default function PlanCard({
  plan,
  isCurrent,
  isPopular,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isPopular: boolean;
}) {
  const checklist = [...plan.quotas, ...plan.features];

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
          disabled
          className="mb-6 h-11 cursor-not-allowed rounded-[11px] bg-[#e7c77e] text-sm font-bold text-[#0b3d2a] opacity-95"
        >
          {isCurrent ? "Paket kamu saat ini" : "Segera hadir"}
        </button>
        <div className="flex flex-col gap-2.5 text-[13.5px] text-[#dce4db]">
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
        {plan.price !== "Rp0" && (
          <span className="text-[13px] text-[#8a9089]">/bulan</span>
        )}
      </div>
      <button
        type="button"
        disabled
        className={
          isCurrent
            ? "mb-6 h-11 cursor-not-allowed rounded-[11px] bg-[#0f5a3d] text-sm font-semibold text-[#f5f3ec] opacity-95"
            : "mb-6 h-11 cursor-not-allowed rounded-[11px] border border-[#0b3d2a]/16 text-sm font-semibold text-[#25302a] opacity-80"
        }
      >
        {isCurrent ? "Paket kamu saat ini" : "Segera hadir"}
      </button>
      <div className="flex flex-col gap-2.5 text-[13.5px] text-[#3a453e]">
        {checklist.map((item) => (
          <div key={item} className="flex gap-2.5">
            <Check popular={false} /> {item}
          </div>
        ))}
      </div>
    </article>
  );
}

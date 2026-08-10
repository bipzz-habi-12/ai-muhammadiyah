"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PlanCard from "@/app/plans/PlanCard";
import { useBilling } from "@/hooks/useBilling";
import { subscriptionPlans } from "@/lib/subscriptions/plans";
import type { BillingState } from "@/lib/subscriptions/billing";
import type { SubscriptionTier } from "@/lib/usage/limits";

// Bagian interaktif halaman Paket: kartu harga + hasil kembalinya user dari
// Stripe Checkout.
//
// Kenapa ada rekonsiliasi di sini: webhook adalah jalur utama, tapi user
// kembali ke halaman ini beberapa detik sebelum webhook mendarat. Tanpa ini,
// halaman akan sempat memperlihatkan "paket lama" tepat setelah orang membayar
// — bug yang terasa seperti uang hilang. Jadi setelah sukses, halaman memanggil
// /api/billing/sync sekali (aman: server memverifikasi sesi itu milik user
// yang login), lalu polling status sampai tier benar-benar berubah.

const popularTier: SubscriptionTier = "kader_pintar";
const syncPollAttempts = 5;
const syncPollDelayMs = 2000;

type CheckoutOutcome = "success" | "cancel" | null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PlansBilling({
  initialBillingState,
  checkoutOutcome,
  sessionId,
}: {
  initialBillingState: BillingState;
  checkoutOutcome: CheckoutOutcome;
  sessionId: string;
}) {
  const router = useRouter();
  const {
    billingState,
    loadBillingState,
    checkout,
    switchPlan,
    manageBilling,
    pendingTier,
    isPortalPending,
    billingError,
  } = useBilling({ initialState: initialBillingState });

  const [isReconciling, setIsReconciling] = useState(
    checkoutOutcome === "success",
  );
  const hasReconciledRef = useRef(false);

  const clearCheckoutParams = useCallback(() => {
    // Bersihkan query supaya reload tidak memicu sinkronisasi ulang dan
    // session id tidak menetap di address bar.
    window.history.replaceState(null, "", "/plans");
  }, []);

  useEffect(() => {
    if (checkoutOutcome !== "success" || hasReconciledRef.current) {
      return;
    }

    hasReconciledRef.current = true;
    let cancelled = false;

    const reconcile = async () => {
      if (sessionId) {
        try {
          await fetch("/api/billing/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
        } catch (error) {
          // Bukan kegagalan fatal: webhook masih akan menyelesaikannya.
          console.error("Billing sync request failed:", error);
        }
      }

      for (let attempt = 0; attempt < syncPollAttempts; attempt += 1) {
        if (cancelled) {
          return;
        }

        const state = await loadBillingState();

        if (state?.subscription?.isEntitled) {
          break;
        }

        await delay(syncPollDelayMs);
      }

      if (cancelled) {
        return;
      }

      setIsReconciling(false);
      clearCheckoutParams();
      router.refresh();
    };

    void reconcile();

    return () => {
      cancelled = true;
    };
  }, [
    checkoutOutcome,
    sessionId,
    loadBillingState,
    clearCheckoutParams,
    router,
  ]);

  useEffect(() => {
    if (checkoutOutcome === "cancel") {
      clearCheckoutParams();
    }
  }, [checkoutOutcome, clearCheckoutParams]);

  // Tier yang ditampilkan sebagai "Aktif" mengikuti state terbaru dari client
  // begitu rekonsiliasi selesai, bukan snapshot render server.
  const currentTier = billingState.tier;

  return (
    <>
      {checkoutOutcome === "success" && (
        <div className="mt-6 rounded-[16px] border border-[var(--brand)]/25 bg-[var(--brand)]/[0.07] px-5 py-4 text-[14px] leading-relaxed text-[var(--ink)]">
          <p className="font-semibold">
            {isReconciling
              ? "Pembayaran diterima. Sedang mengaktifkan paket…"
              : billingState.subscription?.isEntitled
                ? "Pembayaran berhasil. Paket kamu sudah aktif."
                : "Pembayaran diterima."}
          </p>
          {!isReconciling && !billingState.subscription?.isEntitled && (
            <p className="mt-1 text-[13px] text-[var(--muted-2)]">
              Aktivasi kadang butuh satu menit. Muat ulang halaman ini sebentar
              lagi — kalau masih belum berubah, hubungi kami dengan bukti
              pembayaran dari Stripe.
            </p>
          )}
        </div>
      )}

      {checkoutOutcome === "cancel" && (
        <div className="mt-6 rounded-[16px] border border-[var(--brand-deep-line)]/12 bg-[var(--surface)] px-5 py-4 text-[14px] leading-relaxed text-[var(--muted-2)]">
          Pembayaran dibatalkan. Tidak ada biaya yang ditagihkan.
        </div>
      )}

      {billingError && (
        <div
          role="alert"
          className="mt-6 rounded-[16px] border border-[var(--gold-ink)]/35 bg-[var(--gold)]/20 px-5 py-4 text-[14px] leading-relaxed text-[var(--gold-ink-2)]"
        >
          {billingError}
        </div>
      )}

      <section className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {subscriptionPlans.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            isCurrent={plan.tier === currentTier}
            isPopular={plan.tier === popularTier}
            billingState={billingState}
            isPending={pendingTier === plan.tier || isPortalPending}
            onCheckout={checkout}
            onSwitchPlan={switchPlan}
            onManage={manageBilling}
          />
        ))}
      </section>

      {billingState.isStripeConfigured && billingState.subscription && (
        <p className="mt-6 text-center text-[13.5px] text-[var(--muted-2)]">
          Perlu invoice, ganti kartu, atau batalkan langganan?{" "}
          <button
            type="button"
            onClick={manageBilling}
            disabled={isPortalPending}
            className="font-semibold text-[var(--brand)] underline underline-offset-2 transition hover:text-[var(--brand-hover-text)] disabled:opacity-60"
          >
            {isPortalPending ? "Membuka…" : "Buka kelola langganan"}
          </button>
        </p>
      )}

      {billingState.isStripeConfigured ? (
        <p className="mt-7 text-center text-[13.5px] text-[var(--muted-3)]">
          Semua paket mencakup Muhammadiyah Hub, respons streaming, dan upload
          dokumen. Harga dalam IDR, belum termasuk pajak. Pembayaran diproses
          aman oleh Stripe — kartu kamu tidak pernah menyentuh server kami.
          Langganan berulang tiap bulan dan bisa dibatalkan kapan saja.
        </p>
      ) : (
        <p className="mt-7 text-center text-[13.5px] text-[var(--muted-3)]">
          Semua paket mencakup Muhammadiyah Hub, respons streaming, dan upload
          dokumen. Harga dalam IDR, belum termasuk pajak. Pembayaran otomatis
          belum aktif di server ini.
        </p>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {isReconciling
          ? "Mengaktifkan paket"
          : `Paket aktif: ${billingState.tier}`}
      </span>
    </>
  );
}

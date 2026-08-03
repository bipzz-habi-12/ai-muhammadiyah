"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  changePlan,
  emptyBillingState,
  fetchBillingState,
  openBillingPortal,
  startCheckout,
  type BillingState,
} from "@/lib/subscriptions/billing";
import type { SubscriptionTier } from "@/lib/usage/limits";

// Aksi billing dipakai di tiga tempat (halaman Paket, UpgradeModal, Settings),
// jadi state "sedang memproses tier mana" + penanganan error dikumpulkan di
// sini supaya ketiganya berperilaku sama.

type UseBillingOptions = {
  /** State awal dari server, supaya tidak ada kedipan tombol saat hidrasi. */
  initialState?: BillingState;
};

export function useBilling({ initialState }: UseBillingOptions = {}) {
  const [billingState, setBillingState] = useState<BillingState>(
    initialState ?? emptyBillingState,
  );
  const [isBillingLoaded, setIsBillingLoaded] = useState(
    Boolean(initialState),
  );
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [isPortalPending, setIsPortalPending] = useState(false);
  const [billingError, setBillingError] = useState("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadBillingState = useCallback(async () => {
    const state = await fetchBillingState();

    if (state && isMountedRef.current) {
      setBillingState(state);
      setIsBillingLoaded(true);
    }

    return state;
  }, []);

  const checkout = useCallback(async (tier: SubscriptionTier) => {
    setBillingError("");
    setPendingTier(tier);

    try {
      const url = await startCheckout(tier);

      // Redirect penuh, bukan router.push: tujuannya domain Stripe.
      window.location.assign(url);
    } catch (error) {
      console.error(error);

      if (isMountedRef.current) {
        setBillingError(
          error instanceof Error
            ? error.message
            : "Pembayaran belum bisa dibuka.",
        );
        setPendingTier(null);
      }
    }
  }, []);

  /**
   * Untuk user yang SUDAH berlangganan. Tidak membuka Checkout: itu akan
   * membuat langganan kedua yang ikut ditagih.
   */
  const switchPlan = useCallback(
    async (tier: SubscriptionTier) => {
      setBillingError("");
      setPendingTier(tier);

      try {
        await changePlan(tier);
        await loadBillingState();
      } catch (error) {
        console.error(error);

        if (isMountedRef.current) {
          setBillingError(
            error instanceof Error ? error.message : "Paket belum bisa diubah.",
          );
        }
      } finally {
        if (isMountedRef.current) {
          setPendingTier(null);
        }
      }
    },
    [loadBillingState],
  );

  const manageBilling = useCallback(async () => {
    setBillingError("");
    setIsPortalPending(true);

    try {
      const url = await openBillingPortal();
      window.location.assign(url);
    } catch (error) {
      console.error(error);

      if (isMountedRef.current) {
        setBillingError(
          error instanceof Error
            ? error.message
            : "Halaman kelola langganan belum bisa dibuka.",
        );
        setIsPortalPending(false);
      }
    }
  }, []);

  return {
    billingState,
    isBillingLoaded,
    setBillingState,
    loadBillingState,
    checkout,
    switchPlan,
    manageBilling,
    pendingTier,
    isPortalPending,
    billingError,
    setBillingError,
  };
}

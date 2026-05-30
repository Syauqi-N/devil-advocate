"use client";

import { useState, useEffect, useCallback } from "react";

export interface SubscriptionState {
  isPro: boolean;
  plan: "free" | "pro";
  status: "active" | "expired" | "cancelled" | "pending";
  expiresAt: string | null;
  debatesToday: number;
  debatesLimit: number | null; // null = unlimited
  pendingInvoiceUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEFAULT_STATE: Omit<SubscriptionState, "isLoading" | "error" | "refetch"> = {
  isPro: false,
  plan: "free",
  status: "active",
  expiresAt: null,
  debatesToday: 0,
  debatesLimit: 1,
  pendingInvoiceUrl: null,
};

export function useSubscription(): SubscriptionState {
  const [data, setData] = useState(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubscription() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/me/subscription", {
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || "Gagal memuat data langganan");
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            isPro: json.plan === "pro" && json.status === "active",
            plan: json.plan ?? "free",
            status: json.status ?? "active",
            expiresAt: json.expires_at ?? null,
            debatesToday: json.debates_today ?? 0,
            debatesLimit: json.debates_limit ?? 1,
            pendingInvoiceUrl: json.pending_invoice_url ?? json.pending_payment_url ?? null,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat data langganan");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchSubscription();

    // Revalidate every 60 seconds
    const interval = setInterval(fetchSubscription, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  return { ...data, isLoading, error, refetch };
}

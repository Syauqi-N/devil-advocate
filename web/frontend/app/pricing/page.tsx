"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Check, Zap, Lock } from "lucide-react";

function PricingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPro, pendingInvoiceUrl, isLoading: subLoading, refetch } = useSubscription();

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/pricing");
    }
  }, [status, router]);

  // Handle ?status=success/failed
  useEffect(() => {
    const s = searchParams.get("status");
    if (s === "success") {
      setSuccessMsg("Pembayaran berhasil! Akun kamu sudah diupgrade ke Pro.");
      refetch();
    } else if (s === "failed") {
      setError("Pembayaran gagal atau dibatalkan. Silakan coba lagi.");
    }
  }, [searchParams, refetch]);

  async function handleUpgrade() {
    setIsUpgrading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/create-invoice", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.detail === "ALREADY_PRO") {
          setError("Kamu sudah berlangganan Pro.");
        } else if (json.detail === "Pending payment exists") {
          setError(null);
          const url = json.payment_url || pendingInvoiceUrl;
          if (url) {
            window.location.href = url;
          } else {
            setError("Ada pembayaran yang belum selesai. Silakan buat transaksi baru.");
            refetch();
          }
        } else {
          setError(json.detail || "Gagal membuat invoice. Coba lagi.");
        }
        return;
      }

      if (json.payment_url) {
        window.location.href = json.payment_url;
      } else {
        setError("Gagal mendapatkan link pembayaran. Coba lagi.");
      }
    } catch {
      setError("Gagal membuat invoice. Coba lagi.");
    } finally {
      setIsUpgrading(false);
    }
  }

  if (status === "loading" || subLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-[var(--text)] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const freeFeatures = [
    "1 debat per hari",
    "Persona template dasar",
    "Template debat gratis",
    "Riwayat debat",
  ];

  const proFeatures = [
    "Unlimited debat",
    "Custom persona (max 10)",
    "Semua template termasuk Pro",
    "Badge Pro",
    "Prioritas akses fitur baru",
  ];

  return (
    <div className="relative min-h-full">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0818] to-[#0a0a12]" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-red-700/8 rounded-full filter blur-[120px] animate-pulse" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-purple-700/10 rounded-full filter blur-[110px] animate-pulse delay-700" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-indigo-900/10 rounded-full filter blur-[120px] animate-pulse delay-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080612]/50 via-transparent to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Upgrade ke Pro</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Debat tanpa batas, persona custom, dan semua template.
          </p>
        </div>

        {/* Status messages */}
        {successMsg && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm text-[var(--advocate)] text-center"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            {successMsg}
          </div>
        )}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm text-[var(--devil)] text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
            {pendingInvoiceUrl && (
              <>
                {" "}
                <a
                  href={pendingInvoiceUrl}
                  className="underline text-[var(--devil)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bayar sekarang
                </a>
              </>
            )}
          </div>
        )}

        {/* Comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Free card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="mb-4">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Free
              </span>
              <div className="mt-1 text-2xl font-bold text-[var(--text)]">
                Rp 0
                <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
              </div>
            </div>
            <ul className="space-y-2 mb-6">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Check size={14} className="text-[var(--text-subtle)] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div
              className="px-4 py-2 rounded-lg text-center text-sm text-[var(--text-muted)]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {isPro ? "Plan sebelumnya" : "Plan kamu sekarang"}
            </div>
          </div>

          {/* Pro card */}
          <div
            className="rounded-2xl p-6 relative"
            style={{
              background: "rgba(245,158,11,0.04)",
              border: "1px solid rgba(245,158,11,0.25)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 32px rgba(245,158,11,0.06)",
            }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--judge)" }}
              >
                Recommended
              </span>
            </div>
            <div className="mb-4">
              <span className="text-xs font-medium text-[var(--judge)] uppercase tracking-wider">
                Pro
              </span>
              <div className="mt-1 text-2xl font-bold text-[var(--text)]">
                Rp 49.000
                <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
              </div>
            </div>
            <ul className="space-y-2 mb-6">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text)]">
                  <Check size={14} className="text-[var(--judge)] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isPro ? (
              <div
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--judge)]"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <Zap size={14} />
                Plan kamu sekarang
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold transition-all active:scale-95"
                style={{ background: "var(--judge)", color: "#0a0a0a" }}
              >
                {isUpgrading ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                {isUpgrading ? "Memproses..." : "Upgrade Sekarang"}
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center space-y-1">
          <p className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Lock size={11} />
            Pembayaran aman via Pakasir
          </p>
          <p className="text-xs text-[var(--text-muted)]">Batalkan kapan saja</p>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-[var(--text)] rounded-full animate-spin" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}

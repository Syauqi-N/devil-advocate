"use client";

import { useState, useEffect } from "react";
import { X, Check, Sparkles, AlertCircle } from "lucide-react";

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "daily_limit" | "custom_persona" | "pro_template";
}

const TRIGGER_CONTENT: Record<
  UpgradePromptModalProps["trigger"],
  { title: string; description: string }
> = {
  daily_limit: {
    title: "Batas debat harian tercapai",
    description:
      "Kamu sudah pakai 1 debat gratis hari ini. Upgrade ke Pro untuk unlimited debat.",
  },
  custom_persona: {
    title: "Custom Persona — Fitur Pro",
    description:
      "Custom persona adalah fitur Pro. Upgrade untuk buat persona Advocate & Devil sesuai konteks kamu.",
  },
  pro_template: {
    title: "Template Pro",
    description:
      "Template ini khusus Pro. Upgrade untuk akses semua template debat siap pakai.",
  },
};

const PRO_FEATURES = [
  "Unlimited debat per hari",
  "Custom persona (max 10)",
  "Semua template debat termasuk Pro",
  "Badge Pro di profile",
];

export function UpgradePromptModal({
  isOpen,
  onClose,
  trigger,
}: UpgradePromptModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvoiceUrl, setPendingInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPendingInvoiceUrl(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = TRIGGER_CONTENT[trigger];

  async function handleUpgrade() {
    setIsLoading(true);
    setError(null);
    setPendingInvoiceUrl(null);
    try {
      const res = await fetch("/api/subscription/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.detail === "Pending payment exists" && data?.payment_url) {
          setPendingInvoiceUrl(data.payment_url);
          setError("Ada pembayaran yang belum selesai.");
        } else if (data?.detail === "Already Pro subscriber") {
          setError("Kamu sudah berlangganan Pro.");
        } else {
          setError(data?.detail || data?.message || "Gagal memproses. Coba lagi.");
        }
        setIsLoading(false);
        return;
      }
      const url = data?.payment_url;
      if (url) {
        window.location.href = url;
      } else {
        setError("Gagal mendapatkan link pembayaran. Coba lagi.");
        setIsLoading(false);
      }
    } catch (e) {
      console.error("create-invoice failed:", e);
      setError("Gagal memproses. Coba lagi.");
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#111] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Pro</span>
          </div>
          <h2
            id="upgrade-modal-title"
            className="text-lg font-semibold text-white mb-1.5"
          >
            {content.title}
          </h2>
          <p className="text-sm text-[#a3a3a3] leading-relaxed">
            {content.description}
          </p>
        </div>

        {/* Features */}
        <div className="px-6 pb-4">
          <ul className="space-y-2">
            {PRO_FEATURES.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-2 text-sm text-[#e5e5e5]"
              >
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price */}
        <div className="mx-6 mb-4 px-4 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">Rp 49.000</span>
          <span className="text-sm text-[#737373]">/bulan</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-3 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 flex items-start gap-2 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <div>{error}</div>
              {pendingInvoiceUrl && (
                <a
                  href={pendingInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline mt-1 inline-block text-red-300 hover:text-red-200"
                >
                  Buka invoice yang pending
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-6 pb-6 space-y-2">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Memproses..." : "Upgrade Sekarang"}
          </button>
          <p className="text-center text-[11px] text-[#555]">
            Pembayaran aman via Pakasir. Batalkan kapan saja.
          </p>
        </div>
      </div>
    </div>
  );
}

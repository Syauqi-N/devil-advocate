"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowUp, Zap, Sparkles, TrendingUp } from "lucide-react"
import { UpgradePromptModal } from "@/components/UpgradePromptModal"

const EXAMPLE_BUSINESSES = [
  "Toko baju online di Instagram, sudah 2 tahun berjalan",
  "Warung makan padang di Jakarta Selatan",
  "Jasa desain grafis freelance, klien UMKM",
  "Toko kue rumahan, jual via WhatsApp",
  "Klinik kecantikan di Surabaya, buka 1 tahun",
]

export default function MarketingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    fetch("/api/marketing/usage")
      .then((r) => r.json())
      .then((data) => {
        setUsage(data)
        setIsPro(data.limit === -1)
      })
      .catch(() => {})
  }, [session])

  const isLimitReached = !isPro && usage !== null && usage.remaining === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    if (!session?.user) {
      const params = new URLSearchParams({ next: "/marketing", description: description.trim() })
      router.push(`/login?${params.toString()}`)
      return
    }

    if (isLimitReached) {
      setUpgradeOpen(true)
      return
    }

    setLoading(true)
    try {
      sessionStorage.setItem("pendingMarketing", JSON.stringify({ business_description: description.trim() }))
      router.push("/marketing/new?streaming=true")
    } catch (err) {
      console.error(err)
      sessionStorage.removeItem("pendingMarketing")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full px-4 py-12 sm:py-20 overflow-hidden">

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0818] to-[#0a0a12]" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-green-700/8 rounded-full filter blur-[120px] animate-pulse" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-purple-700/10 rounded-full filter blur-[110px] animate-pulse delay-700" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-indigo-900/10 rounded-full filter blur-[120px] animate-pulse delay-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080612]/50 via-transparent to-transparent" />
      </div>

      {/* Hero */}
      <div className="text-center mb-10 animate-slide-up">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{
            background: "linear-gradient(135deg, #0a1a0f 0%, #0f2a1a 100%)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <TrendingUp size={26} className="text-[var(--advocate)]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] mb-2 tracking-tight">
          AI Marketing
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
          Ceritakan bisnismu, AI akan tanya beberapa hal, lalu buat strategi marketing yang actionable.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl animate-fade-in" style={{ animationDelay: "80ms" }}>
        <div
          className="input-glow rounded-2xl overflow-hidden transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Ceritakan bisnismu secara singkat... (jenis usaha, sudah berapa lama, kondisi saat ini)"
            rows={4}
            className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-white/90 placeholder:text-white/20 resize-none focus:outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-xs text-white/30">
              AI akan mengajukan max 5 pertanyaan kontekstual
            </p>
            <button
              type="submit"
              disabled={!description.trim() || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition-all duration-150"
              style={{
                background: "var(--advocate)",
                color: "#0a0a0a",
              }}
            >
              {loading ? <span className="spinner" style={{ borderTopColor: "#0a0a0a", borderColor: "rgba(0,0,0,0.2)" }} /> : <ArrowUp size={13} strokeWidth={2.5} />}
              {loading ? "Memproses..." : "Mulai"}
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLE_BUSINESSES.map((b, i) => (
            <button
              key={b}
              type="button"
              onClick={() => setDescription(b)}
              style={{ animationDelay: `${120 + i * 30}ms`, border: "1px solid rgba(255,255,255,0.06)" }}
              className="animate-fade-in flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 bg-white/[0.02] rounded-full hover:text-white/70 hover:border-white/[0.1] hover:bg-white/[0.04] active:scale-95 transition-all duration-150"
            >
              <span className="opacity-60">🏪</span>
              {b}
            </button>
          ))}
        </div>
      </form>

      {/* Quota */}
      {session?.user && (
        <div className="mt-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
          {isPro ? (
            <div className="flex items-center gap-1.5 text-xs">
              <Sparkles size={11} className="text-[var(--judge)]" />
              <span className="pro-text font-medium">Unlimited — Pro</span>
            </div>
          ) : usage ? (
            <div className={`flex items-center gap-1.5 text-xs ${isLimitReached ? "text-[var(--devil)]" : "text-[var(--text-muted)]"}`}>
              <Zap size={11} />
              <span>
                {isLimitReached
                  ? "Batas harian tercapai — "
                  : `${usage.remaining}/${usage.limit} sesi tersisa hari ini — `}
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="underline underline-offset-2 hover:text-[var(--text)] transition-colors"
                >
                  Upgrade Pro
                </button>
              </span>
            </div>
          ) : null}
        </div>
      )}

      <UpgradePromptModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger="daily_limit"
      />
    </div>
  )
}

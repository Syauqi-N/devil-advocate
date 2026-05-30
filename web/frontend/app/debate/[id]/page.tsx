"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Share2, ArrowLeft, Copy, Check } from "lucide-react"

interface Round {
  round: number
  advocate: string
  devil: string
}

interface PartialRound {
  round: number
  advocate: string | null
  devil: string | null
}

interface Verdict {
  summary: string
  risks: string[]
  opportunities: string[]
  verdict: "LANJUT" | "PIVOT" | "STOP"
  action_items: string[]
}

const verdictConfig = {
  LANJUT: { color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", emoji: "✅", label: "LANJUT", desc: "Ide viable, lanjutkan eksekusi", cls: "verdict-lanjut" },
  PIVOT:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", emoji: "⚠️", label: "PIVOT",  desc: "Ada potensi, tapi perlu ubah arah", cls: "verdict-pivot" },
  STOP:   { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  emoji: "🛑", label: "STOP",   desc: "Risiko terlalu tinggi", cls: "verdict-stop" },
}

/* ── Skeleton helpers ── */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className}`} />
}

function ArgumentSkeleton() {
  return (
    <div className="space-y-2 pt-1">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

/* ── Round card ── */
function RoundCard({
  round, advocate, devil, isNew,
}: {
  round: number
  advocate: string | null
  devil: string | null
  isNew?: boolean
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        animation: isNew ? "fadeIn 0.4s ease both" : undefined,
      }}
    >
      {/* Round header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Round {round}
        </span>
        {(!advocate || !devil) && (
          <span className="flex gap-1 ml-1">
            <span className="typing-dot bg-[var(--text-subtle)]" />
            <span className="typing-dot bg-[var(--text-subtle)]" />
            <span className="typing-dot bg-[var(--text-subtle)]" />
          </span>
        )}
      </div>

      {/* 2-col on md+, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        {/* Advocate */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--advocate)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--advocate)] uppercase tracking-wide">
              Advocate
            </span>
          </div>
          {advocate ? (
            <p className="text-sm text-[var(--text)] leading-7 whitespace-pre-wrap" style={{ animation: "fadeIn 0.4s ease both" }}>
              {advocate}
            </p>
          ) : (
            <ArgumentSkeleton />
          )}
        </div>

        {/* Devil */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--devil)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--devil)] uppercase tracking-wide">
              Devil
            </span>
          </div>
          {devil ? (
            <p className="text-sm text-[var(--text)] leading-7 whitespace-pre-wrap" style={{ animation: "fadeIn 0.4s ease both" }}>
              {devil}
            </p>
          ) : (
            <ArgumentSkeleton />
          )}
        </div>
      </div>
    </div>
  )
}

function RoundSkeleton({ roundNum }: { roundNum: number }) {
  return (
    <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
      <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Round {roundNum}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--advocate)]" />
            <span className="text-xs font-semibold text-[var(--advocate)] uppercase tracking-wide">Advocate</span>
          </div>
          <ArgumentSkeleton />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--devil)]" />
            <span className="text-xs font-semibold text-[var(--devil)] uppercase tracking-wide">Devil</span>
          </div>
          <ArgumentSkeleton />
        </div>
      </div>
    </div>
  )
}

function VerdictSkeleton() {
  return (
    <div className="rounded-2xl p-6 animate-fade-in" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">⚖️</span>
        <span className="text-sm font-semibold text-[var(--judge)]">Judge — Verdict</span>
        <span className="flex gap-1 ml-1">
          <span className="typing-dot bg-[var(--judge)]" style={{ opacity: 0.6 }} />
          <span className="typing-dot bg-[var(--judge)]" style={{ opacity: 0.6 }} />
          <span className="typing-dot bg-[var(--judge)]" style={{ opacity: 0.6 }} />
        </span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  )
}

/* ── Verdict card ── */
function VerdictCard({ verdict, shareUrl, shareToken }: { verdict: Verdict; shareUrl: string; shareToken: string }) {
  const [copied, setCopied] = useState(false)
  const vc = verdictConfig[verdict.verdict] ?? verdictConfig.LANJUT

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden animate-verdict-pop ${vc.cls}`}
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${vc.border}`, backdropFilter: "blur(12px)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${vc.border}`, background: vc.bg }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <span className="text-sm font-semibold text-[var(--judge)]">Judge — Verdict</span>
        </div>
        {shareToken && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
            >
              {copied ? <Check size={11} className="text-[var(--advocate)]" /> : <Copy size={11} />}
              {copied ? "Tersalin!" : "Salin link"}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
            >
              <Share2 size={11} />
              Share
            </a>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Verdict badge — big and dramatic */}
        <div className="flex flex-col items-center text-center mb-6 py-4">
          <span className="text-4xl mb-3">{vc.emoji}</span>
          <span
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ color: vc.color }}
          >
            {vc.label}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{vc.desc}</span>
        </div>

        {/* Summary */}
        {verdict.summary && (
          <p className="text-sm text-[var(--text)] leading-7 mb-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
            {verdict.summary}
          </p>
        )}

        {/* Risks + Opportunities — 2 col on md */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {verdict.risks?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                Risiko
              </p>
              <ul className="space-y-2">
                {verdict.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--text)] leading-relaxed">
                    <span className="text-[var(--devil)] mt-0.5 shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verdict.opportunities?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
                Peluang
              </p>
              <ul className="space-y-2">
                {verdict.opportunities.map((o, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--text)] leading-relaxed">
                    <span className="text-[var(--advocate)] mt-0.5 shrink-0">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action items */}
        {verdict.action_items?.length > 0 && (
          <div className="pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
              Action Items
            </p>
            <ol className="space-y-2">
              {verdict.action_items.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm text-[var(--text)] leading-relaxed">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: `${vc.color}18`, color: vc.color }}
                  >
                    {i + 1}
                  </span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function DebatePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="space-y-4">
          <RoundSkeleton roundNum={1} />
          <RoundSkeleton roundNum={2} />
          <RoundSkeleton roundNum={3} />
        </div>
      </div>
    }>
      <DebatePageInner params={params} />
    </Suspense>
  )
}

function DebatePageInner({ params }: { params: { id: string } }) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isStreaming = searchParams.get("streaming") === "true"

  const [topic, setTopic] = useState("")
  const [partialRounds, setPartialRounds] = useState<PartialRound[]>([])
  const [completedRounds, setCompletedRounds] = useState<Round[]>([])
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [done, setDone] = useState(false)
  const [shareToken, setShareToken] = useState("")
  const [createdAt, setCreatedAt] = useState("")
  const [totalRounds, setTotalRounds] = useState(3)
  const [error, setError] = useState<string | null>(null)
  const streamStarted = useRef(false)

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push(`/login?next=/debate/${params.id}`)
  }, [sessionStatus, router, params.id])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return
    if (streamStarted.current) return
    streamStarted.current = true
    if (isStreaming) startStreaming()
    else fetchDebate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus])

  async function fetchDebate() {
    const poll = async (): Promise<boolean> => {
      try {
        const res = await fetch(`/api/debate/${params.id}`, { cache: "no-store" })
        if (!res.ok) { setError("Debate tidak ditemukan."); return true }
        const data = await res.json()
        setTopic(data.topic)
        setShareToken(data.share_token)
        setCreatedAt(data.created_at)
        if (data.verdict) {
          setCompletedRounds(data.rounds ?? [])
          setPartialRounds([])
          setVerdict(data.verdict)
          setTotalRounds(data.rounds?.length ?? 3)
          setDone(true)
          return true
        }
        setCompletedRounds(data.rounds ?? [])
        setTotalRounds(data.rounds?.length > 0 ? data.rounds.length : 3)
        return false
      } catch { setError("Gagal memuat debate."); return true }
    }
    const isDone = await poll()
    if (isDone) return
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      const finished = await poll()
      if (finished || attempts >= 60) { clearInterval(interval); if (attempts >= 60) setDone(true) }
    }, 2000)
  }

  async function startStreaming() {
    const pending = (() => { try { return JSON.parse(sessionStorage.getItem("pendingDebate") ?? "{}") } catch { return {} } })()
    if (pending.topic) setTopic(pending.topic)
    if (pending.rounds_count) setTotalRounds(pending.rounds_count)
    if (!pending.topic) {
      if (params.id !== "new") await fetchDebate()
      else setError("Data debat tidak ditemukan. Silakan mulai debat baru.")
      return
    }
    const res = await fetch("/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    })
    sessionStorage.removeItem("pendingDebate")
    if (res.status === 429) { sessionStorage.setItem("showUpgradeModal", "daily_limit"); router.push("/"); return }
    if (!res.ok) { setError("Gagal memulai debate."); return }
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    await consumeStream(reader, decoder)
  }

  async function consumeStream(reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder) {
    let buffer = ""
    try {
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try { handleEvent(JSON.parse(line.slice(6))) } catch {}
        }
      }
      if (buffer.startsWith("data: ")) { try { handleEvent(JSON.parse(buffer.slice(6))) } catch {} }
    } catch { setError("Stream terputus. Coba refresh halaman.") }
  }

  function handleEvent(event: any) {
    if (event.type === "init") {
      if (event.share_token) setShareToken(event.share_token)
      if (event.debate_id) window.history.replaceState(null, "", `/debate/${event.debate_id}?streaming=true`)
    } else if (event.type === "round") {
      const roundNum = event.round
      setPartialRounds((prev) => prev.filter((r) => r.round !== roundNum))
      setCompletedRounds((prev) => {
        if (prev.find((r) => r.round === roundNum)) return prev
        return [...prev, { round: roundNum, advocate: event.advocate, devil: event.devil }]
      })
    } else if (event.type === "round_start") {
      setPartialRounds((prev) => {
        if (prev.find((r) => r.round === event.round)) return prev
        return [...prev, { round: event.round, advocate: null, devil: null }]
      })
    } else if (event.type === "verdict") {
      const v = event.verdict ?? event.content
      if (typeof v === "string") {
        try { setVerdict(JSON.parse(v)) }
        catch { setVerdict({ summary: v, risks: [], opportunities: [], verdict: "LANJUT", action_items: [] }) }
      } else if (v && typeof v === "object") setVerdict(v)
    } else if (event.type === "done") {
      if (event.share_token) setShareToken(event.share_token)
      if (event.debate_id) window.history.replaceState(null, "", `/debate/${event.debate_id}`)
      setPartialRounds([])
      setDone(true)
    } else if (event.type === "error") {
      setError(event.message ?? event.detail ?? "Terjadi kesalahan.")
    }
  }

  const allRounds = [
    ...completedRounds.map((r) => ({ ...r, isPartial: false })),
    ...partialRounds.map((r) => ({ ...r, isPartial: true })),
  ].sort((a, b) => a.round - b.round)

  const skeletonCount = Math.max(0, totalRounds - allRounds.length)
  const allRoundsReceived = allRounds.length >= totalRounds && partialRounds.every((r) => r.advocate && r.devil)
  const shareUrl = shareToken ? `https://debate.soqisoqi.my.id/share/${shareToken}` : "#"

  if (sessionStatus === "loading") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((n) => <RoundSkeleton key={n} roundNum={n} />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline mb-6">
          <ArrowLeft size={12} /> Kembali
        </Link>
        <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm text-[var(--devil)]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0818] to-[#0a0a12]" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-red-700/8 rounded-full filter blur-[120px] animate-pulse" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-purple-700/10 rounded-full filter blur-[110px] animate-pulse delay-700" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-indigo-900/10 rounded-full filter blur-[120px] animate-pulse delay-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080612]/50 via-transparent to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline mb-5">
          <ArrowLeft size={12} /> Kembali
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {topic ? (
              <h1 className="text-xl font-semibold text-[var(--text)] mb-1.5 leading-snug">{topic}</h1>
            ) : (
              <Skeleton className="h-6 w-72 mb-1.5" />
            )}
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
              {createdAt && (
                <span>
                  {new Date(createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
              {createdAt && <span className="text-[var(--text-subtle)]">·</span>}
              {done ? (
                <span className="text-[var(--advocate)]">✓ Selesai</span>
              ) : (
                <span className="text-[var(--judge)] flex items-center gap-1">
                  <span className="typing-dot bg-[var(--judge)]" />
                  <span className="typing-dot bg-[var(--judge)]" />
                  <span className="typing-dot bg-[var(--judge)]" />
                  <span className="ml-1">Generating</span>
                </span>
              )}
            </p>
          </div>
        </div>
        {!done && (
          <p className="text-xs text-[var(--text-subtle)] mt-3">⏱ Estimasi waktu: ~45–90 detik</p>
        )}
      </div>

      {/* Rounds */}
      <div className="space-y-4 mb-6">
        {allRounds.map((r) => (
          <RoundCard key={r.round} round={r.round} advocate={r.advocate} devil={r.devil} isNew={r.isPartial} />
        ))}
        {!done && Array.from({ length: skeletonCount }).map((_, i) => (
          <RoundSkeleton key={`skel-${i}`} roundNum={allRounds.length + i + 1} />
        ))}
      </div>

      {/* Verdict */}
      {verdict ? (
        <VerdictCard verdict={verdict} shareUrl={shareUrl} shareToken={shareToken} />
      ) : done && !verdict ? (
        <VerdictSkeleton />
      ) : !done && allRoundsReceived ? (
        <VerdictSkeleton />
      ) : null}
      </div>
    </div>
  )
}

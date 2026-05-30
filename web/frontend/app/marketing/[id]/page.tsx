"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, Copy, Check, TrendingUp, ChevronRight } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  question_number: number
  question_text: string
  options: string[]
  answer: string | null
}

interface StrategyChannel {
  name: string
  tactic: string
  budget_pct: number
  priority: "high" | "medium" | "low"
}

interface StrategyTimeline {
  period: string
  focus: string
  actions: string[]
}

interface Strategy {
  summary: string
  positioning: string
  target_audience: string
  channels: StrategyChannel[]
  budget_allocation: string
  timeline: StrategyTimeline[]
  kpis: string[]
  quick_wins: string[]
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className}`} />
}

// ---------------------------------------------------------------------------
// Question Card
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  onAnswer,
  isActive,
}: {
  question: Question
  onAnswer: (answer: string) => void
  isActive: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [custom, setCustom] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const answered = question.answer !== null

  function handleSelect(opt: string) {
    if (!isActive || answered) return
    setSelected(opt)
    setShowCustom(false)
    setCustom("")
  }

  function handleCustomToggle() {
    if (!isActive || answered) return
    setShowCustom(true)
    setSelected(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSubmit() {
    const answer = showCustom ? custom.trim() : selected
    if (!answer) return
    onAnswer(answer)
  }

  const displayAnswer = answered ? question.answer : null

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-in"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Question header */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: "rgba(34,197,94,0.15)", color: "var(--advocate)" }}
        >
          {question.question_number}
        </span>
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Pertanyaan {question.question_number}
        </span>
        {answered && (
          <span className="ml-auto text-xs text-[var(--advocate)] flex items-center gap-1">
            <Check size={11} /> Terjawab
          </span>
        )}
        {!answered && isActive && (
          <span className="ml-auto flex gap-1">
            <span className="typing-dot bg-[var(--advocate)]" />
            <span className="typing-dot bg-[var(--advocate)]" />
            <span className="typing-dot bg-[var(--advocate)]" />
          </span>
        )}
      </div>

      <div className="p-5">
        {/* Question text */}
        <p className="text-sm font-medium text-[var(--text)] mb-4 leading-relaxed">
          {question.question_text}
        </p>

        {/* If answered — show answer */}
        {displayAnswer ? (
          <div
            className="px-4 py-2.5 rounded-xl text-sm text-[var(--text)]"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
          >
            {displayAnswer}
          </div>
        ) : isActive ? (
          <>
            {/* Options */}
            <div className="flex flex-wrap gap-2 mb-3">
              {question.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
                    selected === opt
                      ? "text-[var(--advocate)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  style={{
                    border: selected === opt
                      ? "1px solid rgba(34,197,94,0.4)"
                      : "1px solid var(--border)",
                    background: selected === opt
                      ? "rgba(34,197,94,0.08)"
                      : "var(--bg-elevated)",
                  }}
                >
                  {opt}
                </button>
              ))}
              {/* Custom answer toggle */}
              <button
                type="button"
                onClick={handleCustomToggle}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                  showCustom
                    ? "text-[var(--judge)]"
                    : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                }`}
                style={{
                  border: showCustom
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px dashed var(--border)",
                  background: showCustom ? "rgba(245,158,11,0.06)" : "transparent",
                }}
              >
                + Jawaban lain
              </button>
            </div>

            {/* Custom input */}
            {showCustom && (
              <input
                ref={inputRef}
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
                placeholder="Ketik jawaban kamu..."
                className="w-full bg-transparent px-4 py-2.5 rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none mb-3"
                style={{ border: "1px solid var(--border-hover)" }}
              />
            )}

            {/* Submit button */}
            {(selected || (showCustom && custom.trim())) && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: "var(--advocate)", color: "#0a0a0a" }}
                >
                  Lanjut <ChevronRight size={12} />
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Strategy Card
// ---------------------------------------------------------------------------

const priorityConfig = {
  high:   { label: "Prioritas Tinggi", color: "var(--devil)" },
  medium: { label: "Prioritas Sedang", color: "var(--judge)" },
  low:    { label: "Prioritas Rendah", color: "var(--text-muted)" },
}

function StrategyCard({ strategy, shareUrl, shareToken }: { strategy: Strategy; shareUrl: string; shareToken: string }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4 animate-verdict-pop">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, var(--card) 100%)",
          border: "1px solid rgba(34,197,94,0.2)",
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--advocate)]" />
            <span className="text-sm font-semibold text-[var(--advocate)]">Strategi Marketing</span>
          </div>
          {shareToken && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                {copied ? <Check size={11} className="text-[var(--advocate)]" /> : <Copy size={11} />}
                {copied ? "Tersalin!" : "Salin link"}
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <Share2 size={11} /> Share
              </a>
            </div>
          )}
        </div>
        <p className="text-sm text-[var(--text)] leading-7">{strategy.summary}</p>
      </div>

      {/* Positioning + Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Positioning</p>
          <p className="text-sm text-[var(--text)] leading-relaxed">{strategy.positioning}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Target Audience</p>
          <p className="text-sm text-[var(--text)] leading-relaxed">{strategy.target_audience}</p>
        </div>
      </div>

      {/* Quick wins */}
      {strategy.quick_wins?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">⚡ Quick Wins</p>
          <div className="space-y-2">
            {strategy.quick_wins.map((w, i) => (
              <div key={i} className="flex gap-3 text-sm text-[var(--text)] leading-relaxed">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{ background: "rgba(34,197,94,0.12)", color: "var(--advocate)" }}
                >
                  {i + 1}
                </span>
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      {strategy.channels?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">📣 Marketing Channels</p>
          <div className="space-y-3">
            {strategy.channels.map((ch, i) => {
              const pc = priorityConfig[ch.priority] ?? priorityConfig.medium
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text)]">{ch.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: pc.color }}>{pc.label}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(34,197,94,0.1)", color: "var(--advocate)" }}
                      >
                        {ch.budget_pct}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{ch.tactic}</p>
                </div>
              )
            })}
          </div>
          {strategy.budget_allocation && (
            <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 leading-relaxed" style={{ borderTop: "1px solid var(--border)" }}>
              💰 {strategy.budget_allocation}
            </p>
          )}
        </div>
      )}

      {/* Timeline */}
      {strategy.timeline?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">📅 Timeline</p>
          <div className="space-y-4">
            {strategy.timeline.map((t, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(34,197,94,0.1)", color: "var(--advocate)", border: "1px solid rgba(34,197,94,0.2)" }}
                  >
                    {i + 1}
                  </div>
                  {i < strategy.timeline.length - 1 && (
                    <div className="w-px flex-1 mt-2" style={{ background: "var(--border)" }} />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <p className="text-xs font-semibold text-[var(--advocate)] mb-0.5">{t.period}</p>
                  <p className="text-sm font-medium text-[var(--text)] mb-2">{t.focus}</p>
                  <ul className="space-y-1">
                    {t.actions.map((a, j) => (
                      <li key={j} className="flex gap-2 text-xs text-[var(--text-muted)] leading-relaxed">
                        <span className="text-[var(--advocate)] mt-0.5 shrink-0">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      {strategy.kpis?.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">📊 KPIs</p>
          <div className="flex flex-wrap gap-2">
            {strategy.kpis.map((kpi, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {kpi}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function MarketingSessionPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    }>
      <MarketingSessionInner params={params} />
    </Suspense>
  )
}

function MarketingSessionInner({ params }: { params: { id: string } }) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isStreaming = searchParams.get("streaming") === "true"

  const [sessionId, setSessionId] = useState<string>(params.id === "new" ? "" : params.id)
  const [shareToken, setShareToken] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)
  const streamStarted = useRef(false)

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push(`/login?next=/marketing/${params.id}`)
  }, [sessionStatus, router, params.id])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return
    if (streamStarted.current) return
    streamStarted.current = true
    if (isStreaming) startStreaming()
    else fetchSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus])

  async function fetchSession() {
    try {
      const res = await fetch(`/api/marketing/${params.id}`, { cache: "no-store" })
      if (!res.ok) { setError("Sesi tidak ditemukan."); return }
      const data = await res.json()
      applySessionData(data)
    } catch { setError("Gagal memuat sesi.") }
  }

  function applySessionData(data: any) {
    setBusinessDescription(data.business_description ?? "")
    setShareToken(data.share_token ?? "")
    setQuestions(data.questions ?? [])
    if (data.strategy) { setStrategy(data.strategy); setDone(true) }
  }

  async function startStreaming() {
    const pending = (() => { try { return JSON.parse(sessionStorage.getItem("pendingMarketing") ?? "{}") } catch { return {} } })()
    if (pending.business_description) setBusinessDescription(pending.business_description)

    if (!pending.business_description) {
      if (params.id !== "new") await fetchSession()
      else setError("Data tidak ditemukan. Silakan mulai sesi baru.")
      return
    }

    const res = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    })
    sessionStorage.removeItem("pendingMarketing")

    if (res.status === 429) {
      sessionStorage.setItem("showUpgradeModal", "daily_limit")
      router.push("/marketing")
      return
    }
    if (!res.ok) { setError("Gagal memulai sesi."); return }

    await consumeStream(res)
  }

  async function consumeStream(res: Response) {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
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
    finally { setIsAnswering(false) }
  }

  function handleEvent(event: any) {
    if (event.type === "init") {
      if (event.session_id) {
        setSessionId(event.session_id)
        window.history.replaceState(null, "", `/marketing/${event.session_id}?streaming=true`)
      }
      if (event.share_token) setShareToken(event.share_token)
    } else if (event.type === "question") {
      setQuestions((prev) => {
        if (prev.find((q) => q.question_number === event.number)) return prev
        return [...prev, {
          question_number: event.number,
          question_text: event.text,
          options: event.options ?? [],
          answer: null,
        }]
      })
    } else if (event.type === "generating_strategy") {
      setIsGeneratingStrategy(true)
    } else if (event.type === "strategy") {
      setStrategy(event.content)
      setIsGeneratingStrategy(false)
    } else if (event.type === "done") {
      window.history.replaceState(null, "", `/marketing/${sessionId || params.id}`)
      setDone(true)
      setIsAnswering(false)
    } else if (event.type === "error") {
      setError(event.message ?? "Terjadi kesalahan.")
      setIsAnswering(false)
    }
  }

  async function handleAnswer(questionNumber: number, answer: string) {
    if (!sessionId || isAnswering) return
    setIsAnswering(true)

    // Optimistically update question answer
    setQuestions((prev) =>
      prev.map((q) => q.question_number === questionNumber ? { ...q, answer } : q)
    )

    const res = await fetch("/api/marketing/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, answer }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.detail || "Gagal mengirim jawaban.")
      setIsAnswering(false)
      return
    }

    await consumeStream(res)
  }

  const activeQuestionIndex = questions.findIndex((q) => q.answer === null)
  const shareUrl = shareToken ? `https://debate.soqisoqi.my.id/share/marketing/${shareToken}` : "#"

  if (sessionStatus === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-32 mb-8" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/marketing" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline mb-6">
          <ArrowLeft size={12} /> Kembali
        </Link>
        <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm text-[var(--devil)]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <Link href="/marketing" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline mb-5">
          <ArrowLeft size={12} /> Kembali
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={16} className="text-[var(--advocate)]" />
          <h1 className="text-base font-semibold text-[var(--text)]">AI Marketing</h1>
        </div>
        {businessDescription && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2">{businessDescription}</p>
        )}
        <p className="text-xs text-[var(--text-subtle)] mt-1.5 flex items-center gap-2">
          {done ? (
            <span className="text-[var(--advocate)]">✓ Strategi siap</span>
          ) : isGeneratingStrategy ? (
            <span className="text-[var(--judge)] flex items-center gap-1.5">
              <span className="typing-dot bg-[var(--judge)]" />
              <span className="typing-dot bg-[var(--judge)]" />
              <span className="typing-dot bg-[var(--judge)]" />
              <span className="ml-1">Menyusun strategi...</span>
            </span>
          ) : (
            <span className="text-[var(--judge)] flex items-center gap-1.5">
              <span className="typing-dot bg-[var(--judge)]" />
              <span className="typing-dot bg-[var(--judge)]" />
              <span className="typing-dot bg-[var(--judge)]" />
              <span className="ml-1">Menganalisis bisnis...</span>
            </span>
          )}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.question_number}
            question={q}
            onAnswer={(answer) => handleAnswer(q.question_number, answer)}
            isActive={i === activeQuestionIndex && !isAnswering}
          />
        ))}

        {/* Generating strategy skeleton */}
        {isGeneratingStrategy && (
          <div className="rounded-2xl p-5 animate-fade-in" style={{ background: "var(--card)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-[var(--advocate)]" />
              <span className="text-sm font-semibold text-[var(--advocate)]">Menyusun strategi marketing...</span>
              <span className="flex gap-1 ml-1">
                <span className="typing-dot bg-[var(--advocate)]" />
                <span className="typing-dot bg-[var(--advocate)]" />
                <span className="typing-dot bg-[var(--advocate)]" />
              </span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        )}
      </div>

      {/* Strategy */}
      {strategy && (
        <StrategyCard strategy={strategy} shareUrl={shareUrl} shareToken={shareToken} />
      )}
    </div>
  )
}

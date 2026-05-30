import Image from "next/image"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

interface Round {
  round: number
  advocate: string
  devil: string
}

interface Verdict {
  summary: string
  risks: string[]
  opportunities: string[]
  verdict: "LANJUT" | "PIVOT" | "STOP"
  action_items: string[]
}

interface Debate {
  id: string
  topic: string
  rounds: Round[]
  verdict: Verdict | null
  created_at: string
}

async function getDebate(id: string): Promise<Debate | null> {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"
  try {
    const res = await fetch(`${apiUrl}/debates/share/${id}`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const debate = await getDebate(params.id)
  if (!debate) return { title: "Debat tidak ditemukan" }
  return {
    title: `${debate.topic} — Devil's Advocate`,
    description: `Hasil debat AI: ${debate.verdict?.verdict ?? ""} — ${debate.verdict?.summary ?? ""}`,
    openGraph: {
      title: `${debate.topic} — Devil's Advocate`,
      description: debate.verdict?.summary ?? "",
      type: "article",
    },
  }
}

const verdictConfig = {
  LANJUT: { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)",  emoji: "✅", label: "LANJUT", desc: "Ide viable, lanjutkan eksekusi" },
  PIVOT:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", emoji: "⚠️", label: "PIVOT",  desc: "Ada potensi, tapi perlu ubah arah" },
  STOP:   { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  emoji: "🛑", label: "STOP",   desc: "Risiko terlalu tinggi" },
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const debate = await getDebate(params.id)
  if (!debate) notFound()

  const verdictKey = debate.verdict?.verdict ?? "LANJUT"
  const vc = verdictConfig[verdictKey] ?? verdictConfig.LANJUT

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <Link href="/" className="flex items-center gap-1.5 no-underline group">
            <Image src="/logo.png" alt="Devil's Advocate" width={23} height={23} className="rounded-sm opacity-80 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
              Devil&apos;s Advocate
            </span>
          </Link>
          <span className="text-[var(--text-subtle)]">/</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Hasil Publik
          </span>
        </div>

        <h1 className="text-xl font-semibold text-[var(--text)] mb-2 leading-snug">
          {debate.topic}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {new Date(debate.created_at).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* Rounds */}
      <div className="space-y-4 mb-6">
        {debate.rounds?.map((r) => (
          <div
            key={r.round}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
            >
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Round {r.round}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--advocate)]" />
                  <span className="text-xs font-semibold text-[var(--advocate)] uppercase tracking-wide">Advocate</span>
                </div>
                <p className="text-sm text-[var(--text)] leading-7 whitespace-pre-wrap">{r.advocate}</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--devil)]" />
                  <span className="text-xs font-semibold text-[var(--devil)] uppercase tracking-wide">Devil</span>
                </div>
                <p className="text-sm text-[var(--text)] leading-7 whitespace-pre-wrap">{r.devil}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Verdict */}
      {debate.verdict && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--card)", border: `1px solid ${vc.border}` }}
        >
          {/* Header */}
          <div
            className="px-5 py-3 flex items-center gap-2"
            style={{ borderBottom: `1px solid ${vc.border}`, background: vc.bg }}
          >
            <span className="text-base">⚖️</span>
            <span className="text-sm font-semibold text-[var(--judge)]">Judge — Verdict</span>
          </div>

          <div className="p-6">
            {/* Badge */}
            <div className="flex flex-col items-center text-center mb-6 py-4">
              <span className="text-4xl mb-3">{vc.emoji}</span>
              <span className="text-2xl font-bold tracking-tight mb-1" style={{ color: vc.color }}>
                {vc.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">{vc.desc}</span>
            </div>

            {/* Summary */}
            {debate.verdict.summary && (
              <p className="text-sm text-[var(--text)] leading-7 mb-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
                {debate.verdict.summary}
              </p>
            )}

            {/* Risks + Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {debate.verdict.risks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Risiko</p>
                  <ul className="space-y-2">
                    {debate.verdict.risks.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--text)] leading-relaxed">
                        <span className="text-[var(--devil)] mt-0.5 shrink-0">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {debate.verdict.opportunities?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Peluang</p>
                  <ul className="space-y-2">
                    {debate.verdict.opportunities.map((o, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--text)] leading-relaxed">
                        <span className="text-[var(--advocate)] mt-0.5 shrink-0">•</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action items */}
            {debate.verdict.action_items?.length > 0 && (
              <div className="pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Action Items</p>
                <ol className="space-y-2">
                  {debate.verdict.action_items.map((a, i) => (
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
      )}

      {/* CTA */}
      <div className="mt-10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-3">Mau debatkan ide kamu sendiri?</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--text)] no-underline transition-all hover:bg-[var(--card-hover)] active:scale-95"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Image src="/logo.png" alt="Devil's Advocate" width={21} height={21} className="rounded-sm" />
          Coba Devil&apos;s Advocate — Gratis
        </Link>
      </div>
    </div>
  )
}

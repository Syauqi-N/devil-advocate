import Image from "next/image"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MessageSquare, Plus } from "lucide-react"

interface DebateItem {
  id: string
  topic: string
  created_at: string
  verdict?: { verdict: "LANJUT" | "PIVOT" | "STOP" } | string | null
}

async function getHistory(): Promise<DebateItem[]> {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001"
  const session = await auth()
  if (!session?.user) return []
  try {
    const res = await fetch(`${apiUrl}/debates`, {
      cache: "no-store",
      headers: {
        "x-user-id": (session.user as any).googleId ?? (session.user as any).id ?? "",
        "x-user-email": session.user.email ?? "",
        "x-user-name": session.user.name ?? "",
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.items ?? data.debates ?? []
  } catch {
    return []
  }
}

function getVerdictKey(verdict: DebateItem["verdict"]): string | null {
  if (!verdict) return null
  if (typeof verdict === "string") {
    try { return JSON.parse(verdict)?.verdict ?? null } catch { return null }
  }
  return verdict.verdict ?? null
}

const verdictConfig: Record<string, { color: string; label: string; emoji: string }> = {
  LANJUT: { color: "#22c55e", label: "LANJUT", emoji: "✅" },
  PIVOT:  { color: "#f59e0b", label: "PIVOT",  emoji: "⚠️" },
  STOP:   { color: "#ef4444", label: "STOP",   emoji: "🛑" },
}

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?next=/history")

  const debates = await getHistory()

  return (
    <div className="relative min-h-full bg-gradient-to-br from-[#0a0a0a] via-[#0d0818] to-[#0a0a12]">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-red-700/8 rounded-full filter blur-[120px]" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-purple-700/10 rounded-full filter blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-indigo-900/10 rounded-full filter blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080612]/50 via-transparent to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Riwayat Debat</h1>
          {debates.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{debates.length} debat</p>
          )}
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors no-underline"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <Plus size={12} />
          Debat Baru
        </Link>
      </div>

      {debates.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <MessageSquare size={20} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text)] mb-1">Belum ada debat</p>
          <p className="text-xs text-[var(--text-muted)] mb-5">
            Mulai debatkan ide atau keputusan pertamamu
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text)] no-underline transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Image src="/logo.png" alt="Devil's Advocate" width={21} height={21} className="rounded-sm" />
          Mulai Debat
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {debates.map((d, i) => {
            const verdictKey = getVerdictKey(d.verdict)
            const vc = verdictKey ? verdictConfig[verdictKey] : null

            return (
              <Link
                key={d.id}
                href={`/debate/${d.id}`}
                style={{
                  animationDelay: `${i * 30}ms`,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(12px)",
                }}
                className="animate-fade-in flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-white/[0.04] transition-all duration-150 no-underline group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <MessageSquare size={12} className="text-[var(--text-muted)]" />
                  </div>
                  <span className="text-sm text-[var(--text)] truncate leading-relaxed">
                    {d.topic}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {vc && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1"
                      style={{
                        color: vc.color,
                        background: `${vc.color}12`,
                        border: `1px solid ${vc.color}30`,
                      }}
                    >
                      {vc.emoji} {vc.label}
                    </span>
                  )}
                  {vc && (
                    <span
                      className="w-2 h-2 rounded-full sm:hidden shrink-0"
                      style={{ background: vc.color }}
                    />
                  )}
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(d.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, TrendingUp } from "lucide-react"

interface DebateItem {
  id: string
  topic: string
  rounds_count: number
  created_at: string
  verdict?: { verdict: "LANJUT" | "PIVOT" | "STOP" } | string | null
}

interface MarketingItem {
  id: string
  business_description: string
  share_token: string
  is_complete: boolean
  created_at: string
}

const verdictDot: Record<string, string> = {
  LANJUT: "#22c55e",
  PIVOT:  "#f59e0b",
  STOP:   "#ef4444",
}

function getVerdictKey(verdict: DebateItem["verdict"]): string | null {
  if (!verdict) return null
  if (typeof verdict === "string") {
    try { return JSON.parse(verdict)?.verdict ?? null } catch { return null }
  }
  return verdict.verdict ?? null
}

export default function Sidebar() {
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [debates, setDebates] = useState<DebateItem[]>([])
  const [marketingSessions, setMarketingSessions] = useState<MarketingItem[]>([])
  const pathname = usePathname()

  const fetchDebateHistory = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch("/api/history", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setDebates(Array.isArray(data) ? data : data.items ?? data.debates ?? [])
      }
    } catch {}
  }, [session])

  const fetchMarketingHistory = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch("/api/marketing?page=1&limit=20", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setMarketingSessions(Array.isArray(data) ? data : data.items ?? [])
      }
    } catch {}
  }, [session])

  useEffect(() => {
    fetchDebateHistory()
    fetchMarketingHistory()
  }, [fetchDebateHistory, fetchMarketingHistory])

  // Re-fetch on relevant page changes
  useEffect(() => {
    if (pathname?.startsWith("/debate/")) fetchDebateHistory()
    if (pathname?.startsWith("/marketing/")) fetchMarketingHistory()
  }, [pathname, fetchDebateHistory, fetchMarketingHistory])

  if (!session?.user) return null

  return (
    <aside
      className={`flex flex-col h-full transition-all duration-200 shrink-0 ${
        collapsed ? "w-12" : "w-60"
      }`}
      style={{ 
        borderRight: "1px solid rgba(255,255,255,0.06)", 
        background: "rgba(10,8,18,0.85)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {!collapsed ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-1.5 flex-1 px-2 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)] transition-colors no-underline text-xs font-medium"
            >
              <Plus size={13} />
              <span>Debat Baru</span>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-[var(--card)] transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 w-full">
            <Link
              href="/"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)] transition-colors no-underline"
              aria-label="New debate"
            >
              <Plus size={14} />
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-[var(--card)] transition-colors"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">

          {/* ── AI Marketing section ── */}
          <div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-widest">
                AI Marketing
              </p>
              <Link
                href="/marketing"
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-[var(--card)] transition-colors no-underline"
                title="Sesi Marketing Baru"
              >
                <Plus size={11} />
              </Link>
            </div>

            <div className="space-y-0.5">
              {marketingSessions.length === 0 ? (
                <Link
                  href="/marketing"
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-white/[0.05] transition-colors no-underline"
                >
                  <TrendingUp size={12} className="shrink-0" />
                  <span>Mulai sesi pertama</span>
                </Link>
              ) : (
                marketingSessions.map((m, i) => {
                  const isActive = pathname === `/marketing/${m.id}`
                  return (
                    <Link
                      key={m.id}
                      href={`/marketing/${m.id}`}
                      style={{ animationDelay: `${i * 25}ms` }}
                      className={`animate-fade-in relative flex items-start gap-2.5 px-2 py-2 rounded-lg text-xs transition-all duration-150 no-underline group ${
                        isActive
                          ? "sidebar-active bg-white/[0.05] text-[var(--text)]"
                          : "text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text)]"
                      }`}
                    >
                      <TrendingUp
                        size={12}
                        className="mt-0.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate leading-relaxed">{m.business_description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.is_complete ? "#22c55e" : "#f59e0b" }}
                          />
                          <p className="text-[10px] text-[var(--text-subtle)]">
                            {new Date(m.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="py-1">
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          </div>

          {/* ── Riwayat Debat section ── */}
          <div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-widest">
                Riwayat Debat
              </p>
              <Link
                href="/"
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-white/[0.05] transition-colors no-underline"
                title="Debat Baru"
              >
                <Plus size={11} />
              </Link>
            </div>

            <div className="space-y-0.5">
              {debates.length === 0 ? (
                <p className="px-2 py-2 text-xs text-[var(--text-subtle)]">
                  Belum ada debat
                </p>
              ) : (
                debates.map((d, i) => {
                  const isActive = pathname === `/debate/${d.id}`
                  const verdictKey = getVerdictKey(d.verdict)
                  const dotColor = verdictKey ? verdictDot[verdictKey] : null

                  return (
                    <Link
                      key={d.id}
                      href={`/debate/${d.id}`}
                      style={{ animationDelay: `${i * 25}ms` }}
                      className={`animate-fade-in relative flex items-start gap-2.5 px-2 py-2 rounded-lg text-xs transition-all duration-150 no-underline group ${
                        isActive
                          ? "sidebar-active bg-white/[0.05] text-[var(--text)]"
                          : "text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text)]"
                      }`}
                    >
                      <MessageSquare
                        size={12}
                        className="mt-0.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate leading-relaxed">{d.topic}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {dotColor && (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: dotColor }}
                            />
                          )}
                          <p className="text-[10px] text-[var(--text-subtle)]">
                            {new Date(d.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed: icon-only dots */}
      {collapsed && (
        <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1">
          {/* Marketing icon */}
          <Link
            href="/marketing"
            title="AI Marketing"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors no-underline ${
              pathname?.startsWith("/marketing") ? "bg-white/[0.05]" : "hover:bg-white/[0.05]"
            }`}
          >
            <TrendingUp size={13} className="text-[var(--advocate)]" />
          </Link>

          {/* Marketing session dots */}
          {marketingSessions.slice(0, 5).map((m) => (
            <Link
              key={m.id}
              href={`/marketing/${m.id}`}
              title={m.business_description}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors no-underline ${
                pathname === `/marketing/${m.id}` ? "bg-white/[0.05]" : "hover:bg-white/[0.05]"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.is_complete ? "#22c55e" : "#f59e0b" }} />
            </Link>
          ))}

          {/* Divider dot */}
          <div className="w-4 my-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

          {/* Debate dots */}
          {debates.slice(0, 8).map((d) => {
            const verdictKey = getVerdictKey(d.verdict)
            const dotColor = verdictKey ? verdictDot[verdictKey] : "var(--text-subtle)"
            return (
              <Link
                key={d.id}
                href={`/debate/${d.id}`}
                title={d.topic}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors no-underline ${
                  pathname === `/debate/${d.id}` ? "bg-white/[0.05]" : "hover:bg-white/[0.05]"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
              </Link>
            )
          })}
        </div>
      )}
    </aside>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { useSubscription } from "@/hooks/useSubscription"
import { ProBadge } from "./ProBadge"
import { LogOut, ChevronDown } from "lucide-react"

export default function Navbar() {
  const { data: session } = useSession()
  const { isPro } = useSubscription()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { href: "/history", label: "Riwayat" },
    { href: "/pricing", label: isPro ? "Pro ✦" : "Upgrade" },
  ]

  return (
    <nav
      className="flex items-center justify-between px-4 h-13 sticky top-0 z-50 shrink-0"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        height: "52px",
        background: "rgba(10,8,18,0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 no-underline group"
      >
        <Image src="/logo.png" alt="Devil's Advocate" width={29} height={29} className="rounded-sm" />
        <span className="text-sm font-semibold text-[var(--text)] tracking-tight group-hover:text-white transition-colors">
          Devil&apos;s Advocate
        </span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {session?.user ? (
          <>
            {/* Nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`hidden sm:flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors no-underline ${
                  pathname === link.href
                    ? "text-[var(--text)] bg-[var(--card)]"
                    : link.href === "/pricing" && !isPro
                    ? "text-[var(--judge)] hover:bg-[var(--card)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Avatar dropdown */}
            <div className="relative ml-1">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-[var(--card)] transition-colors focus:outline-none"
              >
                {isPro && <ProBadge />}
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    width={28}
                    height={28}
                    className="rounded-full ring-1 ring-[var(--border)]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--text)]">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <ChevronDown
                  size={12}
                  className={`text-[var(--text-muted)] transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-1.5 w-52 rounded-xl shadow-xl z-50 overflow-hidden"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <p className="text-xs font-medium text-[var(--text)] truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {session.user.email}
                      </p>
                    </div>

                    {/* Mobile nav links */}
                    <div className="sm:hidden py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors no-underline"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                      <button
                        onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors"
                      >
                        <LogOut size={13} />
                        Keluar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-[var(--text)] no-underline transition-all hover:bg-[var(--card)] active:scale-95"
            style={{ border: "1px solid var(--border)" }}
          >
            Masuk
          </Link>
        )}
      </div>
    </nav>
  )
}

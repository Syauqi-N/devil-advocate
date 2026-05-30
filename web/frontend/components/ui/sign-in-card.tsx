'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tooltip ────────────────────────────────────────────────────────────────

function ComingSoonTooltip({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 -top-9 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/80 border border-white/10 pointer-events-none"
            style={{ background: 'rgba(20,10,10,0.95)', backdropFilter: 'blur(8px)' }}
          >
            🔒 Segera hadir
            {/* Arrow */}
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 rotate-45 border-r border-b border-white/10"
              style={{ background: 'rgba(20,10,10,0.95)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function SignInCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // 3D tilt
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8])
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    await signIn('google', { callbackUrl: '/' })
  }

  // no beam state needed — rendered inline below

  return (
    <motion.div
      className="w-full max-w-sm relative z-10"
      style={{ perspective: 1500 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <motion.div
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative group"
      >
        {/* Traveling light beams */}
        <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
          {/* top */}
          <motion.div
            className="absolute top-0 left-0 h-[2px] w-[45%] bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            animate={{ left: ['-45%', '100%'], opacity: [0.2, 0.6, 0.2] }}
            transition={{ left: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0 } }}
          />
          {/* right */}
          <motion.div
            className="absolute top-0 right-0 h-[45%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent opacity-50"
            animate={{ top: ['-45%', '100%'], opacity: [0.2, 0.6, 0.2] }}
            transition={{ top: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.6 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0.6 } }}
          />
          {/* bottom */}
          <motion.div
            className="absolute bottom-0 right-0 h-[2px] w-[45%] bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            animate={{ right: ['-45%', '100%'], opacity: [0.2, 0.6, 0.2] }}
            transition={{ right: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.2 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.2 } }}
          />
          {/* left */}
          <motion.div
            className="absolute bottom-0 left-0 h-[45%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent opacity-50"
            animate={{ bottom: ['-45%', '100%'], opacity: [0.2, 0.6, 0.2] }}
            transition={{ bottom: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.8 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.8 } }}
          />

          {/* Corner glows */}
          {[
            'top-0 left-0',
            'top-0 right-0',
            'bottom-0 right-0',
            'bottom-0 left-0',
          ].map((pos, i) => (
            <motion.div
              key={i}
              className={`absolute ${pos} h-[6px] w-[6px] rounded-full bg-white/50 blur-[1.5px]`}
              animate={{ opacity: [0.15, 0.4, 0.15] }}
              transition={{ duration: 2 + i * 0.2, repeat: Infinity, repeatType: 'mirror', delay: i * 0.4 }}
            />
          ))}
        </div>

        {/* Card border hover glow */}
        <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-br from-red-500/10 via-purple-500/5 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Glass card */}
        <div
          className="relative rounded-2xl p-6 border border-white/[0.06] shadow-2xl overflow-hidden"
          style={{ background: 'rgba(12,6,6,0.75)', backdropFilter: 'blur(20px)' }}
        >
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Logo + heading */}
          <div className="text-center space-y-1 mb-6">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.7 }}
              className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1a0808 0%, #2a0f0f 100%)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <Image src="/logo.png" alt="Devil's Advocate" width={40} height={40} />
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70"
            >
              Devil&apos;s Advocate
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/50 text-xs"
            >
              Sebelum eksekusi, debatkan dulu.
            </motion.p>
          </div>

          {/* Email field — disabled, coming soon */}
          <div className="space-y-2 mb-3">
            <ComingSoonTooltip>
              <div className="relative flex items-center rounded-lg overflow-hidden opacity-40 cursor-not-allowed">
                <Mail className="absolute left-3 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  placeholder="Alamat email"
                  disabled
                  className="w-full bg-white/5 border border-white/10 text-white/50 placeholder:text-white/20 h-10 pl-10 pr-3 text-sm rounded-lg outline-none cursor-not-allowed"
                />
              </div>
            </ComingSoonTooltip>

            {/* Password field — disabled, coming soon */}
            <ComingSoonTooltip>
              <div className="relative flex items-center rounded-lg overflow-hidden opacity-40 cursor-not-allowed">
                <Lock className="absolute left-3 w-4 h-4 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  disabled
                  className="w-full bg-white/5 border border-white/10 text-white/50 placeholder:text-white/20 h-10 pl-10 pr-10 text-sm rounded-lg outline-none cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-white/30 cursor-not-allowed"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <Eye className="w-4 h-4" />
                    : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </ComingSoonTooltip>
          </div>

          {/* Remember me + Forgot password — disabled */}
          <div className="flex items-center justify-between mb-4 opacity-35 pointer-events-none select-none">
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-not-allowed">
              <input type="checkbox" disabled className="appearance-none h-4 w-4 rounded border border-white/20 bg-white/5" />
              Ingat saya
            </label>
            <span className="text-xs text-white/50">Lupa password?</span>
          </div>

          {/* Sign in with email button — disabled */}
          <ComingSoonTooltip>
            <div className="w-full mb-4 opacity-40 cursor-not-allowed">
              <div className="w-full h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-sm text-white/50">
                <span>Masuk dengan Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </ComingSoonTooltip>

          {/* Divider */}
          <div className="relative flex items-center mb-4">
            <div className="flex-grow border-t border-white/[0.06]" />
            <motion.span
              className="mx-3 text-xs text-white/30"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              atau
            </motion.span>
            <div className="flex-grow border-t border-white/[0.06]" />
          </div>

          {/* Google sign in — fungsional */}
          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative group/google mb-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-purple-500/5 to-red-500/10 rounded-lg blur opacity-0 group-hover/google:opacity-100 transition-opacity duration-300" />
            <div className="relative h-10 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.07] transition-all duration-300 flex items-center justify-center gap-2.5 overflow-hidden">
              {/* Shimmer on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.04] to-white/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />

              <AnimatePresence mode="wait">
                {isGoogleLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5"
                  >
                    {/* Google logo SVG */}
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    <span className="text-sm text-white/80 group-hover/google:text-white transition-colors duration-200 font-medium">
                      Masuk dengan Google
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>

          {/* Trust copy */}
          <p className="text-center text-xs text-white/25">
            Gratis · 1 debat per hari · No spam
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

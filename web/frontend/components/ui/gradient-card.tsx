'use client'

import React, { useRef, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, Swords, Brain, Zap } from "lucide-react"

interface GradientCardProps {
  onClose: () => void
}

export const GradientCard = ({ onClose }: GradientCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      setRotation({
        x: -(y / rect.height) * 5,
        y: (x / rect.width) * 5,
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotation({ x: 0, y: 0 })
  }

  const features = [
    { icon: <Swords className="w-3.5 h-3.5" />, label: "Advocate vs Devil" },
    { icon: <Brain className="w-3.5 h-3.5" />, label: "AI Verdict" },
    { icon: <Zap className="w-3.5 h-3.5" />, label: "1 debat gratis/hari" },
  ]

  return (
    <motion.div
      ref={cardRef}
      className="relative rounded-[32px] overflow-hidden cursor-default"
      style={{
        width: "360px",
        height: "460px",
        transformStyle: "preserve-3d",
        backgroundColor: "#0a0608",
        boxShadow:
          "0 -10px 100px 10px rgba(180, 40, 40, 0.2), 0 0 10px 0 rgba(0,0,0,0.6)",
      }}
      initial={{ y: 0 }}
      animate={{
        y: isHovered ? -5 : 0,
        rotateX: rotation.x,
        rotateY: rotation.y,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Glass reflection */}
      <motion.div
        className="absolute inset-0 z-[35] pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.04) 100%)",
        }}
        animate={{ opacity: isHovered ? 0.7 : 0.5 }}
        transition={{ duration: 0.4 }}
      />

      {/* Dark base */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(180deg, #080408 0%, #080408 60%)" }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay z-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Bottom gradient glow — red + purple blend */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-2/3 z-20 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at bottom right, rgba(139, 40, 220, 0.65) -10%, rgba(79, 20, 120, 0) 70%),
            radial-gradient(ellipse at bottom left, rgba(220, 40, 40, 0.65) -10%, rgba(120, 20, 20, 0) 70%)
          `,
          filter: "blur(40px)",
        }}
        animate={{ opacity: isHovered ? 0.95 : 0.8 }}
        transition={{ duration: 0.4 }}
      />

      {/* Central purple-red glow */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-2/3 z-[21] pointer-events-none"
        style={{
          background: `radial-gradient(circle at bottom center, rgba(160, 40, 180, 0.6) -20%, rgba(79, 20, 100, 0) 60%)`,
          filter: "blur(45px)",
        }}
        animate={{ opacity: isHovered ? 0.9 : 0.75 }}
        transition={{ duration: 0.4 }}
      />

      {/* Bottom border glow */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] z-[25] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.04) 100%)",
        }}
        animate={{
          boxShadow: isHovered
            ? "0 0 20px 4px rgba(180,60,255,0.8), 0 0 35px 6px rgba(220,40,40,0.5)"
            : "0 0 15px 3px rgba(160,50,220,0.7), 0 0 28px 5px rgba(200,40,40,0.4)",
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Left bottom corner glow */}
      <motion.div
        className="absolute bottom-0 left-0 h-1/4 w-[1px] z-[25] rounded-full pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0) 80%)",
        }}
        animate={{
          boxShadow: isHovered
            ? "0 0 18px 3px rgba(180,60,255,0.8)"
            : "0 0 12px 2px rgba(160,50,220,0.6)",
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Right bottom corner glow */}
      <motion.div
        className="absolute bottom-0 right-0 h-1/4 w-[1px] z-[25] rounded-full pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0) 80%)",
        }}
        animate={{
          boxShadow: isHovered
            ? "0 0 18px 3px rgba(220,40,40,0.8)"
            : "0 0 12px 2px rgba(200,40,40,0.6)",
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Card content */}
      <motion.div className="relative flex flex-col h-full p-8 z-40">

        {/* Icon */}
        <motion.div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(225deg, #1a0a0a 0%, #120608 100%)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
          animate={{
            boxShadow: isHovered
              ? "0 8px 16px -2px rgba(0,0,0,0.4), inset 2px 2px 5px rgba(255,255,255,0.08)"
              : "0 4px 10px -2px rgba(0,0,0,0.3), inset 1px 1px 3px rgba(255,255,255,0.05)",
            y: isHovered ? -2 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute top-0 left-0 w-2/3 h-2/3 opacity-30"
            style={{ background: "radial-gradient(circle at top left, rgba(255,255,255,0.4), transparent 80%)", filter: "blur(8px)" }}
          />
          <Image src="/logo.png" alt="Devil's Advocate" width={28} height={28} />
        </motion.div>

        {/* Text content */}
        <motion.div
          className="mb-auto"
          animate={{
            rotateX: isHovered ? -rotation.x * 0.3 : 0,
            rotateY: isHovered ? -rotation.y * 0.3 : 0,
          }}
          transition={{ duration: 0.4 }}
        >
          <motion.h3
            className="text-2xl font-semibold text-white mb-3"
            style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
            initial={{ filter: "blur(3px)", opacity: 0.7 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            Sebelum eksekusi,<br />debatkan dulu.
          </motion.h3>

          <motion.p
            className="text-sm text-white/60 mb-5 leading-relaxed"
            initial={{ filter: "blur(3px)", opacity: 0.7 }}
            animate={{ filter: "blur(0px)", opacity: 0.85 }}
            transition={{ duration: 1.2, delay: 0.4 }}
          >
            Devil&apos;s Advocate membantu kamu stress-test ide bisnis dan keputusan penting — dari dua sisi yang berlawanan.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap gap-2 mb-6"
            initial={{ filter: "blur(3px)", opacity: 0.7 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5 }}
          >
            {features.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-white/60 border border-white/[0.08]"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                {f.icon}
                {f.label}
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.button
            onClick={onClose}
            className="inline-flex items-center text-white text-sm font-medium group"
            initial={{ filter: "blur(3px)", opacity: 0.7 }}
            animate={{ filter: "blur(0px)", opacity: 0.9 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            whileHover={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.4))" }}
          >
            Mulai Debat
            <motion.span
              className="ml-1.5"
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ duration: 0.4 }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

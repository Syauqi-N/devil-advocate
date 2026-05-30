'use client'

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GradientCard } from "@/components/ui/gradient-card"

const STORAGE_KEY = "da_intro_seen"

export default function IntroModal() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Hanya tampilkan jika belum pernah dismiss
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      // Delay sedikit supaya halaman sempat render dulu
      const t = setTimeout(() => setShow(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Card */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.05 }}
            style={{ perspective: 1200 }}
          >
            <GradientCard onClose={handleClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

"use client";

import { useEffect, useRef, useCallback, useTransition } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  Paperclip,
  XIcon,
  LoaderIcon,
  SendIcon,
  Lightbulb,
  TrendingUp,
  Briefcase,
  Coffee,
  Rocket,
  User,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { PersonaSelector } from "@/components/PersonaSelector";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { CustomPersonaModal } from "@/components/CustomPersonaModal";
import { Sparkles, Zap } from "lucide-react";

// ── Auto-resize textarea hook ──────────────────────────────────────────────

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

// ── Textarea with focus ring ───────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-red-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ── Template suggestions ───────────────────────────────────────────────────

interface TemplateSuggestion {
  icon: React.ReactNode;
  label: string;
  topic: string;
}

const TEMPLATE_SUGGESTIONS: TemplateSuggestion[] = [
  {
    icon: <Rocket className="w-4 h-4" />,
    label: "Startup Idea",
    topic: "Marketplace freelancer khusus desainer lokal",
  },
  {
    icon: <TrendingUp className="w-4 h-4" />,
    label: "Pivot Bisnis",
    topic: "Pivot dari B2C ke B2B",
  },
  {
    icon: <Briefcase className="w-4 h-4" />,
    label: "Karir",
    topic: "Resign dan freelance full-time",
  },
  {
    icon: <Coffee className="w-4 h-4" />,
    label: "Usaha Baru",
    topic: "Buka coffee shop di kota kecil",
  },
];

// ── Typing dots ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
          style={{ boxShadow: "0 0 4px rgba(255,255,255,0.3)" }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AnimatedAIChat() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isPro, debatesToday, debatesLimit, isLoading: subLoading } = useSubscription();

  const [value, setValue] = useState("");
  const [rounds, setRounds] = useState(3);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<
    "daily_limit" | "custom_persona" | "pro_template"
  >("daily_limit");
  const [customPersonaOpen, setCustomPersonaOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const remaining = debatesLimit !== null ? Math.max(0, debatesLimit - debatesToday) : null;
  const isLimitReached = !isPro && remaining === 0;

  function openUpgrade(trigger: "daily_limit" | "custom_persona" | "pro_template") {
    setUpgradeTrigger(trigger);
    setUpgradeOpen(true);
  }

  // Restore upgrade modal trigger from sessionStorage (post-login redirect)
  useEffect(() => {
    const trigger = sessionStorage.getItem("showUpgradeModal");
    if (trigger === "daily_limit") {
      sessionStorage.removeItem("showUpgradeModal");
      openUpgrade("daily_limit");
    }
  }, []);

  // Track mouse for spotlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || isSubmitting) return;

    if (!session?.user) {
      const params = new URLSearchParams({
        next: "/",
        topic: value.trim(),
        rounds: String(rounds),
      });
      router.push(`/login?${params.toString()}`);
      return;
    }

    if (isLimitReached) {
      openUpgrade("daily_limit");
      return;
    }

    setIsSubmitting(true);
    try {
      sessionStorage.setItem(
        "pendingDebate",
        JSON.stringify({ topic: value.trim(), rounds_count: rounds, persona_id: personaId })
      );
      router.push(`/debate/new?streaming=true`);
    } catch (err) {
      console.error(err);
      sessionStorage.removeItem("pendingDebate");
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) handleSubmit();
    }
  };

  const selectTemplate = (suggestion: TemplateSuggestion) => {
    setValue(suggestion.topic);
    adjustHeight();
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-full flex flex-col w-full items-center justify-center bg-transparent text-white px-4 py-12 sm:py-20 relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0818] to-[#0a0a12]" />

        {/* Red glow — top left */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-red-700/10 rounded-full filter blur-[120px] animate-pulse" />

        {/* Purple glow — top right */}
        <div className="absolute -top-10 right-0 w-[450px] h-[450px] bg-purple-700/12 rounded-full filter blur-[110px] animate-pulse delay-700" />

        {/* Navy/indigo glow — center */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-900/15 rounded-full filter blur-[130px] animate-pulse delay-300" />

        {/* Purple accent — bottom left */}
        <div className="absolute bottom-0 -left-10 w-[400px] h-[400px] bg-violet-800/10 rounded-full filter blur-[100px] animate-pulse delay-1000" />

        {/* Red accent — bottom right */}
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-red-900/10 rounded-full filter blur-[100px] animate-pulse delay-500" />

        {/* Subtle navy center vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080612]/60 via-transparent to-transparent" />
      </div>

      <div className="w-full max-w-2xl mx-auto relative">
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* ── Hero ── */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                Devil&apos;s Advocate
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Sebelum eksekusi, debatkan dulu.
            </motion.p>
          </div>

          {/* ── Input card ── */}
          <motion.form
            onSubmit={handleSubmit}
            className="relative rounded-2xl shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Textarea */}
            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Masukkan ide atau keputusan yang ingin didebatkan..."
                containerClassName="w-full"
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-white/90 text-sm",
                  "focus:outline-none",
                  "placeholder:text-white/20",
                  "min-h-[60px]"
                )}
                style={{ overflow: "hidden" }}
                showRing={false}
              />
            </div>

            {/* Persona selector — only if logged in */}
            {session?.user && (
              <div className="px-4 pb-3">
                <PersonaSelector
                  value={personaId}
                  onChange={setPersonaId}
                  isPro={isPro}
                  onUpgradeClick={() => openUpgrade("custom_persona")}
                  onCustomPersonaClick={() => setCustomPersonaOpen(true)}
                />
              </div>
            )}

            {/* Bottom bar */}
            <div className="p-4 flex items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {/* Round selector */}
              <div
                className="flex items-center gap-0.5 p-0.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {[2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRounds(r)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md font-medium transition-all duration-150",
                      rounds === r
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    {r} Round
                  </button>
                ))}
              </div>

              {/* Submit button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting || (!value.trim() && !isLimitReached)}
                onClick={
                  isLimitReached
                    ? (e) => { e.preventDefault(); openUpgrade("daily_limit"); }
                    : undefined
                }
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "flex items-center gap-2",
                  value.trim() && !isLimitReached
                    ? "bg-white text-[#0A0A0B] shadow-lg shadow-white/10"
                    : isLimitReached
                    ? "bg-red-500/20 text-red-400 border border-red-500/20"
                    : "bg-white/[0.05] text-white/40"
                )}
              >
                {isSubmitting ? (
                  <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                ) : isLimitReached ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? "Memproses..."
                    : isLimitReached
                    ? "Limit Tercapai"
                    : "Debatkan"}
                </span>
              </motion.button>
            </div>
          </motion.form>

          {/* ── Template chips ── */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TEMPLATE_SUGGESTIONS.map((suggestion, index) => (
              <motion.button
                key={suggestion.label}
                type="button"
                onClick={() => selectTemplate(suggestion)}
                className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/50 hover:text-white/80 transition-all relative group border border-white/[0.04] hover:border-white/[0.08]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.08 }}
              >
                <span className="text-white/30">{suggestion.icon}</span>
                <span>{suggestion.label}</span>
              </motion.button>
            ))}
          </div>

          {/* ── Quota badge ── */}
          {session?.user && (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {subLoading ? (
                <div className="h-4 w-40 rounded-full bg-white/5 animate-pulse" />
              ) : isPro ? (
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Sparkles size={11} className="text-amber-400" />
                  <span className="pro-text font-medium">Unlimited debat — Pro</span>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isLimitReached ? "text-red-400/80" : "text-white/30"
                  )}
                >
                  <Zap size={11} />
                  <span>
                    {isLimitReached
                      ? "Batas harian tercapai — "
                      : `${remaining}/${debatesLimit} debat tersisa hari ini — `}
                    <button
                      type="button"
                      onClick={() => openUpgrade("daily_limit")}
                      className="underline underline-offset-2 hover:text-white/60 transition-colors"
                    >
                      Upgrade Pro
                    </button>
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Thinking indicator ── */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            className="fixed bottom-8 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-xs font-medium text-red-400">DA</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Menyiapkan debat</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mouse spotlight when focused ── */}
      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.015] bg-gradient-to-r from-red-500 via-orange-500 to-red-800 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}

      {/* ── Modals ── */}
      <UpgradePromptModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        trigger={upgradeTrigger}
      />
      <CustomPersonaModal
        isOpen={customPersonaOpen}
        onClose={() => setCustomPersonaOpen(false)}
        onSaved={() => setCustomPersonaOpen(false)}
      />
    </div>
  );
}

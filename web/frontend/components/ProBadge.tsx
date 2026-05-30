"use client";

import { Sparkles } from "lucide-react";

interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className = "" }: ProBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        color: "#0f0f0f",
      }}
    >
      <Sparkles size={10} />
      PRO
    </span>
  );
}

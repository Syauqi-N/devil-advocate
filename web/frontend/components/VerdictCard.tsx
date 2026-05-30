"use client";

import { VerdictBadge } from "./VerdictBadge";

interface Props {
  verdict: string;
  badge: string | null;
}

export function VerdictCard({ verdict, badge }: Props) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#2a2a2a] bg-[#111] flex items-center gap-2">
        <span className="text-yellow-400">⚖️</span>
        <span className="text-sm text-[#737373]">Judge — Verdict</span>
      </div>
      <div className="p-5">
        <div className="flex justify-center mb-5">
          <VerdictBadge badge={badge} size="lg" />
        </div>
        <p className="text-sm text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
          {verdict}
        </p>
      </div>
    </div>
  );
}

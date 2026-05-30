"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

interface Template {
  id: string;
  name: string;
  topic: string;
  topic_preset?: string;
  is_pro: boolean;
  persona_id: string | null;
  persona?: { id: string } | null;
}

interface TemplateChipsProps {
  onSelect: (template: { topic: string; personaId: string | null }) => void;
  isPro: boolean;
  onUpgradeClick: () => void;
}

export function TemplateChips({ onSelect, isPro, onUpgradeClick }: TemplateChipsProps) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        // API returns { items: [...] } or { templates: [...] } or just [...]
        const list = Array.isArray(data) ? data : data.items ?? data.templates ?? [];
        setTemplates(list);
      })
      .catch((err) => {
        console.error("Failed to fetch templates:", err);
        setTemplates(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-7 w-24 rounded-full bg-[#1a1a1a] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => {
        const locked = t.is_pro && !isPro;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (locked) {
                onUpgradeClick();
              } else {
                onSelect({ topic: t.topic_preset ?? t.topic ?? "", personaId: t.persona?.id ?? t.persona_id ?? null });
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              locked
                ? "border-[#2a2a2a] bg-[#111] text-[#555] cursor-pointer hover:border-[#3a3a3a]"
                : "border-[#2a2a2a] bg-[#1a1a1a] text-[#e5e5e5] hover:border-[#4a4a4a] hover:bg-[#222] cursor-pointer"
            }`}
            title={locked ? `${t.name} — Pro only` : t.name}
          >
            {locked && <Lock className="w-3 h-3" />}
            <span>{t.name}</span>
            {t.is_pro && (
              <span
                className={`text-[10px] px-1 py-0.5 rounded ${
                  isPro
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-[#2a2a2a] text-[#555]"
                }`}
              >
                Pro
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

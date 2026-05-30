"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, User, Lock, Plus } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  advocate_name: string;
  devil_name: string;
  is_template: boolean;
}

interface PersonasResponse {
  templates: Persona[];
  custom: Persona[];
}

interface PersonaSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
  isPro: boolean;
  onUpgradeClick: () => void;
  onCustomPersonaClick?: () => void;
}

export function PersonaSelector({
  value,
  onChange,
  isPro,
  onUpgradeClick,
  onCustomPersonaClick,
}: PersonaSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [personas, setPersonas] = useState<PersonasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => setPersonas(data))
      .catch((err) => {
        console.error("Failed to fetch personas:", err);
        setPersonas(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPersona =
    personas?.templates.find((p) => p.id === value) ||
    personas?.custom.find((p) => p.id === value) ||
    null;

  const displayLabel = selectedPersona ? selectedPersona.name : "Default";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white/90 transition-all min-w-[160px] justify-between"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-white/30" />
          <span>{isLoading ? "Loading..." : displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-[100] bottom-full mb-2 w-56 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(10,6,18,0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Default option */}
          <button
            type="button"
            onClick={() => { onChange(null); setIsOpen(false); }}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05] ${
              value === null ? "text-white font-medium" : "text-white/60"
            }`}
          >
            Default
          </button>

          {/* Template personas */}
          {personas?.templates && personas.templates.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-[10px] text-white/25 uppercase tracking-widest"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                Templates
              </div>
              {personas.templates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/[0.05] ${
                    value === p.id ? "text-white font-medium" : "text-white/60"
                  }`}
                >
                  <div>{p.name}</div>
                  <div className="text-xs text-white/25 mt-0.5">
                    {p.advocate_name} vs {p.devil_name}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

          {/* Custom Persona button */}
          <button
            type="button"
            onClick={() => {
              if (!isPro) {
                onUpgradeClick();
                setIsOpen(false);
              } else {
                onCustomPersonaClick?.();
                setIsOpen(false);
              }
            }}
            className="w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05] flex items-center gap-2"
          >
            {isPro ? (
              <>
                <Plus className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Custom Persona</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-white/25" />
                <span className="text-white/30">Custom Persona</span>
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
                >
                  Pro
                </span>
              </>
            )}
          </button>

          {/* My Personas (Pro only) */}
          {isPro && personas?.custom && personas.custom.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-[10px] text-white/25 uppercase tracking-widest"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                My Personas
              </div>
              {personas.custom.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/[0.05] ${
                    value === p.id ? "text-white font-medium" : "text-white/60"
                  }`}
                >
                  <div>{p.name}</div>
                  <div className="text-xs text-white/25 mt-0.5">
                    {p.advocate_name} vs {p.devil_name}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

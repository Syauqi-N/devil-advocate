"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  advocate_name: string;
  devil_name: string;
  description?: string;
}

interface CustomPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editPersona?: Persona | null; // null = create mode
}

export function CustomPersonaModal({
  isOpen,
  onClose,
  onSaved,
  editPersona = null,
}: CustomPersonaModalProps) {
  const [name, setName] = useState("");
  const [advocateName, setAdvocateName] = useState("");
  const [advocateDescription, setAdvocateDescription] = useState("");
  const [devilName, setDevilName] = useState("");
  const [devilDescription, setDevilDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editPersona;

  // Populate fields when editing
  useEffect(() => {
    if (editPersona) {
      setName(editPersona.name);
      setAdvocateName(editPersona.advocate_name);
      setAdvocateDescription((editPersona as any).advocate_description ?? "");
      setDevilName(editPersona.devil_name);
      setDevilDescription((editPersona as any).devil_description ?? "");
    } else {
      setName("");
      setAdvocateName("");
      setAdvocateDescription("");
      setDevilName("");
      setDevilDescription("");
    }
    setError(null);
  }, [editPersona, isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Client-side validation
  function validate(): string | null {
    if (!name.trim()) return "Nama persona wajib diisi";
    if (name.trim().length > 50) return "Nama persona maksimal 50 karakter";
    if (!advocateName.trim()) return "Nama Advocate wajib diisi";
    if (advocateName.trim().length > 50) return "Nama Advocate maksimal 50 karakter";
    if (!advocateDescription.trim()) return "Deskripsi Advocate wajib diisi";
    if (advocateDescription.trim().length > 500) return "Deskripsi Advocate maksimal 500 karakter";
    if (!devilName.trim()) return "Nama Devil wajib diisi";
    if (devilName.trim().length > 50) return "Nama Devil maksimal 50 karakter";
    if (!devilDescription.trim()) return "Deskripsi Devil wajib diisi";
    if (devilDescription.trim().length > 500) return "Deskripsi Devil maksimal 500 karakter";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      advocate_name: advocateName.trim(),
      advocate_description: advocateDescription.trim(),
      devil_name: devilName.trim(),
      devil_description: devilDescription.trim(),
    };

    try {
      const url = isEdit ? `/api/personas/${editPersona!.id}` : "/api/personas";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.detail === "PERSONA_LIMIT_REACHED") {
          setError("Batas persona tercapai. Upgrade ke Pro untuk lebih banyak persona.");
        } else {
          setError(data.detail || `Gagal ${isEdit ? "mengubah" : "membuat"} persona`);
        }
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ 
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(12,8,18,0.92)",
          backdropFilter: "blur(20px)",
        }}
        className="w-full max-w-md rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="text-sm font-semibold text-white/90">
            {isEdit ? "Edit Persona" : "Buat Persona Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/80 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Persona name */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Nama Persona <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Startup Founder"
              maxLength={50}
              className="w-full rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Advocate name + description */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Nama Advocate <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={advocateName}
              onChange={(e) => setAdvocateName(e.target.value)}
              placeholder="cth: Optimis Visioner"
              maxLength={50}
              className="w-full rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-xs text-white/25 mt-1">Peran yang mendukung ide kamu</p>
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Deskripsi Advocate <span className="text-red-400">*</span>
            </label>
            <textarea
              value={advocateDescription}
              onChange={(e) => setAdvocateDescription(e.target.value)}
              placeholder="cth: Seorang optimis yang percaya pada potensi besar ide ini..."
              maxLength={500}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-xs text-white/25 mt-1 text-right">{advocateDescription.length}/500</p>
          </div>

          {/* Devil name + description */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Nama Devil <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={devilName}
              onChange={(e) => setDevilName(e.target.value)}
              placeholder="cth: Skeptis Realis"
              maxLength={50}
              className="w-full rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-xs text-white/25 mt-1">Peran yang mengkritisi ide kamu</p>
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Deskripsi Devil <span className="text-red-400">*</span>
            </label>
            <textarea
              value={devilDescription}
              onChange={(e) => setDevilDescription(e.target.value)}
              placeholder="cth: Seorang skeptis yang selalu mencari celah dan risiko tersembunyi..."
              maxLength={500}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none transition-colors resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-xs text-white/25 mt-1 text-right">{devilDescription.length}/500</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-white/40 hover:text-white/80 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 text-sm font-medium bg-white text-[#0a0a0a] rounded-lg disabled:opacity-40 hover:bg-white/90 active:scale-95 transition-all duration-150"
            >
              {isLoading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Persona"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

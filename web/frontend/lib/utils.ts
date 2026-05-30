import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export function badgeColor(badge: string | null) {
  if (badge === "LANJUT") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (badge === "PIVOT") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (badge === "STOP") return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30";
}

export function badgeEmoji(badge: string | null) {
  if (badge === "LANJUT") return "✅";
  if (badge === "PIVOT") return "🔄";
  if (badge === "STOP") return "🛑";
  return "⏳";
}

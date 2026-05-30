import { cn, badgeColor, badgeEmoji } from "@/lib/utils";

interface Props {
  badge: string | null;
  size?: "sm" | "md" | "lg";
}

export function VerdictBadge({ badge, size = "md" }: Props) {
  if (!badge) return null;

  const sizeClass = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5 font-bold",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        sizeClass,
        badgeColor(badge)
      )}
    >
      <span>{badgeEmoji(badge)}</span>
      {badge}
    </span>
  );
}

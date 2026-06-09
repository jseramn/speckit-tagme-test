"use client";

import type { DestinationType } from "@/types";

const ICONS: Record<string, string> = {
  utensils: "🍽️",
  sparkles: "✨",
  "map-pin": "📍",
  star: "⭐",
  instagram: "📷",
  calendar: "📅",
  info: "ℹ️",
  external: "🔗",
  bell: "🔔",
  laundry: "👔",
};

function resolveIcon(icon: string): string {
  return ICONS[icon] ?? "→";
}

export interface DestinationCardProps {
  label: string;
  icon: string;
  url: string;
  type: DestinationType;
  isPrimary?: boolean;
  isExternal?: boolean;
  onNavigate?: () => void | Promise<void>;
}

export function DestinationCard({
  label,
  icon,
  url,
  isPrimary = false,
  isExternal = true,
  onNavigate,
}: DestinationCardProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    event.preventDefault();
    void onNavigate();
  };

  return (
    <a
      href={url}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      onClick={onNavigate ? handleClick : undefined}
      className={[
        "group flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all",
        "active:scale-[0.98]",
        isPrimary
          ? "border-tagme-gold/40 bg-white shadow-sm hover:border-tagme-gold hover:shadow-md"
          : "border-tagme-slate/10 bg-white/80 hover:border-tagme-slate/25 hover:bg-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg",
          isPrimary ? "bg-tagme-gold/15" : "bg-tagme-cream",
        ].join(" ")}
        aria-hidden
      >
        {resolveIcon(icon)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={[
            "block truncate text-base font-medium",
            isPrimary ? "text-tagme-ink" : "text-tagme-slate",
          ].join(" ")}
        >
          {label}
        </span>
        {isPrimary && (
          <span className="mt-0.5 block text-xs text-tagme-gold">
            Recomendado
          </span>
        )}
      </span>
      <span
        className="text-tagme-gold opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden
      >
        →
      </span>
    </a>
  );
}
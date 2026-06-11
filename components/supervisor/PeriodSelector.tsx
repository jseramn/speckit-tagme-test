"use client";

import type { ScorecardPeriodPreset } from "@/lib/scorecards/parse-period";

const PERIODS: { value: ScorecardPeriodPreset; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

interface PeriodSelectorProps {
  value: ScorecardPeriodPreset;
  onChange: (period: ScorecardPeriodPreset) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={[
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            value === period.value
              ? "bg-tagme-ink text-tagme-cream"
              : "border border-tagme-slate/15 bg-white text-tagme-slate hover:border-tagme-gold/40",
          ].join(" ")}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
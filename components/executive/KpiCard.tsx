"use client";

import type { KpiCard as KpiCardData } from "@/types/executive";

export interface KpiCardProps {
  kpi: KpiCardData;
  baselineReady: boolean;
}

function formatDelta(delta: number | null): string | null {
  if (delta == null) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}% vs. semana anterior`;
}

function targetIndicator(
  onTarget: boolean | null,
  baselineReady: boolean,
): { label: string; className: string } | null {
  if (!baselineReady || onTarget == null) return null;
  return onTarget
    ? { label: "En meta", className: "bg-emerald-50 text-emerald-700" }
    : { label: "Fuera de meta", className: "bg-amber-50 text-amber-700" };
}

export function KpiCard({ kpi, baselineReady }: KpiCardProps) {
  const deltaLabel = formatDelta(kpi.deltaPct);
  const target = targetIndicator(kpi.onTarget, baselineReady);

  return (
    <article className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-tagme-ink">{kpi.label}</h3>
          <p
            className="mt-1 text-xs text-tagme-slate/70"
            title={kpi.definition}
          >
            {kpi.definition}
          </p>
        </div>
        {target && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${target.className}`}
          >
            {target.label}
          </span>
        )}
      </div>

      <p className="mt-4 text-3xl font-semibold tabular-nums text-tagme-ink">
        {formatValue(kpi.value, kpi.key)}
        {kpi.target != null && baselineReady && (
          <span className="ml-2 text-sm font-normal text-tagme-slate/60">
            / meta {formatValue(kpi.target, kpi.key)}
          </span>
        )}
      </p>

      {deltaLabel && (
        <p
          className={[
            "mt-2 text-xs font-medium",
            (kpi.deltaPct ?? 0) >= 0 ? "text-emerald-600" : "text-amber-600",
          ].join(" ")}
        >
          {deltaLabel}
        </p>
      )}

      {kpi.suggestedAction && (
        <p className="mt-3 rounded-xl bg-tagme-cream/80 px-3 py-2 text-xs text-tagme-ink">
          <span className="font-medium">Acción sugerida: </span>
          {kpi.suggestedAction}
        </p>
      )}
    </article>
  );
}

function formatValue(value: number, key: string): string {
  if (key.includes("rate") || key.includes("pct")) {
    return `${value}%`;
  }
  if (key.includes("per_touch") || key.includes("per_day")) {
    return value.toFixed(1);
  }
  return String(Math.round(value));
}
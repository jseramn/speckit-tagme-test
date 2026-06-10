import type { RoiSummary } from "@/types/executive";

export interface RoiSummaryCardProps {
  roi: RoiSummary;
}

export function RoiSummaryCard({ roi }: RoiSummaryCardProps) {
  const hours = Math.round((roi.totalMinutes / 60) * 10) / 10;

  return (
    <article className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Impacto operativo estimado
        </h2>
        <span className="text-[10px] italic text-tagme-slate/50">
          *{roi.label}
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tabular-nums text-tagme-ink">
        ≈ {roi.totalMinutes} min
        <span className="ml-2 text-sm font-normal text-tagme-slate/60">
          ({hours} h)
        </span>
      </p>

      <ul className="mt-3 space-y-1 text-xs text-tagme-slate">
        <li>AVEX resueltas: {roi.staffMinutesSaved} min</li>
        <li>Self-service NFC: {roi.selfServiceMinutes} min</li>
      </ul>

      {roi.deltaPct != null && (
        <p
          className={[
            "mt-3 text-xs font-medium",
            roi.deltaPct >= 0 ? "text-emerald-600" : "text-amber-600",
          ].join(" ")}
        >
          {roi.deltaPct > 0 ? "+" : ""}
          {roi.deltaPct}% vs. semana anterior
        </p>
      )}
    </article>
  );
}
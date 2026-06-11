"use client";

interface ScorecardMetrics {
  feedbackCount: number;
  avgRating: number | null;
  npsInternal: number | null;
  insufficientData: boolean;
  pctPromoters?: number;
  pctDetractors?: number;
  message?: string;
  trend7d?: { npsInternal: number | null; feedbackCount: number };
  openIncidents?: number;
  incidentCountLinked?: number;
}

interface ScorecardCardProps {
  title: string;
  subtitle?: string;
  metrics: ScorecardMetrics;
  showTrend?: boolean;
}

function npsColor(nps: number | null): string {
  if (nps === null) return "text-tagme-slate";
  if (nps >= 50) return "text-emerald-600";
  if (nps >= 0) return "text-tagme-gold";
  return "text-red-500";
}

export function ScorecardCard({
  title,
  subtitle,
  metrics,
  showTrend = false,
}: ScorecardCardProps) {
  return (
    <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-tagme-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-tagme-slate/80">{subtitle}</p>
        ) : null}
      </header>

      {metrics.insufficientData ? (
        <div className="rounded-xl border border-tagme-gold/20 bg-tagme-gold/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-tagme-ink">
            Datos insuficientes
          </p>
          <p className="mt-2 text-sm text-tagme-slate">
            {metrics.message ??
              `n=${metrics.feedbackCount}. Se requieren al menos 6 opiniones para calcular NPS.`}
          </p>
          {metrics.avgRating !== null ? (
            <p className="mt-3 text-xs text-tagme-slate/70">
              Promedio auxiliar: {metrics.avgRating.toFixed(1)} / 5
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricTile
            label="NPS interno"
            value={metrics.npsInternal !== null ? `${metrics.npsInternal}` : "—"}
            valueClass={npsColor(metrics.npsInternal)}
            hint="% 5★ − % 1–2★"
          />
          <MetricTile
            label="Opiniones"
            value={String(metrics.feedbackCount)}
            hint="volumen en periodo"
          />
          <MetricTile
            label="Promedio"
            value={
              metrics.avgRating !== null
                ? `${metrics.avgRating.toFixed(1)}`
                : "—"
            }
            hint="calificación 1–5"
          />
        </div>
      )}

      {!metrics.insufficientData &&
      metrics.pctPromoters !== undefined &&
      metrics.pctDetractors !== undefined ? (
        <div className="mt-4 flex gap-4 text-xs text-tagme-slate/70">
          <span>Promotores (5★): {metrics.pctPromoters}%</span>
          <span>Detractores (1–2★): {metrics.pctDetractors}%</span>
        </div>
      ) : null}

      {showTrend && metrics.trend7d ? (
        <div className="mt-4 rounded-xl bg-tagme-cream/50 px-4 py-3 text-sm text-tagme-slate">
          Tendencia 7 días:{" "}
          <span className="font-medium text-tagme-ink">
            {metrics.trend7d.npsInternal !== null
              ? `NPS ${metrics.trend7d.npsInternal}`
              : "insuficiente"}
          </span>
          {" · "}
          {metrics.trend7d.feedbackCount} opiniones
        </div>
      ) : null}

      {metrics.incidentCountLinked !== undefined ? (
        <p className="mt-4 text-xs text-tagme-slate/60">
          Incidencias vinculadas en periodo: {metrics.incidentCountLinked}
        </p>
      ) : null}

      {metrics.openIncidents !== undefined ? (
        <p className="mt-4 text-xs text-tagme-slate/60">
          Incidencias abiertas: {metrics.openIncidents}
        </p>
      ) : null}
    </section>
  );
}

function MetricTile({
  label,
  value,
  hint,
  valueClass = "text-tagme-ink",
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-tagme-slate/8 bg-tagme-cream/30 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-tagme-slate/60">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-light ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[11px] text-tagme-slate/50">{hint}</p>
    </div>
  );
}
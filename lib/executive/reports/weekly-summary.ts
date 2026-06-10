import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { WeeklyReportSummary } from "@/types/executive";
import { listExecutiveAlerts } from "../alerts/queries";
import { getBaselineStatus } from "../baseline";
import { compareTargets } from "../kpis";
import { enrichKpiWithNarrative } from "../narrative";
import { resolveExecutivePeriod, type ExecutivePeriod } from "../period";
import { calculateRoi } from "../roi";
import {
  getAvexEffectiveness,
  getByTag,
  getTrends,
  getVenueMetrics,
} from "../queries";

const REPORT_KPI_KEYS = [
  "total_interactions",
  "avex_resolution_rate",
  "avex_derivation_rate",
  "menu_visit_pct",
  "destinations_per_touch",
];

function escapeCsv(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function buildWeeklyReportSummary(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<WeeklyReportSummary> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const generatedAt = new Date().toISOString();

  const insforge = createInsforgeServerClient();
  const { data: venue } = await insforge.database
    .from("venues")
    .select("name")
    .eq("id", venueId)
    .maybeSingle();

  const venueName = (venue?.name as string) ?? "Venue";

  const [
    baselineStatus,
    trends,
    metrics,
    avexRows,
    alerts,
    kpis,
    roi,
    tags,
  ] = await Promise.all([
    getBaselineStatus(venueId),
    getTrends(venueId, period, from, to),
    getVenueMetrics(venueId, period, from, to),
    getAvexEffectiveness(venueId, period, from, to),
    listExecutiveAlerts({ venueId, limit: 200 }),
    compareTargets(venueId, period, from, to, REPORT_KPI_KEYS),
    calculateRoi(venueId, period, from, to),
    getByTag(venueId, period, from, to),
  ]);

  const zoneTotals = new Map<string, number>();
  for (const tag of tags) {
    zoneTotals.set(tag.zone, (zoneTotals.get(tag.zone) ?? 0) + tag.touches);
  }

  const topZones = [...zoneTotals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([zone, touches]) => ({ zone, touches }));

  const avexSessions = avexRows.reduce((s, r) => s + r.sessions, 0);
  const avexEscalated = avexRows.reduce((s, r) => s + r.escalated, 0);
  const avexResolved = avexSessions - avexEscalated;

  const periodAlerts = alerts.filter((a) => {
    const created = new Date(a.createdAt);
    return created >= resolved.fromDate && created <= resolved.toDate;
  });

  const alertStats = periodAlerts.reduce(
    (acc, alert) => {
      acc.total += 1;
      if (alert.severity === "critical") acc.critical += 1;
      else acc.attention += 1;
      if (alert.status !== "active") acc.acknowledged += 1;
      return acc;
    },
    { total: 0, critical: 0, attention: 0, acknowledged: 0 },
  );

  const totalTouches = trends.totalTouches;
  const hasData = totalTouches > 0 || avexSessions > 0 || alertStats.total > 0;

  return {
    venueId,
    venueName,
    period,
    from: resolved.from,
    to: resolved.to,
    generatedAt,
    hasData,
    baselineStatus,
    totalTouches,
    previousTotalTouches: trends.previousTotal,
    touchesDeltaPct: trends.deltaPct,
    touchesDaily: trends.trend,
    topZones,
    destinationBreakdown: metrics.destinationBreakdown,
    avex: {
      sessions: avexSessions,
      resolved: avexResolved,
      escalated: avexEscalated,
      derivationPct:
        avexSessions > 0
          ? Math.round((avexEscalated / avexSessions) * 1000) / 10
          : 0,
    },
    alerts: alertStats,
    kpis: kpis.map((k) => enrichKpiWithNarrative(k)),
    roi,
  };
}

export function weeklyReportToCsv(report: WeeklyReportSummary): string {
  const lines: string[] = [];

  lines.push("TagMe — Reporte Ejecutivo");
  lines.push(`Venue,${escapeCsv(report.venueName)}`);
  lines.push(`Período,${report.from} a ${report.to}`);
  lines.push(`Generado,${report.generatedAt}`);
  lines.push(`Datos disponibles,${report.hasData ? "Sí" : "No"}`);
  lines.push("");

  if (!report.hasData) {
    lines.push("Sin actividad en el período seleccionado.");
    return lines.join("\n");
  }

  lines.push("RESUMEN");
  lines.push("Métrica,Valor,Δ% vs período anterior");
  lines.push(
    `Interacciones totales,${report.totalTouches},${escapeCsv(report.touchesDeltaPct)}`,
  );
  lines.push(
    `ROI estimado (min),${report.roi.totalMinutes},${escapeCsv(report.roi.deltaPct)}`,
  );
  lines.push(
    `AVEX sesiones,${report.avex.sessions},`,
  );
  lines.push(
    `AVEX derivación %,${report.avex.derivationPct},`,
  );
  lines.push(
    `Alertas período,${report.alerts.total},`,
  );
  lines.push(
    `Alertas reconocidas,${report.alerts.acknowledged},`,
  );
  lines.push("");

  lines.push("INTERACCIONES POR DÍA");
  lines.push("Día,Toques");
  for (const row of report.touchesDaily) {
    lines.push(`${row.day},${row.touches}`);
  }
  lines.push("");

  lines.push("TOP ZONAS");
  lines.push("Zona,Toques");
  for (const row of report.topZones) {
    lines.push(`${row.zone},${row.touches}`);
  }
  lines.push("");

  lines.push("DESTINOS");
  lines.push("Tipo,Visitas,Porcentaje");
  for (const row of report.destinationBreakdown) {
    lines.push(`${row.type},${row.count},${row.percentage}`);
  }
  lines.push("");

  lines.push("KPIS");
  lines.push("Clave,Valor,Meta,En meta");
  for (const kpi of report.kpis) {
    lines.push(
      `${kpi.key},${kpi.value},${escapeCsv(kpi.target)},${escapeCsv(kpi.onTarget)}`,
    );
  }
  lines.push("");

  lines.push("ALERTAS");
  lines.push("Críticas,Atención,Total,Reconocidas");
  lines.push(
    `${report.alerts.critical},${report.alerts.attention},${report.alerts.total},${report.alerts.acknowledged}`,
  );

  return lines.join("\n");
}
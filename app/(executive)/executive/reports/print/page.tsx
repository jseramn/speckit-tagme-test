import { redirect } from "next/navigation";
import { PrintTrigger } from "@/components/executive/PrintTrigger";
import { logReportExport } from "@/lib/executive/audit";
import { buildWeeklyReportSummary } from "@/lib/executive/reports/weekly-summary";
import { canAccessDashboard } from "@/lib/executive/scope";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

function formatDelta(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

export default async function ReportPrintPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/reports");
  }

  const ctx = {
    role: session.role,
    executiveScope: session.executiveScope,
  };

  if (!canAccessDashboard(ctx, "reports")) {
    redirect("/executive/overview");
  }

  const params = await searchParams;
  const period = params.period === "30d" ? "30d" : "7d";

  const report = await buildWeeklyReportSummary(session.venueId, period);

  await logReportExport({
    userId: session.userId,
    venueId: session.venueId,
    format: "print",
    period,
    from: report.from,
    to: report.to,
  });

  return (
    <div className="mx-auto max-w-3xl text-tagme-ink">
      <PrintTrigger />

      <h1 className="text-2xl font-semibold">TagMe — Reporte Ejecutivo</h1>
      <p className="mt-1 text-sm text-tagme-slate">
        {report.venueName} · {report.from} a {report.to}
      </p>
      <p className="text-sm text-tagme-slate">
        Generado: {new Date(report.generatedAt).toLocaleString("es-CO")}
      </p>

      {!report.hasData ? (
        <p className="mt-8 text-sm italic text-tagme-slate/60">
          Sin actividad registrada en el período seleccionado.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
              Resumen
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-tagme-slate/15 p-4">
                <p className="text-xs text-tagme-slate">Interacciones</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {report.totalTouches}
                </p>
                <p className="text-xs text-tagme-slate">
                  Δ {formatDelta(report.touchesDeltaPct)} vs anterior
                </p>
              </div>
              <div className="rounded-xl border border-tagme-slate/15 p-4">
                <p className="text-xs text-tagme-slate">ROI estimado</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {report.roi.totalMinutes} min
                </p>
              </div>
              <div className="rounded-xl border border-tagme-slate/15 p-4">
                <p className="text-xs text-tagme-slate">AVEX derivación</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {report.avex.derivationPct}%
                </p>
                <p className="text-xs text-tagme-slate">
                  {report.avex.sessions} sesiones
                </p>
              </div>
              <div className="rounded-xl border border-tagme-slate/15 p-4">
                <p className="text-xs text-tagme-slate">Alertas</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {report.alerts.total}
                </p>
                <p className="text-xs text-tagme-slate">
                  {report.alerts.acknowledged} reconocidas
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
              Interacciones por día
            </h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-tagme-slate/15 text-left">
                  <th className="py-2 pr-4">Día</th>
                  <th className="py-2">Toques</th>
                </tr>
              </thead>
              <tbody>
                {report.touchesDaily.map((row) => (
                  <tr key={row.day} className="border-b border-tagme-slate/10">
                    <td className="py-2 pr-4">{row.day}</td>
                    <td className="py-2">{row.touches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
              Top zonas
            </h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-tagme-slate/15 text-left">
                  <th className="py-2 pr-4">Zona</th>
                  <th className="py-2">Toques</th>
                </tr>
              </thead>
              <tbody>
                {report.topZones.map((row) => (
                  <tr key={row.zone} className="border-b border-tagme-slate/10">
                    <td className="py-2 pr-4">{row.zone}</td>
                    <td className="py-2">{row.touches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
              Destinos
            </h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-tagme-slate/15 text-left">
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Visitas</th>
                  <th className="py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {report.destinationBreakdown.map((row) => (
                  <tr key={row.type} className="border-b border-tagme-slate/10">
                    <td className="py-2 pr-4">{row.type}</td>
                    <td className="py-2 pr-4">{row.count}</td>
                    <td className="py-2">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
              KPIs
            </h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-tagme-slate/15 text-left">
                  <th className="py-2 pr-4">Indicador</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {report.kpis.map((kpi) => (
                  <tr key={kpi.key} className="border-b border-tagme-slate/10">
                    <td className="py-2 pr-4">{kpi.label}</td>
                    <td className="py-2 pr-4">{kpi.value}</td>
                    <td className="py-2">{kpi.target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
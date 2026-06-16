/**
 * Dashboard Gerente General (M2 — G1)
 *
 * Manual validation checklist (SC-G001–G003):
 * - SC-G001: GG identifica pulso + 3 KPIs + tendencia en ≤2 min
 * - SC-G002: PulsePanel polls /api/executive/pulse cada 30 s
 * - SC-G003: RSC carga overview server-side; objetivo carga ≤3 s
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TouchChart } from "@/components/charts/TouchChart";
import { CalibrationBanner } from "@/components/executive/CalibrationBanner";
import { DepartmentSummaryRow } from "@/components/executive/DepartmentSummaryRow";
import { ExecutiveFilters } from "@/components/executive/ExecutiveFilters";
import { KpiCard } from "@/components/executive/KpiCard";
import { AlertFeed } from "@/components/executive/AlertFeed";
import { PulsePanel } from "@/components/executive/PulsePanel";
import { RoiSummaryCard } from "@/components/executive/RoiSummaryCard";
import { getExecutiveOverview } from "@/lib/executive/overview";
import { getFullPulse } from "@/lib/executive/queries";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ExecutiveOverviewPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (
    !session ||
    !isExecutiveSession(session) ||
    session.role !== "executive" ||
    !session.venueId
  ) {
    redirect("/login?next=/executive/overview");
  }

  const params = await searchParams;
  const period = params.period === "30d" ? "30d" : "7d";

  const [overview, pulse] = await Promise.all([
    getExecutiveOverview(session.venueId, period),
    getFullPulse(session.venueId, 30),
  ]);

  const chartData = overview.trend.map((p) => ({
    date: p.day,
    count: p.touches,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            Gerente General
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
            Panorama del hotel
          </h1>
          <p className="mt-1 text-sm text-tagme-slate">
            Estado consolidado — {session.venueName}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExecutiveFilters defaultPeriod={period} />
        </Suspense>
      </header>

      <CalibrationBanner baseline={overview.baselineStatus} />

      {overview.topAlerts.length > 0 && (
        <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <AlertFeed
            venueId={session.venueId}
            initialAlerts={overview.topAlerts}
            compact
            poll
          />
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PulsePanel venueId={session.venueId} initialData={pulse} />
        </div>
        <RoiSummaryCard roi={overview.roi} />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {overview.kpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            kpi={kpi}
            baselineReady={overview.baselineStatus.ready}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Tendencia — {period === "7d" ? "7 días" : "30 días"}
        </h2>
        <TouchChart data={chartData} />
      </section>

      <DepartmentSummaryRow summaries={overview.departmentSummaries} />

      <p id="calibracion" className="text-xs text-tagme-slate/50">
        Calibración CL-11: 14 días y 100 toques antes de activar semáforos de
        metas. Los datos operativos están disponibles desde el día 1.
      </p>
    </div>
  );
}
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DestinationBreakdown } from "@/components/charts/DestinationBreakdown";
import { PeakHoursChart } from "@/components/charts/PeakHoursChart";
import { AlertFeed } from "@/components/executive/AlertFeed";
import { CalibrationBanner } from "@/components/executive/CalibrationBanner";
import { ExecutiveFilters } from "@/components/executive/ExecutiveFilters";
import { KpiCard } from "@/components/executive/KpiCard";
import { PulsePanel } from "@/components/executive/PulsePanel";
import { TagRankingTable } from "@/components/executive/TagRankingTable";
import { ZoneHeatmap } from "@/components/executive/ZoneHeatmap";
import { getDepartmentDashboard } from "@/lib/executive/department";
import { getFullPulse } from "@/lib/executive/queries";
import {
  canAccessDashboard,
  type ExecutiveScopeContext,
} from "@/lib/executive/scope";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    zone?: string;
    tagId?: string;
  }>;
}

export default async function FnbDashboardPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/fnb");
  }

  const ctx: ExecutiveScopeContext = {
    role: session.role,
    executiveScope: session.executiveScope,
  };

  if (!canAccessDashboard(ctx, "fnb")) {
    redirect("/executive/alerts");
  }

  const params = await searchParams;
  const period = params.period === "30d" ? "30d" : "7d";

  const [dashboard, pulse] = await Promise.all([
    getDepartmentDashboard(session.venueId, "fnb", ctx, {
      period,
      zone: params.zone,
      tagId: params.tagId,
    }),
    getFullPulse(session.venueId, 30),
  ]);

  const filterTags = dashboard.tagRanking.map((t) => ({
    tagId: t.tagId,
    label: t.label,
  }));

  const menuKpi = dashboard.kpis.find((k) => k.key === "menu_visit_pct");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            F&B
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
            Dashboard F&B
          </h1>
          <p className="mt-1 text-sm text-tagme-slate">
            Menú digital, horas pico y demanda — {session.venueName}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExecutiveFilters
            defaultPeriod={period}
            scope="fnb"
            tags={filterTags}
          />
        </Suspense>
      </header>

      <CalibrationBanner baseline={dashboard.baselineStatus} />

      {dashboard.topAlerts.length > 0 && (
        <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <AlertFeed
            venueId={session.venueId}
            initialAlerts={dashboard.topAlerts}
            compact
            poll
          />
        </section>
      )}

      <PulsePanel venueId={session.venueId} initialData={pulse} />

      <section className="grid gap-4 md:grid-cols-2">
        {dashboard.kpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            kpi={kpi}
            baselineReady={dashboard.baselineStatus.ready}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Horas pico — restaurante y bar
        </h2>
        <PeakHoursChart data={dashboard.peakHours} />
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Heatmap horario por zona
        </h2>
        <ZoneHeatmap cells={dashboard.zoneHeatmap} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Destinos consultados (F&B)
          </h2>
          <DestinationBreakdown data={dashboard.destinationBreakdown} />
          {menuKpi && (
            <p className="mt-4 text-xs text-tagme-slate/60">
              Visitas a menú: {menuKpi.value}% del total de destinos en tags
              restaurante/bar.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Temas AVEX — horarios y menú
          </h2>
          <p className="mb-4 text-xs text-tagme-slate/60">
            Consultas AVEX relacionadas con gastronomía en el período.
          </p>
          {dashboard.fnbAvexTopics.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-tagme-ink">
              {dashboard.fnbAvexTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-tagme-slate/60">
              Sin temas AVEX identificables de F&B en el período.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Ranking de tags — restaurante y bar
        </h2>
        <TagRankingTable venueId={session.venueId} tags={dashboard.tagRanking} />
      </section>
    </div>
  );
}
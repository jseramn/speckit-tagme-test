import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ZoneHeatmap } from "@/components/executive/ZoneHeatmap";
import { TagRankingTable } from "@/components/executive/TagRankingTable";
import { AlertFeed } from "@/components/executive/AlertFeed";
import { CalibrationBanner } from "@/components/executive/CalibrationBanner";
import { ExecutiveFilters } from "@/components/executive/ExecutiveFilters";
import { KpiCard } from "@/components/executive/KpiCard";
import { PulsePanel } from "@/components/executive/PulsePanel";
import {
  canAccessDashboard,
  type ExecutiveScopeContext,
} from "@/lib/executive/scope";
import { getDepartmentDashboard } from "@/lib/executive/department";
import { getFullPulse } from "@/lib/executive/queries";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    zone?: string;
    tagId?: string;
  }>;
}

export default async function OperationsDashboardPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/operations");
  }

  const ctx: ExecutiveScopeContext = {
    role: session.role,
    executiveScope: session.executiveScope,
  };

  if (!canAccessDashboard(ctx, "operations")) {
    redirect("/executive/alerts");
  }

  const params = await searchParams;
  const period = params.period === "30d" ? "30d" : "7d";

  const [dashboard, pulse] = await Promise.all([
    getDepartmentDashboard(session.venueId, "operations", ctx, {
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            Operaciones / Rooms
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
            Dashboard Operaciones
          </h1>
          <p className="mt-1 text-sm text-tagme-slate">
            Zonas, tags y fricción NFC — {session.venueName}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExecutiveFilters
            defaultPeriod={period}
            scope="operations"
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
          Heatmap horario por zona
        </h2>
        <ZoneHeatmap cells={dashboard.zoneHeatmap} />
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Ranking de tags
        </h2>
        <TagRankingTable venueId={session.venueId} tags={dashboard.tagRanking} />
      </section>

      {dashboard.atypicalRooms.length > 0 && (
        <section className="rounded-2xl border border-amber-200/60 bg-amber-50/30 p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-amber-800/80">
            Habitaciones atípicas (AVEX)
          </h2>
          <p className="mb-4 text-xs text-tagme-slate/70">
            Sesiones AVEX &gt;3× la media del hotel. Solo identificador de
            habitación — sin datos de huésped.
          </p>
          <ul className="space-y-2">
            {dashboard.atypicalRooms.map((room) => (
              <li
                key={room.roomNumber}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium text-tagme-ink">{room.label}</span>
                <span className="text-tagme-slate">
                  {room.sessionCount} sesiones · {room.multiplier}× media
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dashboard.nfcFriction.length > 0 && (
        <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Fricción de acceso (canal)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {dashboard.nfcFriction.map((ch) => (
              <div
                key={ch.channel}
                className="rounded-xl border border-tagme-slate/10 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-widest text-tagme-slate/50">
                  {ch.channel}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {ch.pct}%
                </p>
                <p className="text-xs text-tagme-slate/60">{ch.count} toques</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
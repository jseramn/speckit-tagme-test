import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AvexEffectiveness } from "@/components/executive/AvexEffectiveness";
import { TagRankingTable } from "@/components/executive/TagRankingTable";
import { AlertFeed } from "@/components/executive/AlertFeed";
import { CalibrationBanner } from "@/components/executive/CalibrationBanner";
import { ExecutiveFilters } from "@/components/executive/ExecutiveFilters";
import { KpiCard } from "@/components/executive/KpiCard";
import { PulsePanel } from "@/components/executive/PulsePanel";
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

export default async function FrontOfficeDashboardPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/front-office");
  }

  const ctx: ExecutiveScopeContext = {
    role: session.role,
    executiveScope: session.executiveScope,
  };

  if (!canAccessDashboard(ctx, "front_office")) {
    redirect("/executive/alerts");
  }

  const params = await searchParams;
  const period = params.period === "30d" ? "30d" : "7d";

  const [dashboard, pulse] = await Promise.all([
    getDepartmentDashboard(session.venueId, "front_office", ctx, {
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
            Front Office / Recepción
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
            Dashboard Recepción
          </h1>
          <p className="mt-1 text-sm text-tagme-slate">
            AVEX, derivaciones y temas — {session.venueName}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExecutiveFilters
            defaultPeriod={period}
            scope="front_office"
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
          Efectividad AVEX
        </h2>
        <AvexEffectiveness
          rows={dashboard.avexEffectiveness}
          topTopics={dashboard.topDerivationTopics}
        />
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Top 3 temas de derivación
        </h2>
        <p className="mb-4 text-xs text-tagme-slate/60">
          SC-G009: visible al abrir el dashboard — sin navegación adicional.
        </p>
        {dashboard.topDerivationTopics.length > 0 ? (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-tagme-ink">
            {dashboard.topDerivationTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-tagme-slate/60">
            Sin derivaciones con temas identificables en el período.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Tags lobby — rendimiento
        </h2>
        <TagRankingTable venueId={session.venueId} tags={dashboard.tagRanking} />
      </section>
    </div>
  );
}
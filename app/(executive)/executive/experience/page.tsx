import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CountryBreakdownChart } from "@/components/charts/CountryBreakdownChart";
import { DestinationBreakdown } from "@/components/charts/DestinationBreakdown";
import { DeviceBreakdownChart } from "@/components/charts/DeviceBreakdownChart";
import { AlertFeed } from "@/components/executive/AlertFeed";
import { CalibrationBanner } from "@/components/executive/CalibrationBanner";
import { ExecutiveFilters } from "@/components/executive/ExecutiveFilters";
import { KpiCard } from "@/components/executive/KpiCard";
import { PulsePanel } from "@/components/executive/PulsePanel";
import { TagRankingTable } from "@/components/executive/TagRankingTable";
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

function formatDelta(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

export default async function ExperienceDashboardPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/experience");
  }

  const ctx: ExecutiveScopeContext = {
    role: session.role,
    executiveScope: session.executiveScope,
  };

  if (!canAccessDashboard(ctx, "experience")) {
    redirect("/executive/alerts");
  }

  const params = await searchParams;
  const period = params.period === "30d" ? "30d" : "7d";

  const [dashboard, pulse] = await Promise.all([
    getDepartmentDashboard(session.venueId, "experience", ctx, {
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

  const impact = dashboard.contentImpact;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            Experiencia / Marketing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
            Dashboard Experiencia
          </h1>
          <p className="mt-1 text-sm text-tagme-slate">
            Destinos, perfil de demanda e impacto de contenido —{" "}
            {session.venueName}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExecutiveFilters
            defaultPeriod={period}
            scope="experience"
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
          Destinos consultados
        </h2>
        <DestinationBreakdown data={dashboard.destinationBreakdown} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Perfil de dispositivo
          </h2>
          <DeviceBreakdownChart data={dashboard.deviceBreakdown} />
        </div>

        <div className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Origen geográfico (agregado)
          </h2>
          <CountryBreakdownChart data={dashboard.countryBreakdown} />
        </div>
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Impacto post-actualización de contenido
        </h2>
        <p className="mb-4 text-xs text-tagme-slate/60">
          Comparativo de {impact?.windowDays ?? 7} días posteriores vs.{" "}
          {impact?.windowDays ?? 7} días previos al último cambio en{" "}
          <span className="font-medium text-tagme-ink">
            experience_configs.updated_at
          </span>
          .
        </p>
        {impact ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-tagme-slate/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-tagme-slate/50">
                Config actualizada
              </p>
              <p className="mt-1 text-sm font-medium text-tagme-ink">
                {impact.configTitle}
              </p>
              <p className="mt-0.5 text-xs text-tagme-slate/60">
                {new Date(impact.updatedAt).toLocaleDateString("es-CO")}
              </p>
            </div>
            <div className="rounded-xl border border-tagme-slate/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-tagme-slate/50">
                Toques Δ
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatDelta(impact.touchesDeltaPct)}
              </p>
              <p className="text-xs text-tagme-slate/60">
                {impact.postTouches} post · {impact.priorTouches} previo
              </p>
            </div>
            <div className="rounded-xl border border-tagme-slate/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-tagme-slate/50">
                Destinos Δ
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatDelta(impact.destinationsDeltaPct)}
              </p>
              <p className="text-xs text-tagme-slate/60">
                {impact.postDestinations} post · {impact.priorDestinations}{" "}
                previo
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-tagme-slate/60">
            Aún no hay una ventana completa de 7 días posteriores a la última
            actualización de contenido, o no hay configuración registrada.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Tags por engagement
        </h2>
        <TagRankingTable venueId={session.venueId} tags={dashboard.tagRanking} />
      </section>
    </div>
  );
}
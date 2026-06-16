import { Suspense } from "react";
import type { MetricsSummary } from "@/lib/validators/events";
import { CountryBreakdownChart } from "@/components/charts/CountryBreakdownChart";
import { DestinationBreakdown } from "@/components/charts/DestinationBreakdown";
import { DeviceBreakdownChart } from "@/components/charts/DeviceBreakdownChart";
import { PeakHoursChart } from "@/components/charts/PeakHoursChart";
import { TouchChart } from "@/components/charts/TouchChart";
import { DashboardFilters } from "./DashboardFilters";

export interface TagFilterOption {
  id: string;
  slug: string;
  label: string;
}

export interface MetricsDashboardProps {
  metrics: MetricsSummary;
  defaultFrom: string;
  defaultTo: string;
  tags: TagFilterOption[];
  selectedTagId?: string;
}

export function MetricsDashboard({
  metrics,
  defaultFrom,
  defaultTo,
  tags,
  selectedTagId,
}: MetricsDashboardProps) {
  const totalTouches = metrics.touchesDaily.reduce((sum, d) => sum + d.count, 0);
  const totalVisits = metrics.destinationBreakdown.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <DashboardFilters
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          tags={tags}
          selectedTagId={selectedTagId}
        />
      </Suspense>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Toques" value={totalTouches} />
        <StatCard label="Visitas destinos" value={totalVisits} />
        <StatCard
          label="Tipos destino"
          value={metrics.destinationBreakdown.length}
        />
        <StatCard label="Países" value={metrics.countryBreakdown.length} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Toques por día">
          <TouchChart data={metrics.touchesDaily} />
        </ChartCard>

        <ChartCard title="Horas pico">
          <PeakHoursChart data={metrics.peakHours} />
        </ChartCard>

        <ChartCard title="Destinos más visitados" className="lg:col-span-2">
          <DestinationBreakdown data={metrics.destinationBreakdown} />
        </ChartCard>

        <ChartCard title="Dispositivos">
          <DeviceBreakdownChart data={metrics.deviceBreakdown} />
        </ChartCard>

        <ChartCard title="Origen geográfico">
          <CountryBreakdownChart data={metrics.countryBreakdown} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-tagme-slate/10 bg-white px-4 py-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-tagme-slate/60">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-tagme-ink">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm sm:p-6",
        className,
      ].join(" ")}
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
        {title}
      </h2>
      {children}
    </section>
  );
}
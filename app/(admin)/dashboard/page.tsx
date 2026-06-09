import { format, subDays } from "date-fns";
import { redirect } from "next/navigation";
import { MetricsDashboard } from "@/components/admin/MetricsDashboard";
import { fetchVenueTags } from "@/lib/admin/venue-tags";
import { getMetricsSummary, resolveVenueIdBySlug } from "@/lib/analytics/metrics";
import { getSession } from "@/lib/auth/session";

interface DashboardPageProps {
  searchParams: Promise<{ from?: string; to?: string; tagId?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const from = params.from ?? defaultFrom;
  const to = params.to ?? defaultTo;
  const tagId = params.tagId;

  const venueId =
    session.venueId ??
    (await resolveVenueIdBySlug("hotel-caribe"));

  if (!venueId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">TagMétricas</h1>
        <p className="mt-4 text-tagme-slate">
          No se encontró el venue piloto. Ejecuta{" "}
          <code className="rounded bg-tagme-cream px-1.5 py-0.5 text-sm">
            npm run seed
          </code>
          .
        </p>
      </main>
    );
  }

  let metrics;
  let error: string | null = null;

  try {
    metrics = await getMetricsSummary({ venueId, from, to, tagId });
  } catch (err) {
    error = err instanceof Error ? err.message : "Error al cargar métricas";
  }

  const tags = await fetchVenueTags(venueId);

  return (
    <main className="px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          TagMétricas · M6
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-tagme-slate">
          {session.venueName ?? "Hotel Caribe"} · {session.displayName}
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {metrics && (
        <MetricsDashboard
          metrics={metrics}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          tags={tags}
          selectedTagId={tagId}
        />
      )}
    </main>
  );
}
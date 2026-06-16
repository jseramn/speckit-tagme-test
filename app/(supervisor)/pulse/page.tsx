import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { parsePeriod } from "@/lib/scorecards/parse-period";
import { queryHotelScorecard } from "@/lib/scorecards/query-hotel";

export default async function SupervisorPulsePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/pulse");
  }

  const period = parsePeriod("7d");
  let pulse: {
    npsInternal: number | null;
    feedbackCount: number;
    openIncidents: number;
    insufficientData: boolean;
  } | null = null;

  if (session.venueId && (session.role === "manager" || session.role === "admin")) {
    const hotel = await queryHotelScorecard(session.venueId, period);
    if (hotel) {
      pulse = {
        npsInternal: hotel.metrics.npsInternal,
        feedbackCount: hotel.metrics.feedbackCount,
        openIncidents: hotel.metrics.openIncidents,
        insufficientData: hotel.metrics.insufficientData,
      };
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Pulso operativo
        </p>
        <h1 className="mt-2 text-3xl font-light text-tagme-ink">Pulso</h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Resumen de señales directas de feedback e incidencias abiertas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {pulse ? (
          <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-tagme-slate/70">
              Hotel · 7 días
            </h2>
            {pulse.insufficientData ? (
              <p className="mt-4 text-sm text-tagme-slate">
                Datos insuficientes (n={pulse.feedbackCount}) para NPS hotelero.
              </p>
            ) : (
              <p className="mt-4 text-4xl font-light text-tagme-ink">
                NPS {pulse.npsInternal}
              </p>
            )}
            <p className="mt-2 text-xs text-tagme-slate/60">
              {pulse.feedbackCount} opiniones · {pulse.openIncidents} incidencias
              abiertas
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-tagme-slate/70">
              Pulso hotel
            </h2>
            <p className="mt-4 text-sm text-tagme-slate">
              Disponible para gerente/admin. Use scorecards de departamento para
              su equipo.
            </p>
          </section>
        )}

        <Link
          href="/scorecards"
          className="flex flex-col justify-center rounded-2xl border border-tagme-gold/25 bg-tagme-gold/5 p-6 transition-colors hover:bg-tagme-gold/10"
        >
          <span className="text-sm font-semibold text-tagme-ink">
            Ver scorecards de equipo →
          </span>
          <span className="mt-2 text-xs text-tagme-slate">
            Drill-down por departamento, turno y empleado
          </span>
        </Link>

        <Link
          href="/incidents"
          className="flex flex-col justify-center rounded-2xl border border-tagme-slate/10 bg-white p-6 transition-colors hover:border-tagme-gold/30"
        >
          <span className="text-sm font-semibold text-tagme-ink">
            Bandeja de incidencias →
          </span>
          <span className="mt-2 text-xs text-tagme-slate">
            Problemas reportados por huéspedes
          </span>
        </Link>
      </div>
    </main>
  );
}
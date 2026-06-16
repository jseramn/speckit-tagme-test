import { redirect } from "next/navigation";
import { ReportExportForm } from "@/components/executive/ReportExportForm";
import { canAccessDashboard } from "@/lib/executive/scope";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

export default async function ReportsPage() {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Reportes ejecutivos
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Exportar resumen
        </h1>
        <p className="mt-1 text-sm text-tagme-slate">
          Resumen semanal o mensual para comité de gerencia — {session.venueName}
        </p>
      </header>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
        <ReportExportForm
          venueId={session.venueId}
          venueName={session.venueName ?? "venue"}
        />
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-tagme-cream/30 p-5">
        <h2 className="text-sm font-medium text-tagme-ink">
          Dimensiones incluidas (SC-G007)
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-tagme-slate">
          <li>Interacciones totales y tendencia diaria</li>
          <li>Top zonas por volumen</li>
          <li>Distribución de destinos visitados</li>
          <li>Efectividad AVEX (sesiones, derivación)</li>
          <li>Alertas del período y reconocidas</li>
          <li>KPIs clave y ROI estimado</li>
        </ul>
      </section>
    </div>
  );
}
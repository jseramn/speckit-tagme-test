import { redirect } from "next/navigation";
import { AlertFeed } from "@/components/executive/AlertFeed";
import { listExecutiveAlerts } from "@/lib/executive/alerts/queries";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

export default async function ExecutiveAlertsPage() {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/alerts");
  }

  const initialAlerts = await listExecutiveAlerts({
    venueId: session.venueId,
    status: ["active", "acknowledged", "assigned"],
    limit: 50,
  });

  const activeCount = initialAlerts.filter((a) => a.status === "active").length;
  const criticalCount = initialAlerts.filter(
    (a) => a.severity === "critical" && a.status === "active",
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Control gerencial
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Bandeja de alertas
        </h1>
        <p className="mt-1 text-sm text-tagme-slate">
          {session.venueName} — {activeCount} activa
          {activeCount === 1 ? "" : "s"}
          {criticalCount > 0
            ? ` · ${criticalCount} crítica${criticalCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </header>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
        <AlertFeed
          venueId={session.venueId}
          initialAlerts={initialAlerts}
          showHeader={false}
          poll
        />
      </section>

      <p className="text-xs text-tagme-slate/50">
        Las alertas se evalúan automáticamente cada 5 minutos. Fuera del
        horario operativo (06:00–23:00 America/Bogota) solo se generan alertas
        críticas de sistema y tags desactivados.
      </p>
    </div>
  );
}
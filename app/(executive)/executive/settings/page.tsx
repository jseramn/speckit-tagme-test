import { redirect } from "next/navigation";
import { ExecutiveSettingsForm } from "@/components/executive/ExecutiveSettingsForm";
import { canAccessDashboard } from "@/lib/executive/scope";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

export default async function ExecutiveSettingsPage() {
  const session = await getSession();
  if (!session || !isExecutiveSession(session) || !session.venueId) {
    redirect("/login?next=/executive/settings");
  }

  const ctx = {
    role: session.role,
    executiveScope: session.executiveScope,
  };

  if (!canAccessDashboard(ctx, "settings") || session.role !== "executive") {
    redirect("/executive/overview");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Configuración
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Umbrales y metas
        </h1>
        <p className="mt-1 text-sm text-tagme-slate">
          Ajuste alertas y objetivos KPI para {session.venueName} — cambios
          quedan registrados en auditoría gerencial.
        </p>
      </header>

      <ExecutiveSettingsForm venueId={session.venueId} />

      <section className="rounded-2xl border border-tagme-slate/10 bg-tagme-cream/30 p-5">
        <h2 className="text-sm font-medium text-tagme-ink">
          Calibración del piloto (14 días)
        </h2>
        <p className="mt-2 text-sm text-tagme-slate">
          Durante la primera semana, los dashboards muestran el banner de
          calibración. Las metas KPI no activan semáforo hasta completar
          baseline (≥100 toques + 14 días). Consulte{" "}
          <code className="text-xs">specs/002-clevel/quickstart.md</code> para
          el tour de capacitación.
        </p>
      </section>
    </div>
  );
}
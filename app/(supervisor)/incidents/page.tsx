import { listIncidents } from "@/lib/supervisor/list-incidents";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { IncidentInbox } from "@/components/supervisor/IncidentInbox";

export default async function SupervisorIncidentsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/incidents");
  }

  const openIncidents = await listIncidents(session, {
    status: "open",
    limit: 100,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Operaciones
        </p>
        <h1 className="mt-2 text-3xl font-light text-tagme-ink">
          Incidencias
        </h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Bandeja de problemas reportados por huéspedes. Separada del flujo de
          feedback (Principio IV).
        </p>
      </header>

      <IncidentInbox initialOpenCount={openIncidents.total} />
    </main>
  );
}
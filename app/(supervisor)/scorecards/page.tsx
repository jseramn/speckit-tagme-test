import { redirect } from "next/navigation";
import { ScorecardDrillDown } from "@/components/supervisor/ScorecardDrillDown";
import { getSession } from "@/lib/auth/session";
import { supervisorScopeDepartmentIds } from "@/lib/supervisor/department-scope";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export default async function SupervisorScorecardsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/scorecards");
  }

  const scopeIds = await supervisorScopeDepartmentIds(session);
  const insforge = createInsforgeServerClient();

  let departments: { id: string; name: string }[] = [];

  if (scopeIds === null) {
    const { data } = await insforge.database
      .from("departments")
      .select("id, name")
      .eq("venue_id", session.venueId!)
      .eq("is_active", true)
      .order("name");
    departments = (data ?? []) as { id: string; name: string }[];
  } else if (scopeIds.length > 0) {
    const { data } = await insforge.database
      .from("departments")
      .select("id, name")
      .in("id", scopeIds)
      .eq("is_active", true)
      .order("name");
    departments = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Equipo
        </p>
        <h1 className="mt-2 text-3xl font-light text-tagme-ink">Scorecards</h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Drill-down Departamento → Turno → Empleado. Solo feedback con origen{" "}
          <code className="text-xs">staff_nfc</code> alimenta scorecards de
          empleado.
        </p>
      </header>

      <ScorecardDrillDown departments={departments} />
    </main>
  );
}
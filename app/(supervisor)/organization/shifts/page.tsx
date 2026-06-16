import { redirect } from "next/navigation";
import { OrganizationTree } from "@/components/supervisor/OrganizationTree";
import { ShiftsPanel } from "@/components/supervisor/ShiftsPanel";
import { getSession } from "@/lib/auth/session";
import { loadOrgDepartments } from "@/lib/supervisor/load-org-departments";

export default async function OrganizationShiftsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/organization/shifts");

  const departments = await loadOrgDepartments(session);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-light text-tagme-ink">Turnos</h1>
        <p className="mt-1 text-sm text-tagme-slate/80">
          Horarios de referencia por departamento. El turno al capturar se
          resuelve solo por asignación explícita.
        </p>
      </header>

      <OrganizationTree
        departments={departments}
        activePath="/organization/shifts"
      />

      <div className="mt-8">
        <ShiftsPanel departments={departments} />
      </div>
    </main>
  );
}
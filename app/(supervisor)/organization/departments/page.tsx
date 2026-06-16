import { redirect } from "next/navigation";
import { OrganizationTree } from "@/components/supervisor/OrganizationTree";
import { getSession, isExecutiveSession } from "@/lib/auth/session";
import { loadOrgDepartments } from "@/lib/supervisor/load-org-departments";

export default async function OrganizationDepartmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("");
  }

  if (isExecutiveSession(session)) {
    redirect('/executive/overview');
  }

  const departments = await loadOrgDepartments(session);
  const isManager = session.role === "manager" || session.role === "admin";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-light text-tagme-ink">Departamentos</h1>
        <p className="mt-1 text-sm text-tagme-slate/80">
          {isManager
            ? "Manager/admin puede crear departamentos vía API POST /api/supervisor/departments."
            : "Supervisor ve y gestiona solo departamentos asignados."}
        </p>
      </header>

      <OrganizationTree
        departments={departments}
        activePath="/organization/departments"
      />

      <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10">
        <ul className="space-y-2">
          {departments.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl bg-tagme-cream/40 px-4 py-3 text-sm"
            >
              <span className="font-medium text-tagme-ink">{d.name}</span>
              <span className="text-xs uppercase tracking-wider text-tagme-slate/60">
                {d.code}
                {!d.isActive ? " · inactivo" : ""}
              </span>
            </li>
          ))}
        </ul>
        {isManager ? (
          <p className="mt-4 text-xs text-tagme-slate/60">
            Para crear departamentos nuevos use la API o solicite al equipo
            técnico el formulario de alta en una iteración posterior.
          </p>
        ) : null}
      </div>
    </main>
  );
}


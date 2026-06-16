import { redirect } from "next/navigation";
import { JobRolesPanel } from "@/components/supervisor/JobRolesPanel";
import { OrganizationTree } from "@/components/supervisor/OrganizationTree";
import { getSession } from "@/lib/auth/session";
import { loadOrgDepartments } from "@/lib/supervisor/load-org-departments";

export default async function OrganizationJobRolesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/organization/job-roles");

  const departments = await loadOrgDepartments(session);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-light text-tagme-ink">Cargos</h1>
        <p className="mt-1 text-sm text-tagme-slate/80">
          CRUD de job_roles por departamento (T115 · Principio VIII).
        </p>
      </header>

      <OrganizationTree
        departments={departments}
        activePath="/organization/job-roles"
      />

      <div className="mt-8">
        <JobRolesPanel departments={departments} />
      </div>
    </main>
  );
}
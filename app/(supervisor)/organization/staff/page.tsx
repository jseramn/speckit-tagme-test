import { redirect } from "next/navigation";
import { OrganizationTree } from "@/components/supervisor/OrganizationTree";
import { StaffOrgPanel } from "@/components/supervisor/StaffOrgPanel";
import { getSession, isExecutiveSession } from "@/lib/auth/session";
import { loadOrgDepartments } from "@/lib/supervisor/load-org-departments";

export default async function OrganizationStaffPage() {
  const session = await getSession();
  if (!session) {
    redirect("");
  }

  if (isExecutiveSession(session)) {
    redirect('/executive/overview');
  }

  const departments = await loadOrgDepartments(session);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-light text-tagme-ink">
          Empleados y NFC
        </h1>
        <p className="mt-1 text-sm text-tagme-slate/80">
          Alta de personal, asignación de cargo, turno y tarjeta NFC sin deploy.
        </p>
      </header>

      <OrganizationTree
        departments={departments}
        activePath="/organization/staff"
      />

      <div className="mt-8">
        <StaffOrgPanel departments={departments} />
      </div>
    </main>
  );
}


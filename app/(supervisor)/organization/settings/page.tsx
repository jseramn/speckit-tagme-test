import { redirect } from "next/navigation";
import { OrganizationTree } from "@/components/supervisor/OrganizationTree";
import { VenueSettingsPanel } from "@/components/supervisor/VenueSettingsPanel";
import { getSession } from "@/lib/auth/session";
import { loadOrgDepartments } from "@/lib/supervisor/load-org-departments";

export default async function OrganizationSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/organization/settings");

  const departments = await loadOrgDepartments(session);
  const canEdit = session.role === "manager" || session.role === "admin";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-light text-tagme-ink">
          Configuración del venue
        </h1>
        <p className="mt-1 text-sm text-tagme-slate/80">
          Umbrales NPS, TTL de estadías y categorías de incidencia.
        </p>
      </header>

      <OrganizationTree
        departments={departments}
        activePath="/organization/settings"
      />

      <div className="mt-8">
        <VenueSettingsPanel canEdit={canEdit} />
      </div>
    </main>
  );
}
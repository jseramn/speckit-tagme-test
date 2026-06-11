import Link from "next/link";
import { redirect } from "next/navigation";
import {
  OrganizationTree,
  type OrgDepartment,
} from "@/components/supervisor/OrganizationTree";
import { getSession } from "@/lib/auth/session";
import { loadOrgDepartments } from "@/lib/supervisor/load-org-departments";

const QUICK_LINKS = [
  {
    href: "/organization/job-roles",
    title: "Cargos (job_roles)",
    body: "Crear y desactivar cargos por departamento sin deploy (Principio VIII).",
  },
  {
    href: "/organization/shifts",
    title: "Turnos",
    body: "Definir horarios de referencia y asignarlos a empleados.",
  },
  {
    href: "/organization/staff",
    title: "Empleados y NFC",
    body: "Alta de personal, asignación de cargo y vinculación de tarjeta.",
  },
  {
    href: "/organization/settings",
    title: "Umbrales y categorías",
    body: "TTL estadías, umbral NPS y categorías de incidencia del venue.",
  },
] as const;

export default async function OrganizationHubPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/organization");

  const departments: OrgDepartment[] = await loadOrgDepartments(session);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Configuración
        </p>
        <h1 className="mt-2 text-3xl font-light text-tagme-ink">
          Organización
        </h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Configure departamentos, cargos, turnos y empleados sin intervención
          de desarrollo. Listo para piloto Hotel Caribe.
        </p>
      </header>

      <OrganizationTree
        departments={departments}
        activePath="/organization"
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10 transition-shadow hover:shadow-md"
          >
            <h2 className="text-sm font-semibold text-tagme-ink">
              {link.title}
            </h2>
            <p className="mt-2 text-sm text-tagme-slate/80">{link.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
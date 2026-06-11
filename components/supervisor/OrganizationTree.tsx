"use client";

import Link from "next/link";

export interface OrgDepartment {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface OrganizationTreeProps {
  departments: OrgDepartment[];
  activePath?: string;
}

const SECTIONS = [
  { href: "/organization/departments", label: "Departamentos" },
  { href: "/organization/job-roles", label: "Cargos" },
  { href: "/organization/shifts", label: "Turnos" },
  { href: "/organization/staff", label: "Empleados" },
  { href: "/organization/settings", label: "Configuración venue" },
] as const;

export function OrganizationTree({
  departments,
  activePath,
}: OrganizationTreeProps) {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const active = activePath === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={[
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-tagme-cream text-tagme-ink"
                  : "bg-white text-tagme-slate ring-1 ring-tagme-slate/10 hover:bg-tagme-cream/60",
              ].join(" ")}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10">
        <h3 className="text-sm font-semibold text-tagme-ink">
          Departamentos en su alcance
        </h3>
        <ul className="mt-3 space-y-2">
          {departments.length === 0 ? (
            <li className="text-sm text-tagme-slate/70">
              Sin departamentos asignados.
            </li>
          ) : (
            departments.map((dept) => (
              <li
                key={dept.id}
                className="flex items-center justify-between rounded-xl bg-tagme-cream/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-tagme-ink">{dept.name}</span>
                <span className="text-xs uppercase tracking-wider text-tagme-slate/60">
                  {dept.code}
                  {!dept.isActive ? " · inactivo" : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
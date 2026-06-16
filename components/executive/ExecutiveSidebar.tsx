"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ExecutiveDashboard } from "@/lib/executive/scope";
import type { ExecutiveSession } from "@/lib/auth/session";

interface NavItem {
  href: string;
  label: string;
  dashboard: ExecutiveDashboard;
}

/** Dashboards with pages shipped through M5. */
const IMPLEMENTED_DASHBOARDS = new Set<ExecutiveDashboard>([
  "overview",
  "operations",
  "fnb",
  "experience",
  "front_office",
  "alerts",
  "reports",
  "settings",
]);

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/executive/overview", label: "Panorama", dashboard: "overview" },
  { href: "/executive/operations", label: "Operaciones", dashboard: "operations" },
  { href: "/executive/fnb", label: "F&B", dashboard: "fnb" },
  { href: "/executive/experience", label: "Experiencia", dashboard: "experience" },
  {
    href: "/executive/front-office",
    label: "Recepción",
    dashboard: "front_office",
  },
  { href: "/executive/alerts", label: "Alertas", dashboard: "alerts" },
  { href: "/executive/reports", label: "Reportes", dashboard: "reports" },
  { href: "/executive/settings", label: "Configuración", dashboard: "settings" },
];

interface ExecutiveSidebarProps {
  session: ExecutiveSession;
  accessibleDashboards: ExecutiveDashboard[];
}

export function ExecutiveSidebar({
  session,
  accessibleDashboards,
}: ExecutiveSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = new Set(accessibleDashboards);

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.replace("/login?next=/executive/overview");
    router.refresh();
  }

  const scopeLabel =
    session.role === "executive"
      ? "Gerente General"
      : session.executiveScope
        ? `${session.role} · ${session.executiveScope}`
        : session.role;

  return (
    <aside className="flex w-full flex-col border-b border-tagme-slate/10 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="px-5 py-6">
        <Image src="/logo.png" alt="TagMe Logo" width={32} height={32} className="mb-3 object-contain" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          TagMe
        </p>
        <h2 className="mt-1 text-lg font-semibold text-tagme-ink">
          Visibilidad Gerencial
        </h2>
        <p className="mt-2 text-xs text-tagme-slate">
          {session.displayName}
          {session.venueName ? ` · ${session.venueName}` : ""}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-tagme-slate/50">
          {scopeLabel}
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {ALL_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const enabled =
            allowed.has(item.dashboard) &&
            IMPLEMENTED_DASHBOARDS.has(item.dashboard);

          if (!enabled) {
            return (
              <span
                key={item.href}
                className="cursor-not-allowed whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-tagme-slate/40"
                title="Próximamente"
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-tagme-cream text-tagme-ink"
                  : "text-tagme-slate hover:bg-tagme-cream/60",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-tagme-slate/10 px-5 py-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-tagme-slate transition-colors hover:text-tagme-ink"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
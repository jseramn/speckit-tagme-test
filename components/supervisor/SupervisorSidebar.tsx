"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { StaffSession } from "@/lib/auth/session";

const NAV_ITEMS = [{ href: "/incidents", label: "Incidencias" }];

interface SupervisorSidebarProps {
  session: StaffSession;
}

export function SupervisorSidebar({ session }: SupervisorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col border-b border-tagme-slate/10 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="px-5 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          TagMe
        </p>
        <h2 className="mt-1 text-lg font-semibold text-tagme-ink">Supervisor</h2>
        <p className="mt-2 text-xs text-tagme-slate">
          {session.displayName}
          {session.venueName ? ` · ${session.venueName}` : ""}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-tagme-slate/50">
          {session.role}
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
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

      <div className="mt-auto hidden border-t border-tagme-slate/10 p-4 lg:block">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-tagme-slate transition-colors hover:bg-tagme-cream/80"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
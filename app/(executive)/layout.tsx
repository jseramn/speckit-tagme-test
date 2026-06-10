import { redirect } from "next/navigation";
import { ExecutiveSidebar } from "@/components/executive/ExecutiveSidebar";
import {
  canAccessExecutiveRoutes,
  getSession,
  isExecutiveSession,
} from "@/lib/auth/session";
import { getAccessibleDashboards } from "@/lib/executive/scope";

export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/executive/overview");
  }

  if (!canAccessExecutiveRoutes(session) || !isExecutiveSession(session)) {
    redirect("/login?next=/executive/overview");
  }

  const accessibleDashboards = getAccessibleDashboards({
    role: session.role,
    executiveScope: session.executiveScope,
  });

  return (
    <div className="min-h-screen bg-tagme-cream/15 font-sans text-tagme-ink lg:flex">
      <ExecutiveSidebar
        session={session}
        accessibleDashboards={accessibleDashboards}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden p-5 lg:p-8 xl:p-10">
        {children}
      </main>
    </div>
  );
}
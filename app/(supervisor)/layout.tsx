import { redirect } from "next/navigation";
import { SupervisorSidebar } from "@/components/supervisor/SupervisorSidebar";
import { getSession } from "@/lib/auth/session";

const SUPERVISOR_ROLES = new Set(["supervisor", "manager", "admin"]);

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/incidents");
  }

  if (!SUPERVISOR_ROLES.has(session.role)) {
    redirect("/login?next=/incidents");
  }

  return (
    <div className="min-h-screen bg-tagme-cream/30 font-sans text-tagme-ink lg:flex">
      <SupervisorSidebar session={session} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
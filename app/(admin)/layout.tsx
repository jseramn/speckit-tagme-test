import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (isExecutiveSession(session)) {
    redirect("/executive/overview");
  }

  return (
    <div className="min-h-screen bg-tagme-cream/30 font-sans text-tagme-ink lg:flex">
      <AdminSidebar session={session} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
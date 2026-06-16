import { redirect } from "next/navigation";
import { canManageGuestStays, getSession } from "@/lib/auth/session";

export default async function ReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/reception");
  }

  const allowed = await canManageGuestStays(session, session.venueId ?? undefined);

  if (!allowed) {
    redirect("/login?error=reception_required");
  }

  return <>{children}</>;
}
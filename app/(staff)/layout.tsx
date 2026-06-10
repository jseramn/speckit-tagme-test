import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/reception");
  }

  return (
    <div className="min-h-screen bg-tagme-cream/30 font-sans text-tagme-ink">
      {children}
    </div>
  );
}
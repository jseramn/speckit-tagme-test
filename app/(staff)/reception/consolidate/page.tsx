import { redirect } from "next/navigation";
import { StayConsolidation } from "@/components/staff/StayConsolidation";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

export default async function ReceptionConsolidatePage() {
  const session = await getSession();

  if (!session?.venueId) {
    redirect("/login?next=/reception/consolidate");
  }

  if (isExecutiveSession(session)) {
    redirect('/executive/overview');
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Recepción
        </p>
        <h1 className="mt-2 text-3xl font-light text-tagme-ink">
          Consolidación
        </h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Fusione estadías walk-in (efímeras) en una estadía formal con
          trazabilidad completa.
        </p>
      </header>

      <StayConsolidation venueId={session.venueId} />
    </main>
  );
}

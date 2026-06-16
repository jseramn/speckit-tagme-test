import { redirect } from "next/navigation";
import { MyScorecardClient } from "@/components/staff/MyScorecardClient";
import {
  getSession,
  staffMemberIdForSession,
  isExecutiveSession,
} from "@/lib/auth/session";

export default async function MyScorecardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/my-scorecard");
  }

  if (isExecutiveSession(session)) {
    redirect("/executive/overview");
  }

  const staffMemberId = await staffMemberIdForSession(session);

  if (!staffMemberId) {
    return (
      <main className="mx-auto max-w-lg px-6 py-12">
        <h1 className="text-2xl font-light text-tagme-ink">Mi scorecard</h1>
        <p className="mt-4 text-sm text-tagme-slate">
          Su cuenta no está vinculada a un empleado operativo. Contacte a
          recepción o RRHH para activar su tarjeta NFC.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Mi desempeño
        </p>
        <h1 className="mt-2 text-3xl font-light text-tagme-ink">
          Mi scorecard
        </h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Solo opiniones directas vía tu tarjeta NFC. Sin comentarios de otros
          huéspedes ni datos de compañeros.
        </p>
      </header>

      <MyScorecardClient staffMemberId={staffMemberId} />
    </main>
  );
}
import { redirect } from "next/navigation";
import { StayGenerator } from "@/components/staff/StayGenerator";
import { getSession, isExecutiveSession } from "@/lib/auth/session";

export default async function ReceptionPage() {
  const session = await getSession();

  if (!session?.venueId) {
    redirect("/login?next=/reception");
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
          Estadía del huésped
        </h1>
        <p className="mt-2 text-sm text-tagme-slate/80">
          Hola, {session.displayName}. Gestione la identidad anónima del huésped
          durante su estadía en {session.venueName ?? "el hotel"}.
        </p>
      </header>

      <StayGenerator
        venueId={session.venueId}
        venueName={session.venueName ?? "el hotel"}
      />
    </main>
  );
}

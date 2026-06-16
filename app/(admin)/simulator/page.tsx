import { redirect } from "next/navigation";
import { NfcSimulator } from "@/components/admin/NfcSimulator";
import { getSession } from "@/lib/auth/session";
import {
  fetchActiveRoomTags,
  fetchActiveStaffNfcTags,
} from "@/lib/admin/nfc-simulator";
import { resolveVenueIdBySlug } from "@/lib/analytics/metrics";

export default async function SimulatorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const venueId =
    session.venueId ?? (await resolveVenueIdBySlug("hotel-caribe"));

  if (!venueId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">Simulador NFC</h1>
        <p className="mt-4 text-tagme-slate">
          No se encontró el venue piloto. Ejecuta <code className="rounded bg-tagme-cream px-1.5 py-0.5 text-sm">npm run seed</code>.
        </p>
      </main>
    );
  }

  const [staffTags, roomTags] = await Promise.all([
    fetchActiveStaffNfcTags(venueId),
    fetchActiveRoomTags(venueId),
  ]);

  return (
    <main className="px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Admin · Demo
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-tagme-ink">
          Simulador NFC
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-tagme-slate">
          Simula tarjetas staff y tags de habitación para abrir las rutas reales de captura en una demo.
        </p>
      </header>

      <NfcSimulator
        venueName={session.venueName ?? "Hotel Caribe"}
        staffTags={staffTags}
        roomTags={roomTags}
      />
    </main>
  );
}
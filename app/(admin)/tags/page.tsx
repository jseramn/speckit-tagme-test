import { redirect } from "next/navigation";
import { TagsManager } from "@/components/admin/TagsManager";
import { getVenueAdminContext } from "@/lib/admin/venue-config";
import { getSession } from "@/lib/auth/session";
import { resolveVenueIdBySlug } from "@/lib/analytics/metrics";

export default async function TagsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const venueId =
    session.venueId ??
    (await resolveVenueIdBySlug("hotel-caribe"));

  if (!venueId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">Tags NFC</h1>
        <p className="mt-4 text-tagme-slate">
          No se encontró venue. Ejecute{" "}
          <code className="rounded bg-tagme-cream px-1.5 py-0.5 text-sm">
            npm run seed
          </code>
          .
        </p>
      </main>
    );
  }

  const context = await getVenueAdminContext(venueId);

  if (!context) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">Tags NFC</h1>
        <p className="mt-4 text-tagme-slate">
          Configuración de experiencia no encontrada para este venue.
        </p>
      </main>
    );
  }

  return (
    <main className="px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Admin · M6
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Tags NFC
        </h1>
        <p className="mt-2 text-sm text-tagme-slate">
          {context.venueName} — crear, editar y activar/desactivar puntos físicos.
        </p>
        <div className="mt-4 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-sm text-tagme-slate">
          <p className="font-medium text-tagme-ink">Ayuda huésped sin NFC (US-5)</p>
          <p className="mt-1 leading-relaxed">
            Si un huésped no puede usar NFC, use <strong>Copiar URL</strong> en la
            tabla y ábrala en el navegador del huésped. La visita se registra como{" "}
            <span className="font-mono">staff_assisted</span> para métricas.
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-tagme-gold/20 bg-tagme-gold/5 px-4 py-3 text-sm text-tagme-slate">
          <p className="font-medium text-tagme-ink">Tags de habitación (M4)</p>
          <p className="mt-1 leading-relaxed">
            Para zonas <span className="font-mono">room</span>, indique el{" "}
            <strong>número de habitación</strong> al crear o editar el tag. El
            huésped verá un banner contextual y destinos de servicio a la
            habitación — sin integración PMS. Ejemplo piloto:{" "}
            <span className="font-mono">/t/caribe-room-412</span> → habitación 412.
          </p>
        </div>
      </header>

      <TagsManager
        venueId={context.venueId}
        experienceConfigId={context.experienceConfigId}
        canCreate={session.role === "admin"}
      />
    </main>
  );
}
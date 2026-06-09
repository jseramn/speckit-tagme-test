import { redirect } from "next/navigation";
import {
  ContentManager,
  type ContentTagOption,
} from "@/components/admin/ContentManager";
import {
  DestinationEditor,
  type ExperienceConfigState,
} from "@/components/admin/DestinationEditor";
import { getVenueAdminContext } from "@/lib/admin/venue-config";
import { getSession } from "@/lib/auth/session";
import { resolveVenueIdBySlug } from "@/lib/analytics/metrics";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { Destination, TagZone } from "@/types";

function mapDestinations(raw: unknown): Destination[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const d = item as Record<string, unknown>;
    return {
      id: String(d.id ?? ""),
      type: d.type as Destination["type"],
      label: String(d.label ?? ""),
      url: String(d.url ?? ""),
      icon: String(d.icon ?? "link"),
      isPrimary: Boolean(d.isPrimary ?? d.is_primary ?? false),
    };
  });
}

export default async function ContentPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const venueId =
    session.venueId ??
    (await resolveVenueIdBySlug("hotel-caribe"));

  if (!venueId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">Contenido</h1>
        <p className="mt-4 text-tagme-slate">Venue no encontrado.</p>
      </main>
    );
  }

  const context = await getVenueAdminContext(venueId);
  if (!context) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">Contenido</h1>
        <p className="mt-4 text-tagme-slate">Configuración no encontrada.</p>
      </main>
    );
  }

  const insforge = createInsforgeServerClient();

  const [{ data: configRow, error: configError }, { data: tagRows }] =
    await Promise.all([
      insforge.database
        .from("experience_configs")
        .select("id, title, welcome_message, avex_enabled, destinations")
        .eq("id", context.experienceConfigId)
        .maybeSingle(),
      insforge.database
        .from("nfc_tags")
        .select("id, slug, label, zone, room_number, experience_config_id")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("slug"),
    ]);

  if (configError || !configRow) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">Contenido</h1>
        <p className="mt-4 text-tagme-slate">No se pudo cargar la configuración.</p>
      </main>
    );
  }

  const initialConfig: ExperienceConfigState = {
    id: configRow.id as string,
    title: configRow.title as string,
    welcomeMessage: (configRow.welcome_message as string | null) ?? null,
    avexEnabled: Boolean(configRow.avex_enabled),
    destinations: mapDestinations(configRow.destinations),
  };

  const tags: ContentTagOption[] = (tagRows ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    label: row.label as string,
    zone: row.zone as TagZone,
    roomNumber: (row.room_number as string | null) ?? null,
    experienceConfigId: row.experience_config_id as string,
  }));

  const readOnly = session.role === "ops";

  return (
    <main className="px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Admin · M4
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Contenido del hub
        </h1>
        <p className="mt-2 text-sm text-tagme-slate">
          {context.venueName} — destinos y mensajes por tag o zona. Los cambios se
          reflejan en el hub en ≤5 min.
        </p>
      </header>

      {tags.length > 0 ? (
        <ContentManager
          tags={tags}
          initialConfig={initialConfig}
          readOnly={readOnly}
        />
      ) : (
        <DestinationEditor config={initialConfig} readOnly={readOnly} />
      )}
    </main>
  );
}
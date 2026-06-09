import { createInsforgeServerClient } from "@/lib/insforge-server";
import { resolveRoomContext } from "@/lib/tags/room-context";
import type { TagZone, VenueContact } from "@/types";
import type { AvexTagContext } from "@/lib/avex/types";

interface RawDestination {
  id: string;
  type: string;
  url: string;
}

interface TagAvexRow {
  id: string;
  slug: string;
  label: string;
  zone: TagZone;
  room_number: string | null;
  venues: {
    id: string;
    slug: string;
    name: string;
    contact_info: VenueContact & Record<string, unknown>;
  } | {
    id: string;
    slug: string;
    name: string;
    contact_info: VenueContact & Record<string, unknown>;
  }[] | null;
  experience_configs: {
    avex_enabled: boolean;
    destinations: RawDestination[];
  } | {
    avex_enabled: boolean;
    destinations: RawDestination[];
  }[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapContact(info: VenueContact & Record<string, unknown>): VenueContact {
  return {
    phone: typeof info.phone === "string" ? info.phone : undefined,
    whatsapp: typeof info.whatsapp === "string" ? info.whatsapp : undefined,
    reception_hours:
      typeof info.reception_hours === "string"
        ? info.reception_hours
        : undefined,
  };
}

function findReservationUrl(destinations: RawDestination[]): string | null {
  const reservation = destinations.find(
    (d) => d.type === "reservation_link" && typeof d.url === "string",
  );
  return reservation?.url ?? null;
}

export interface AvexTagResolution {
  tag: AvexTagContext;
  venue: { id: string; name: string; slug: string };
  contact: VenueContact;
  roomContext: ReturnType<typeof resolveRoomContext>;
  avexEnabled: boolean;
  reservationUrl: string | null;
}

export async function resolveAvexTag(
  tagSlug: string,
): Promise<AvexTagResolution | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("nfc_tags")
    .select(
      `
      id,
      slug,
      label,
      zone,
      room_number,
      venues (
        id,
        slug,
        name,
        contact_info
      ),
      experience_configs (
        avex_enabled,
        destinations
      )
    `,
    )
    .eq("slug", tagSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as TagAvexRow;
  const venue = firstRelation(row.venues);
  const experience = firstRelation(row.experience_configs);

  if (!venue || !experience) return null;

  const tagSummary = {
    id: row.id,
    slug: row.slug,
    label: row.label,
    zone: row.zone,
    roomNumber: row.room_number,
  };

  const destinations = Array.isArray(experience.destinations)
    ? experience.destinations
    : [];

  return {
    tag: { ...tagSummary, venueId: venue.id },
    venue: { id: venue.id, name: venue.name, slug: venue.slug },
    contact: mapContact(venue.contact_info),
    roomContext: resolveRoomContext(tagSummary),
    avexEnabled: experience.avex_enabled,
    reservationUrl: findReservationUrl(destinations),
  };
}
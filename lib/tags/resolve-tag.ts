import { createInsforgeServerClient } from "@/lib/insforge-server";
import { resolveRoomContext } from "@/lib/tags/room-context";
import type {
  Destination,
  DestinationType,
  GuestHubPayload,
  TagZone,
  VenueContact,
} from "@/types";

interface RawDestination {
  id: string;
  type: DestinationType;
  label: string;
  url: string;
  icon: string;
  is_primary?: boolean;
  isPrimary?: boolean;
}

interface VenueRow {
  id: string;
  slug: string;
  name: string;
  contact_info: VenueContact & Record<string, unknown>;
}

interface ExperienceRow {
  title: string;
  welcome_message: string | null;
  destinations: RawDestination[];
  avex_enabled: boolean;
}

interface TagRow {
  id: string;
  slug: string;
  label: string;
  zone: TagZone;
  room_number: string | null;
  venues: VenueRow | VenueRow[] | null;
  experience_configs: ExperienceRow | ExperienceRow[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapDestination(raw: RawDestination): Destination {
  return {
    id: raw.id,
    type: raw.type,
    label: raw.label,
    url: raw.url,
    icon: raw.icon,
    isPrimary: raw.isPrimary ?? raw.is_primary ?? false,
  };
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

/**
 * Resolves an NFC tag slug to a GuestHubPayload (venue + tag + experience).
 * Returns null when the tag is missing or inactive.
 */
export async function resolveTag(
  tagSlug: string,
): Promise<GuestHubPayload | null> {
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
        title,
        welcome_message,
        destinations,
        avex_enabled
      )
    `,
    )
    .eq("slug", tagSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as TagRow;
  const venue = firstRelation(row.venues);
  const experience = firstRelation(row.experience_configs);

  if (!venue || !experience) {
    return null;
  }

  const rawDestinations = Array.isArray(experience.destinations)
    ? experience.destinations
    : [];

  const tag = {
    id: row.id,
    slug: row.slug,
    label: row.label,
    zone: row.zone,
    roomNumber: row.room_number,
  };

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
    },
    tag,
    experience: {
      title: experience.title,
      welcomeMessage: experience.welcome_message,
      destinations: rawDestinations.map(mapDestination),
      avexEnabled: experience.avex_enabled,
    },
    contact: mapContact(venue.contact_info),
    roomContext: resolveRoomContext(tag),
  };
}
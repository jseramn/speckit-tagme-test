/**
 * Shared types — aligned to specs/001-tagme-platform/contracts/guest-experience.md
 */

export type DestinationType =
  | "menu"
  | "external"
  | "reservation_link"
  | "info"
  | "social";

export type TagZone = "lobby" | "room" | "restaurant" | "bar" | "other";

export type TouchChannel = "nfc" | "url_direct" | "staff_assisted";

export interface Destination {
  id: string;
  type: DestinationType;
  label: string;
  url: string;
  icon: string;
  isPrimary?: boolean;
}

export interface VenueSummary {
  id: string;
  name: string;
  slug: string;
}

export interface TagSummary {
  id: string;
  slug: string;
  label: string;
  zone: TagZone;
  roomNumber: string | null;
}

export interface ExperienceSummary {
  title: string;
  welcomeMessage: string | null;
  destinations: Destination[];
  avexEnabled: boolean;
}

export interface VenueContact {
  phone?: string;
  whatsapp?: string;
  reception_hours?: string;
}

/** Room context for hub + AVEX — M4 / contracts/avex-chat.md */
export interface RoomContextPayload {
  isRoom: boolean;
  zone: TagZone;
  roomNumber: string | null;
  displayLabel: string;
  welcomeHeadline: string | null;
}

/** Payload for guest hub — contracts/guest-experience.md */
export interface GuestHubPayload {
  venue: VenueSummary;
  tag: TagSummary;
  experience: ExperienceSummary;
  contact: VenueContact;
  roomContext: RoomContextPayload;
}

/** Touch event record shape — contracts/analytics-events.md */
export interface TouchEventRecord {
  id: string;
  tagId: string;
  venueId: string;
  channel: TouchChannel;
  deviceType: "iphone" | "android" | "other";
  countryCode: string | null;
  clientFingerprint: string | null;
  deduplicated: boolean;
  createdAt: string;
}
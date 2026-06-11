import {
  parseCountryCode,
  parseDeviceType,
} from "@/lib/analytics/track";
import { buildRoomContextSnapshot } from "@/lib/capture/build-room-context-snapshot";
import { resolveTag } from "@/lib/tags/resolve-tag";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { GuestHubPayload } from "@/types";

export interface ResolveRoomCaptureInput {
  tagSlug: string;
  clientFingerprint?: string | null;
  userAgent?: string | null;
  countryCode?: string | null;
}

export interface RoomCapturePayload {
  mode: "room_nfc";
  tag: GuestHubPayload["tag"];
  venue: GuestHubPayload["venue"];
  roomContext: GuestHubPayload["roomContext"];
  contextSnapshot: ReturnType<typeof buildRoomContextSnapshot>;
}

async function recordRoomCaptureOpen(input: {
  tagId: string;
  venueId: string;
  zone: string;
  roomNumber: string | null;
  clientFingerprint: string | null;
  userAgent?: string | null;
  countryCode?: string | null;
}): Promise<void> {
  const insforge = createInsforgeServerClient();

  await insforge.database.from("touch_events").insert([
    {
      tag_id: input.tagId,
      venue_id: input.venueId,
      channel: "nfc",
      event_type: "room_capture_open",
      device_type: parseDeviceType(input.userAgent),
      country_code: parseCountryCode(input.countryCode),
      client_fingerprint: input.clientFingerprint,
      deduplicated: false,
      metadata: {
        nfc_tag_id: input.tagId,
        zone: input.zone,
        room_number: input.roomNumber,
      },
    },
  ]);
}

/**
 * Resolves an active nfc_tag for room/zone capture and records room_capture_open.
 * Returns null when the tag is missing or inactive.
 */
export async function resolveRoomCapture(
  input: ResolveRoomCaptureInput,
): Promise<RoomCapturePayload | null> {
  const payload = await resolveTag(input.tagSlug);
  if (!payload) {
    return null;
  }

  const contextSnapshot = buildRoomContextSnapshot(payload.tag);
  const fingerprint = input.clientFingerprint?.trim() || null;

  await recordRoomCaptureOpen({
    tagId: payload.tag.id,
    venueId: payload.venue.id,
    zone: payload.tag.zone,
    roomNumber: contextSnapshot.room_number,
    clientFingerprint: fingerprint,
    userAgent: input.userAgent,
    countryCode: input.countryCode,
  });

  return {
    mode: "room_nfc",
    tag: payload.tag,
    venue: payload.venue,
    roomContext: payload.roomContext,
    contextSnapshot,
  };
}
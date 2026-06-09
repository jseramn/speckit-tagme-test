import { subSeconds } from "date-fns";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type {
  DestinationVisitRequest,
  DestinationVisitResponse,
  TouchEventResponse,
} from "@/lib/validators/events";
import type { TouchChannel } from "@/types";

const DEDUP_WINDOW_SECONDS = 60;

export type DeviceType = "iphone" | "android" | "other";

export interface RecordTouchInput {
  tagSlug: string;
  channel: TouchChannel;
  clientFingerprint?: string;
  userAgent?: string | null;
  countryCode?: string | null;
}

/** Parse device type from User-Agent header. */
export function parseDeviceType(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return "other";

  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "iphone";
  }
  if (ua.includes("android")) {
    return "android";
  }
  return "other";
}

/** Normalize country code from Vercel geo header or similar. */
export function parseCountryCode(
  headerValue: string | null | undefined,
): string | null {
  if (!headerValue) return null;
  const code = headerValue.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

interface TagLookup {
  id: string;
  venue_id: string;
}

async function lookupTag(tagSlug: string): Promise<TagLookup | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("nfc_tags")
    .select("id, venue_id")
    .eq("slug", tagSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as TagLookup;
}

async function findRecentTouch(
  tagId: string,
  fingerprint: string,
): Promise<string | null> {
  const insforge = createInsforgeServerClient();
  const cutoff = subSeconds(new Date(), DEDUP_WINDOW_SECONDS).toISOString();

  const { data, error } = await insforge.database
    .from("touch_events")
    .select("id")
    .eq("tag_id", tagId)
    .eq("client_fingerprint", fingerprint)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}

/**
 * Records a touch event with 60s deduplication per tag + fingerprint.
 * Returns existing event id when deduplicated within the window.
 */
export async function recordTouchEvent(
  input: RecordTouchInput,
): Promise<TouchEventResponse | { error: string; code: string }> {
  const tag = await lookupTag(input.tagSlug);
  if (!tag) {
    return { error: "tagSlug no válido", code: "INVALID_TAG" };
  }

  const deviceType = parseDeviceType(input.userAgent);
  const countryCode = parseCountryCode(input.countryCode);
  const fingerprint = input.clientFingerprint?.trim() || null;

  if (fingerprint) {
    const existingId = await findRecentTouch(tag.id, fingerprint);
    if (existingId) {
      return { touchEventId: existingId, deduplicated: true };
    }
  }

  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("touch_events")
    .insert([
      {
        tag_id: tag.id,
        venue_id: tag.venue_id,
        channel: input.channel,
        device_type: deviceType,
        country_code: countryCode,
        client_fingerprint: fingerprint,
        deduplicated: false,
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error?.message ?? "Error al registrar toque",
      code: "INSERT_FAILED",
    };
  }

  return { touchEventId: data.id as string, deduplicated: false };
}

const DESTINATION_DEDUP_SECONDS = 10;

async function findRecentDestinationVisit(
  touchEventId: string,
  destinationType: string,
  destinationUrl: string | null,
): Promise<string | null> {
  const insforge = createInsforgeServerClient();
  const cutoff = subSeconds(new Date(), DESTINATION_DEDUP_SECONDS).toISOString();

  let query = insforge.database
    .from("destination_visits")
    .select("id")
    .eq("touch_event_id", touchEventId)
    .eq("destination_type", destinationType)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if (destinationUrl) {
    query = query.eq("destination_url", destinationUrl);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

async function touchEventExists(touchEventId: string): Promise<boolean> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("touch_events")
    .select("id")
    .eq("id", touchEventId)
    .maybeSingle();

  return !error && !!data;
}

/**
 * Records a destination visit linked to a touch event.
 * Deduplicates rapid repeat clicks (same touch + type + url within 10s).
 */
export async function recordDestinationVisit(
  input: DestinationVisitRequest,
): Promise<DestinationVisitResponse | { error: string; code: string }> {
  const exists = await touchEventExists(input.touchEventId);
  if (!exists) {
    return { error: "touchEventId no válido", code: "INVALID_TOUCH" };
  }

  const destinationUrl = input.destinationUrl ?? null;

  const existingId = await findRecentDestinationVisit(
    input.touchEventId,
    input.destinationType,
    destinationUrl,
  );
  if (existingId) {
    return { destinationVisitId: existingId };
  }

  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("destination_visits")
    .insert([
      {
        touch_event_id: input.touchEventId,
        destination_type: input.destinationType,
        destination_url: destinationUrl,
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error?.message ?? "Error al registrar visita",
      code: "INSERT_FAILED",
    };
  }

  return { destinationVisitId: data.id as string };
}
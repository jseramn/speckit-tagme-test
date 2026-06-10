import { randomUUID } from "node:crypto";
import { addMinutes, subSeconds } from "date-fns";
import {
  parseCountryCode,
  parseDeviceType,
} from "@/lib/analytics/track";
import { buildContextSnapshot, staffContextFromSnapshot } from "@/lib/staff/build-context-snapshot";
import { resolveActiveShift } from "@/lib/staff/resolve-shift";
import { resolveStaffTag } from "@/lib/staff/resolve-staff-tag";
import { getVenueStaffSettings } from "@/lib/staff/venue-settings";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { ContextSnapshot } from "@/types/staff";

export interface OpenCaptureSessionInput {
  staffTagSlug: string;
  clientFingerprint?: string;
  userAgent?: string | null;
  countryCode?: string | null;
}

export interface OpenCaptureSessionResult {
  sessionToken: string;
  expiresAt: string;
  captureUrl: string;
  staff: {
    displayName: string;
    departmentName: string;
    jobRoleTitle: string;
  };
  deduplicated: boolean;
}

interface ExistingSessionRow {
  id: string;
  session_token: string;
  expires_at: string;
  context_snapshot: ContextSnapshot;
}

async function findDeduplicatedSession(
  staffNfcTagId: string,
  fingerprint: string,
  dedupSeconds: number,
): Promise<ExistingSessionRow | null> {
  const insforge = createInsforgeServerClient();
  const cutoff = subSeconds(new Date(), dedupSeconds).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await insforge.database
    .from("staff_capture_sessions")
    .select("id, session_token, expires_at, context_snapshot")
    .eq("staff_nfc_tag_id", staffNfcTagId)
    .eq("client_fingerprint", fingerprint)
    .eq("status", "active")
    .gte("created_at", cutoff)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ExistingSessionRow;
}

async function findVenueProxyTagId(venueId: string): Promise<string | null> {
  const insforge = createInsforgeServerClient();

  const { data } = await insforge.database
    .from("nfc_tags")
    .select("id")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data?.id as string) ?? null;
}

async function recordStaffCaptureOpen(input: {
  venueId: string;
  staffNfcTagId: string;
  sessionId: string;
  clientFingerprint: string | null;
  userAgent?: string | null;
  countryCode?: string | null;
}): Promise<void> {
  const proxyTagId = await findVenueProxyTagId(input.venueId);
  if (!proxyTagId) {
    return;
  }

  const insforge = createInsforgeServerClient();

  await insforge.database.from("touch_events").insert([
    {
      tag_id: proxyTagId,
      venue_id: input.venueId,
      channel: "nfc",
      event_type: "staff_capture_open",
      device_type: parseDeviceType(input.userAgent),
      country_code: parseCountryCode(input.countryCode),
      client_fingerprint: input.clientFingerprint,
      deduplicated: false,
      metadata: {
        staff_nfc_tag_id: input.staffNfcTagId,
        staff_capture_session_id: input.sessionId,
      },
    },
  ]);
}

/**
 * Opens a staff capture session with TTL, dedup, and touch_event analytics.
 * Returns null when the staff tag is invalid or revoked.
 */
export async function openCaptureSession(
  input: OpenCaptureSessionInput,
): Promise<OpenCaptureSessionResult | null> {
  const tag = await resolveStaffTag(input.staffTagSlug);
  if (!tag) {
    return null;
  }

  const settings = await getVenueStaffSettings(tag.venueId);
  const fingerprint = input.clientFingerprint?.trim() || null;

  if (fingerprint && settings.sessionDedupSeconds > 0) {
    const existing = await findDeduplicatedSession(
      tag.tagId,
      fingerprint,
      settings.sessionDedupSeconds,
    );

    if (existing) {
      const snapshot = existing.context_snapshot as ContextSnapshot;
      return {
        sessionToken: existing.session_token,
        expiresAt: existing.expires_at,
        captureUrl: `/capture/${existing.session_token}`,
        staff: staffContextFromSnapshot(snapshot),
        deduplicated: true,
      };
    }
  }

  const shift = await resolveActiveShift(tag.staffMemberId);
  const contextSnapshot = buildContextSnapshot(tag, shift);
  const sessionToken = randomUUID();
  const expiresAt = addMinutes(
    new Date(),
    settings.sessionTtlMinutes,
  ).toISOString();

  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("staff_capture_sessions")
    .insert([
      {
        session_token: sessionToken,
        staff_member_id: tag.staffMemberId,
        staff_nfc_tag_id: tag.tagId,
        venue_id: tag.venueId,
        status: "active",
        expires_at: expiresAt,
        context_snapshot: contextSnapshot,
        client_fingerprint: fingerprint,
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ?? "Error al crear sesión de captura",
    );
  }

  await recordStaffCaptureOpen({
    venueId: tag.venueId,
    staffNfcTagId: tag.tagId,
    sessionId: data.id as string,
    clientFingerprint: fingerprint,
    userAgent: input.userAgent,
    countryCode: input.countryCode,
  });

  return {
    sessionToken,
    expiresAt,
    captureUrl: `/capture/${sessionToken}`,
    staff: staffContextFromSnapshot(contextSnapshot),
    deduplicated: false,
  };
}
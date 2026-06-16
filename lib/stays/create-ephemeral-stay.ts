import { addHours } from "date-fns";
import { getVenueStaffSettings } from "@/lib/staff/venue-settings";
import { generateStayToken } from "@/lib/stays/generate-stay-token";
import { resolveStayByToken } from "@/lib/stays/resolve-stay-by-token";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { GuestStay } from "@/types/staff";

export interface EphemeralStayResult {
  stay: GuestStay;
  created: boolean;
}

/**
 * Creates a new ephemeral guest stay with TTL from venue_staff_settings.
 */
export async function createEphemeralStay(
  venueId: string,
): Promise<GuestStay> {
  const settings = await getVenueStaffSettings(venueId);
  const stayToken = generateStayToken();
  const expiresAt = addHours(
    new Date(),
    settings.ephemeralStayTtlHours,
  ).toISOString();

  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .insert([
      {
        venue_id: venueId,
        stay_token: stayToken,
        stay_type: "ephemeral",
        status: "active",
        expires_at: expiresAt,
      },
    ])
    .select(
      "id, venue_id, stay_token, stay_type, status, consolidated_into, started_at, expires_at, closed_at, created_by",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Error al crear estadía efímera");
  }

  return data as GuestStay;
}

/**
 * Reuses an active stay from cookie when valid; otherwise creates ephemeral.
 */
export async function resolveOrCreateEphemeralStay(
  venueId: string,
  existingStayToken: string | null,
): Promise<EphemeralStayResult> {
  if (existingStayToken) {
    const existing = await resolveStayByToken(existingStayToken);
    if (existing && existing.venue_id === venueId) {
      return { stay: existing, created: false };
    }
  }

  const stay = await createEphemeralStay(venueId);
  return { stay, created: true };
}
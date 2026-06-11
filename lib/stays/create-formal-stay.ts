import { addDays } from "date-fns";
import { getVenueStaffSettings } from "@/lib/staff/venue-settings";
import { generateStayToken } from "@/lib/stays/generate-stay-token";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { GuestStay } from "@/types/staff";

export interface CreateFormalStayInput {
  venueId: string;
  createdByProfileId: string | null;
  ttlDays?: number;
}

/**
 * Creates a formal guest stay at reception check-in.
 * TTL defaults to venue_staff_settings.default_stay_ttl_days.
 */
export async function createFormalStay(
  input: CreateFormalStayInput,
): Promise<GuestStay> {
  const settings = await getVenueStaffSettings(input.venueId);
  const ttlDays = input.ttlDays ?? settings.defaultStayTtlDays;
  const stayToken = generateStayToken();
  const expiresAt = addDays(new Date(), ttlDays).toISOString();

  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .insert([
      {
        venue_id: input.venueId,
        stay_token: stayToken,
        stay_type: "formal",
        status: "active",
        expires_at: expiresAt,
        created_by: input.createdByProfileId,
      },
    ])
    .select(
      "id, venue_id, stay_token, stay_type, status, consolidated_into, started_at, expires_at, closed_at, created_by",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Error al crear estadía formal");
  }

  return data as GuestStay;
}
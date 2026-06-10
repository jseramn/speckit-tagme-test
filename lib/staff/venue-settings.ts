import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface VenueStaffSettings {
  sessionTtlMinutes: number;
  sessionDedupSeconds: number;
  ephemeralStayTtlHours: number;
  defaultStayTtlDays: number;
}

const DEFAULTS: VenueStaffSettings = {
  sessionTtlMinutes: 5,
  sessionDedupSeconds: 45,
  ephemeralStayTtlHours: 48,
  defaultStayTtlDays: 7,
};

/** Loads venue staff settings with safe defaults when row is missing. */
export async function getVenueStaffSettings(
  venueId: string,
): Promise<VenueStaffSettings> {
  const insforge = createInsforgeServerClient();

  const { data } = await insforge.database
    .from("venue_staff_settings")
    .select(
      "session_ttl_minutes, session_dedup_seconds, ephemeral_stay_ttl_hours, default_stay_ttl_days",
    )
    .eq("venue_id", venueId)
    .maybeSingle();

  if (!data) {
    return DEFAULTS;
  }

  return {
    sessionTtlMinutes:
      (data.session_ttl_minutes as number) ?? DEFAULTS.sessionTtlMinutes,
    sessionDedupSeconds:
      (data.session_dedup_seconds as number) ?? DEFAULTS.sessionDedupSeconds,
    ephemeralStayTtlHours:
      (data.ephemeral_stay_ttl_hours as number) ??
      DEFAULTS.ephemeralStayTtlHours,
    defaultStayTtlDays:
      (data.default_stay_ttl_days as number) ?? DEFAULTS.defaultStayTtlDays,
  };
}
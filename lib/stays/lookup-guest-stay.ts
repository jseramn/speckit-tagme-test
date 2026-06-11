import { StayError } from "@/lib/stays/errors";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { GuestStayStatus, GuestStayType } from "@/types/staff";

export interface StayRecordCounts {
  feedbacks: number;
  incidents: number;
}

export interface LookupGuestStayResult {
  stayId: string;
  stayType: GuestStayType;
  status: GuestStayStatus;
  startedAt: string;
  expiresAt: string;
  recordCounts: StayRecordCounts;
}

async function countRecords(
  table: "feedback_entries" | "incident_reports",
  stayId: string,
): Promise<number> {
  const insforge = createInsforgeServerClient();
  const { count, error } = await insforge.database
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("guest_stay_id", stayId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/**
 * Looks up a guest stay by opaque token for reception preview/consolidation.
 */
export async function lookupGuestStayByToken(
  stayToken: string,
  venueId: string,
): Promise<LookupGuestStayResult> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .select(
      "id, venue_id, stay_type, status, started_at, expires_at",
    )
    .eq("stay_token", stayToken)
    .maybeSingle();

  if (error || !data) {
    throw new StayError("STAY_NOT_FOUND", "Estadía no encontrada", 404);
  }

  if (data.venue_id !== venueId) {
    throw new StayError("STAY_NOT_FOUND", "Estadía no encontrada", 404);
  }

  const [feedbacks, incidents] = await Promise.all([
    countRecords("feedback_entries", data.id as string),
    countRecords("incident_reports", data.id as string),
  ]);

  return {
    stayId: data.id as string,
    stayType: data.stay_type as GuestStayType,
    status: data.status as GuestStayStatus,
    startedAt: data.started_at as string,
    expiresAt: data.expires_at as string,
    recordCounts: { feedbacks, incidents },
  };
}
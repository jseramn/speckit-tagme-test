import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { GuestStay } from "@/types/staff";

interface StayRow {
  id: string;
  venue_id: string;
  stay_token: string;
  stay_type: GuestStay["stay_type"];
  status: GuestStay["status"];
  consolidated_into: string | null;
  started_at: string;
  expires_at: string;
  closed_at: string | null;
  created_by: string | null;
}

function mapStayRow(row: StayRow): GuestStay {
  return {
    id: row.id,
    venue_id: row.venue_id,
    stay_token: row.stay_token,
    stay_type: row.stay_type,
    status: row.status,
    consolidated_into: row.consolidated_into,
    started_at: row.started_at,
    expires_at: row.expires_at,
    closed_at: row.closed_at,
    created_by: row.created_by,
  };
}

async function lazyExpireStay(stayId: string): Promise<void> {
  const insforge = createInsforgeServerClient();
  await insforge.database
    .from("guest_stays")
    .update({ status: "expired" })
    .eq("id", stayId)
    .eq("status", "active");
}

/**
 * Resolves an active guest stay by token. Lazy-expires when past expires_at.
 */
export async function resolveStayByToken(
  stayToken: string,
): Promise<GuestStay | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("guest_stays")
    .select(
      "id, venue_id, stay_token, stay_type, status, consolidated_into, started_at, expires_at, closed_at, created_by",
    )
    .eq("stay_token", stayToken)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as StayRow;
  const now = new Date();
  const expiresAt = new Date(row.expires_at);

  if (row.status !== "active") {
    return null;
  }

  if (expiresAt <= now) {
    await lazyExpireStay(row.id);
    return null;
  }

  return mapStayRow(row);
}
import { differenceInSeconds } from "date-fns";
import { staffContextFromSnapshot } from "@/lib/staff/build-context-snapshot";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { ContextSnapshot } from "@/types/staff";

const EXPIRED_MESSAGE =
  "La sesión expiró. Pide al personal que acerque su tarjeta nuevamente.";

export interface ActiveSessionResult {
  status: "active";
  sessionId: string;
  sessionToken: string;
  venueId: string;
  staffMemberId: string;
  staffNfcTagId: string;
  guestStayId: string | null;
  expiresAt: string;
  secondsRemaining: number;
  staff: {
    displayName: string;
    departmentName: string;
    jobRoleTitle: string;
  };
  contextSnapshot: ContextSnapshot;
}

export interface ExpiredSessionResult {
  status: "expired";
  code: "SESSION_EXPIRED";
  message: string;
}

export type ValidateSessionResult =
  | ActiveSessionResult
  | ExpiredSessionResult;

interface SessionRow {
  id: string;
  session_token: string;
  staff_member_id: string;
  staff_nfc_tag_id: string;
  guest_stay_id: string | null;
  venue_id: string;
  status: string;
  expires_at: string;
  context_snapshot: ContextSnapshot;
}

function expiredResult(): ExpiredSessionResult {
  return {
    status: "expired",
    code: "SESSION_EXPIRED",
    message: EXPIRED_MESSAGE,
  };
}

async function lazyExpireSession(sessionId: string): Promise<void> {
  const insforge = createInsforgeServerClient();
  await insforge.database
    .from("staff_capture_sessions")
    .update({ status: "expired" })
    .eq("id", sessionId)
    .eq("status", "active");
}

/**
 * Validates a capture session by token. Lazy-expires active sessions past TTL.
 */
export async function validateSession(
  sessionToken: string,
): Promise<ValidateSessionResult> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("staff_capture_sessions")
    .select(
      "id, session_token, staff_member_id, staff_nfc_tag_id, guest_stay_id, venue_id, status, expires_at, context_snapshot",
    )
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error || !data) {
    return expiredResult();
  }

  const session = data as SessionRow;
  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  if (session.status === "completed" || session.status === "expired") {
    return expiredResult();
  }

  if (session.status === "active" && expiresAt <= now) {
    await lazyExpireSession(session.id);
    return expiredResult();
  }

  const snapshot = session.context_snapshot as ContextSnapshot;

  return {
    status: "active",
    sessionId: session.id,
    sessionToken: session.session_token,
    venueId: session.venue_id,
    staffMemberId: session.staff_member_id,
    staffNfcTagId: session.staff_nfc_tag_id,
    guestStayId: session.guest_stay_id,
    expiresAt: session.expires_at,
    secondsRemaining: Math.max(0, differenceInSeconds(expiresAt, now)),
    staff: staffContextFromSnapshot(snapshot),
    contextSnapshot: snapshot,
  };
}
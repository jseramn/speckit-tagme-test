import { validateSession } from "@/lib/staff/validate-session";
import { resolveOrCreateEphemeralStay } from "@/lib/stays/create-ephemeral-stay";
import { CaptureError } from "@/lib/capture/errors";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { SubmitFeedbackRequest } from "@/lib/validators/feedback";
import type { GuestStay } from "@/types/staff";

export interface SubmitFeedbackInput extends SubmitFeedbackRequest {
  stayTokenFromCookie: string | null;
}

export interface SubmitFeedbackResult {
  id: string;
  createdAt: string;
  message: string;
  stay: GuestStay;
  stayCreated: boolean;
}

/**
 * Submits staff-session feedback with full traceability (origin_type=staff_nfc).
 */
export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<SubmitFeedbackResult> {
  if (input.roomTagSlug) {
    throw new CaptureError(
      "NOT_IMPLEMENTED",
      "Captura room NFC no disponible en M1",
      501,
    );
  }

  if (!input.sessionToken) {
    throw new CaptureError(
      "INVALID_SESSION",
      "Sesión de captura no válida",
      400,
    );
  }

  const session = await validateSession(input.sessionToken);

  if (session.status !== "active") {
    throw new CaptureError(
      "SESSION_EXPIRED",
      session.message,
      410,
    );
  }

  const { stay, created } = await resolveOrCreateEphemeralStay(
    session.venueId,
    input.stayTokenFromCookie,
  );

  const insforge = createInsforgeServerClient();

  const { data: feedback, error: feedbackError } = await insforge.database
    .from("feedback_entries")
    .insert([
      {
        venue_id: session.venueId,
        guest_stay_id: stay.id,
        staff_member_id: session.staffMemberId,
        staff_capture_session_id: session.sessionId,
        origin_type: "staff_nfc",
        origin_id: session.staffNfcTagId,
        rating: input.rating,
        comment: input.comment ?? null,
        context_snapshot: session.contextSnapshot,
      },
    ])
    .select("id, created_at")
    .single();

  if (feedbackError || !feedback) {
    throw new Error(
      feedbackError?.message ?? "Error al guardar feedback",
    );
  }

  const completedAt = new Date().toISOString();

  const { error: sessionError } = await insforge.database
    .from("staff_capture_sessions")
    .update({
      status: "completed",
      completed_at: completedAt,
      guest_stay_id: stay.id,
    })
    .eq("id", session.sessionId)
    .eq("status", "active");

  if (sessionError) {
    throw new Error(
      sessionError.message ?? "Error al completar sesión",
    );
  }

  return {
    id: feedback.id as string,
    createdAt: feedback.created_at as string,
    message: "¡Gracias por tu opinión!",
    stay,
    stayCreated: created,
  };
}
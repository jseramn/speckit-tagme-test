import { CaptureError } from "@/lib/capture/errors";
import { resolveRoomTagForSubmit } from "@/lib/capture/resolve-room-tag-for-submit";
import { routeIncidentByCategory } from "@/lib/supervisor/incident-routing";
import { validateSession } from "@/lib/staff/validate-session";
import { resolveGuestStayForCapture } from "@/lib/stays/resolve-guest-stay-for-capture";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { SubmitIncidentRequest } from "@/lib/validators/incident";
import type { GuestStay } from "@/types/staff";

export interface SubmitIncidentInput extends SubmitIncidentRequest {
  stayTokenFromCookie: string | null;
}

export interface SubmitIncidentResult {
  id: string;
  status: "abierta";
  category: string;
  priority: string;
  createdAt: string;
  stay: GuestStay;
  stayCreated: boolean;
}

async function resolveCaptureHistoryActor(venueId: string): Promise<string> {
  const insforge = createInsforgeServerClient();

  const { data: manager } = await insforge.database
    .from("user_profiles")
    .select("id")
    .eq("venue_id", venueId)
    .eq("role", "manager")
    .limit(1)
    .maybeSingle();

  if (manager?.id) return manager.id as string;

  const { data: admin } = await insforge.database
    .from("user_profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (admin?.id) return admin.id as string;

  throw new Error(
    "No hay perfil de auditoría para historial de incidencias en el venue",
  );
}

/**
 * Submits staff-session incident — pipeline separado de feedback (Principio IV).
 */
export async function submitIncident(
  input: SubmitIncidentInput,
): Promise<SubmitIncidentResult> {
  if (input.roomTagSlug) {
    return submitRoomIncident(input);
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
    throw new CaptureError("SESSION_EXPIRED", session.message, 410);
  }

  const routing = await routeIncidentByCategory(
    session.venueId,
    input.category,
    input.priority,
  );

  if (!routing) {
    throw new CaptureError(
      "INVALID_SESSION",
      "Categoría de incidencia no válida",
      422,
    );
  }

  const { stay, created } = await resolveGuestStayForCapture(
    session.venueId,
    input.stayTokenFromCookie,
  );

  const insforge = createInsforgeServerClient();
  const historyActorId = await resolveCaptureHistoryActor(session.venueId);

  const { data: incident, error: incidentError } = await insforge.database
    .from("incident_reports")
    .insert([
      {
        venue_id: session.venueId,
        guest_stay_id: stay.id,
        staff_member_id: session.staffMemberId,
        staff_capture_session_id: session.sessionId,
        department_id: routing.departmentId,
        origin_type: "staff_nfc",
        origin_id: session.staffNfcTagId,
        category: routing.category.code,
        priority: routing.priority,
        status: "abierta",
        description: input.description,
        context_snapshot: session.contextSnapshot,
      },
    ])
    .select("id, status, category, priority, created_at")
    .single();

  if (incidentError || !incident) {
    throw new Error(
      incidentError?.message ?? "Error al guardar incidencia",
    );
  }

  const { error: historyError } = await insforge.database
    .from("incident_status_history")
    .insert([
      {
        incident_id: incident.id,
        changed_by: historyActorId,
        from_status: null,
        to_status: "abierta",
        note: "Registro inicial por huésped vía captura staff NFC",
      },
    ]);

  if (historyError) {
    throw new Error(
      historyError.message ?? "Error al registrar historial de incidencia",
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
    id: incident.id as string,
    status: "abierta",
    category: incident.category as string,
    priority: incident.priority as string,
    createdAt: incident.created_at as string,
    stay,
    stayCreated: created,
  };
}

async function submitRoomIncident(
  input: SubmitIncidentInput,
): Promise<SubmitIncidentResult> {
  const roomTagSlug = input.roomTagSlug!;
  const room = await resolveRoomTagForSubmit(roomTagSlug);

  const routing = await routeIncidentByCategory(
    room.venueId,
    input.category,
    input.priority,
  );

  if (!routing) {
    throw new CaptureError(
      "INVALID_SESSION",
      "Categoría de incidencia no válida",
      422,
    );
  }

  const { stay, created } = await resolveGuestStayForCapture(
    room.venueId,
    input.stayTokenFromCookie,
  );

  const insforge = createInsforgeServerClient();
  const historyActorId = await resolveCaptureHistoryActor(room.venueId);

  const { data: incident, error: incidentError } = await insforge.database
    .from("incident_reports")
    .insert([
      {
        venue_id: room.venueId,
        guest_stay_id: stay.id,
        staff_member_id: null,
        staff_capture_session_id: null,
        department_id: routing.departmentId,
        origin_type: "room_nfc",
        origin_id: room.tagId,
        category: routing.category.code,
        priority: routing.priority,
        status: "abierta",
        description: input.description,
        context_snapshot: room.contextSnapshot,
      },
    ])
    .select("id, status, category, priority, created_at")
    .single();

  if (incidentError || !incident) {
    throw new Error(
      incidentError?.message ?? "Error al guardar incidencia",
    );
  }

  const { error: historyError } = await insforge.database
    .from("incident_status_history")
    .insert([
      {
        incident_id: incident.id,
        changed_by: historyActorId,
        from_status: null,
        to_status: "abierta",
        note: "Registro inicial por huésped vía captura room NFC",
      },
    ]);

  if (historyError) {
    throw new Error(
      historyError.message ?? "Error al registrar historial de incidencia",
    );
  }

  return {
    id: incident.id as string,
    status: "abierta",
    category: incident.category as string,
    priority: incident.priority as string,
    createdAt: incident.created_at as string,
    stay,
    stayCreated: created,
  };
}
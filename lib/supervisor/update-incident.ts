import type { StaffSession } from "@/lib/auth/session";
import { assertDepartmentAccess } from "@/lib/supervisor/department-scope";
import { SupervisorIncidentError } from "@/lib/supervisor/errors";
import { assertValidTransition } from "@/lib/supervisor/incident-transitions";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { IncidentStatus } from "@/types/staff";
import type { PatchIncidentRequest } from "@/lib/validators/supervisor-incident";

export interface UpdateIncidentResult {
  id: string;
  status: IncidentStatus;
  assignedTo: string | null;
  updatedAt: string;
}

export async function updateIncident(
  session: StaffSession,
  incidentId: string,
  patch: PatchIncidentRequest,
): Promise<UpdateIncidentResult> {
  if (!session.profileId) {
    throw new SupervisorIncidentError(
      "VALIDATION_ERROR",
      "Perfil de usuario requerido para auditar cambios",
      403,
    );
  }

  const insforge = createInsforgeServerClient();

  const { data: incident, error: loadError } = await insforge.database
    .from("incident_reports")
    .select("id, venue_id, department_id, status, assigned_to")
    .eq("id", incidentId)
    .maybeSingle();

  if (loadError || !incident) {
    throw new SupervisorIncidentError(
      "NOT_FOUND",
      "Incidencia no encontrada",
      404,
    );
  }

  if (session.venueId && incident.venue_id !== session.venueId) {
    throw new SupervisorIncidentError(
      "NOT_FOUND",
      "Incidencia no encontrada",
      404,
    );
  }

  await assertDepartmentAccess(
    session,
    incident.department_id as string | null,
  );

  const currentStatus = incident.status as IncidentStatus;

  if (patch.status && patch.status !== currentStatus) {
    assertValidTransition(currentStatus, patch.status);
  }

  const assignedTo =
    patch.assignedToStaffMemberId !== undefined
      ? patch.assignedToStaffMemberId
      : (incident.assigned_to as string | null);

  if (patch.assignedToStaffMemberId) {
    const { data: staffMember } = await insforge.database
      .from("staff_members")
      .select("id, department_id, venue_id")
      .eq("id", patch.assignedToStaffMemberId)
      .eq("is_active", true)
      .maybeSingle();

    if (
      !staffMember ||
      staffMember.venue_id !== incident.venue_id ||
      (incident.department_id &&
        staffMember.department_id !== incident.department_id)
    ) {
      throw new SupervisorIncidentError(
        "VALIDATION_ERROR",
        "Staff asignado inválido para el departamento de la incidencia",
        422,
      );
    }
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    assigned_to: assignedTo,
  };

  if (patch.status) {
    updatePayload.status = patch.status;
    if (patch.status === "resuelta" || patch.status === "cerrada") {
      updatePayload.resolved_at = now;
    }
  }

  const { data: updated, error: updateError } = await insforge.database
    .from("incident_reports")
    .update(updatePayload)
    .eq("id", incidentId)
    .select("id, status, assigned_to")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Error al actualizar incidencia");
  }

  if (patch.status && patch.status !== currentStatus) {
    const { error: historyError } = await insforge.database
      .from("incident_status_history")
      .insert([
        {
          incident_id: incidentId,
          changed_by: session.profileId,
          from_status: currentStatus,
          to_status: patch.status,
          note: patch.note ?? null,
        },
      ]);

    if (historyError) {
      throw new Error(
        historyError.message ?? "Error al registrar historial de estado",
      );
    }
  }

  return {
    id: updated.id as string,
    status: updated.status as IncidentStatus,
    assignedTo: (updated.assigned_to as string | null) ?? null,
    updatedAt: now,
  };
}
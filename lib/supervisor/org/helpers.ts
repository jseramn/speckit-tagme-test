import type { StaffSession } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertDepartmentAccess,
  supervisorScopeDepartmentIds,
} from "@/lib/supervisor/department-scope";
import { SupervisorOrgError } from "@/lib/supervisor/org-errors";

export async function requireVenueId(session: StaffSession): Promise<string> {
  if (!session.venueId) {
    throw new AuthError("FORBIDDEN", "Sesión sin venue asignado");
  }
  return session.venueId;
}

export async function assertManagerOrAdmin(session: StaffSession): Promise<void> {
  if (session.role !== "manager" && session.role !== "admin") {
    throw new AuthError(
      "FORBIDDEN",
      "Se requiere rol manager o admin para esta operación",
    );
  }
}

export async function getDepartmentVenueId(
  departmentId: string,
): Promise<string> {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("departments")
    .select("id, venue_id")
    .eq("id", departmentId)
    .maybeSingle();

  if (!data?.venue_id) {
    throw new SupervisorOrgError(
      "NOT_FOUND",
      "Departamento no encontrado",
      404,
    );
  }

  return data.venue_id as string;
}

export async function assertDepartmentInVenue(
  session: StaffSession,
  departmentId: string,
): Promise<void> {
  const venueId = await getDepartmentVenueId(departmentId);
  if (venueId !== session.venueId) {
    throw new AuthError("FORBIDDEN", "Departamento fuera de su venue");
  }
  await assertDepartmentAccess(session, departmentId);
}

export async function scopedDepartmentIds(
  session: StaffSession,
): Promise<string[] | null> {
  return supervisorScopeDepartmentIds(session);
}

export async function assertStaffMemberAccess(
  session: StaffSession,
  staffMemberId: string,
): Promise<{ departmentId: string; venueId: string }> {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("staff_members")
    .select("id, department_id, venue_id")
    .eq("id", staffMemberId)
    .maybeSingle();

  if (!data) {
    throw new SupervisorOrgError(
      "NOT_FOUND",
      "Empleado no encontrado",
      404,
    );
  }

  const departmentId = data.department_id as string;
  const venueId = data.venue_id as string;

  if (venueId !== session.venueId) {
    throw new AuthError("FORBIDDEN", "Empleado fuera de su venue");
  }

  await assertDepartmentAccess(session, departmentId);
  return { departmentId, venueId };
}

export async function assertJobRoleInDepartment(
  jobRoleId: string,
  departmentId: string,
): Promise<void> {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("job_roles")
    .select("id, department_id, is_active")
    .eq("id", jobRoleId)
    .maybeSingle();

  if (!data) {
    throw new SupervisorOrgError("NOT_FOUND", "Cargo no encontrado", 404);
  }

  if (data.department_id !== departmentId) {
    throw new SupervisorOrgError(
      "VALIDATION_ERROR",
      "El cargo no pertenece al departamento indicado",
      422,
    );
  }

  if (!data.is_active) {
    throw new SupervisorOrgError(
      "VALIDATION_ERROR",
      "El cargo está desactivado",
      422,
    );
  }
}
import {
  assertVenueAccess,
  AuthError,
  staffMemberIdForSession,
  type StaffSession,
} from "@/lib/auth/session";
import { supervisorScopeDepartmentIds } from "@/lib/supervisor/department-scope";
import { createInsforgeServerClient } from "@/lib/insforge-server";

async function staffMemberDepartment(
  staffMemberId: string,
): Promise<{ venueId: string; departmentId: string } | null> {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("staff_members")
    .select("venue_id, department_id")
    .eq("id", staffMemberId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return {
    venueId: data.venue_id as string,
    departmentId: data.department_id as string,
  };
}

async function departmentVenue(
  departmentId: string,
): Promise<string | null> {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("departments")
    .select("venue_id")
    .eq("id", departmentId)
    .maybeSingle();

  return (data?.venue_id as string) ?? null;
}

/** Staff: solo propio; supervisor: depto asignado; manager/admin: venue. */
export async function assertEmployeeScorecardAccess(
  session: StaffSession,
  staffMemberId: string,
): Promise<void> {
  if (session.role === "staff") {
    const ownId =
      session.staffMemberId ?? (await staffMemberIdForSession(session));
    if (!ownId || ownId !== staffMemberId) {
      throw new AuthError(
        "FORBIDDEN",
        "Solo puede consultar su propio scorecard",
      );
    }
  }

  const target = await staffMemberDepartment(staffMemberId);
  if (!target) {
    throw new AuthError("FORBIDDEN", "Empleado no encontrado");
  }

  assertVenueAccess(session, target.venueId);

  if (session.role === "admin") return;

  if (session.role === "staff") return;

  if (session.role === "manager") return;

  if (session.role === "supervisor") {
    const scope = await supervisorScopeDepartmentIds(session);
    if (!scope?.includes(target.departmentId)) {
      throw new AuthError(
        "FORBIDDEN",
        "Empleado fuera de su departamento asignado",
      );
    }
    return;
  }

  throw new AuthError("FORBIDDEN", "Sin permisos de scorecard");
}

/** Supervisor: depto asignado; manager/admin: venue. */
export async function assertDepartmentScorecardAccess(
  session: StaffSession,
  departmentId: string,
): Promise<void> {
  if (session.role === "staff") {
    throw new AuthError("FORBIDDEN", "Sin permisos de scorecard departamento");
  }

  const venueId = await departmentVenue(departmentId);
  if (!venueId) {
    throw new AuthError("FORBIDDEN", "Departamento no encontrado");
  }

  assertVenueAccess(session, venueId);

  if (session.role === "admin" || session.role === "manager") return;

  if (session.role === "supervisor") {
    const scope = await supervisorScopeDepartmentIds(session);
    if (!scope?.includes(departmentId)) {
      throw new AuthError(
        "FORBIDDEN",
        "Departamento fuera de su asignación de supervisor",
      );
    }
    return;
  }

  throw new AuthError("FORBIDDEN", "Sin permisos de scorecard departamento");
}

/** Solo manager/admin del venue. */
export async function assertHotelScorecardAccess(
  session: StaffSession,
  venueId: string,
): Promise<void> {
  assertVenueAccess(session, venueId);

  if (session.role === "admin" || session.role === "manager") return;

  throw new AuthError("FORBIDDEN", "Se requiere rol manager o admin");
}

export function canIncludeComments(session: StaffSession): boolean {
  return session.role === "manager" || session.role === "admin";
}
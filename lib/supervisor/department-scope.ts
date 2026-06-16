import { AuthError, type StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";

/**
 * Department IDs a supervisor may access. null = unrestricted (manager/admin).
 */
export async function supervisorScopeDepartmentIds(
  session: StaffSession,
): Promise<string[] | null> {
  if (session.role === "admin" || session.role === "manager") {
    return null;
  }

  if (session.role !== "supervisor" || !session.profileId) {
    return [];
  }

  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("supervisor_department_assignments")
    .select("department_id")
    .eq("user_profile_id", session.profileId);

  if (error || !data) return [];

  return data.map((row) => row.department_id as string);
}

export async function assertDepartmentAccess(
  session: StaffSession,
  departmentId: string | null,
): Promise<void> {
  if (session.role === "admin") return;

  if (!departmentId) {
    throw new AuthError(
      "FORBIDDEN",
      "Incidencia sin departamento asignado — acceso denegado",
    );
  }

  if (session.role === "manager") {
    const insforge = createInsforgeServerClient();
    const { data } = await insforge.database
      .from("departments")
      .select("id, venue_id")
      .eq("id", departmentId)
      .maybeSingle();

    if (!data || data.venue_id !== session.venueId) {
      throw new AuthError("FORBIDDEN", "Departamento fuera de su venue");
    }
    return;
  }

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

  throw new AuthError("FORBIDDEN", "Sin permisos de supervisor");
}

export async function assertDepartmentFilterAccess(
  session: StaffSession,
  departmentId: string,
): Promise<void> {
  await assertDepartmentAccess(session, departmentId);
}
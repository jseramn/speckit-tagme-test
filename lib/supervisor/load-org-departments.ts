import type { StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { supervisorScopeDepartmentIds } from "@/lib/supervisor/department-scope";
import type { OrgDepartment } from "@/components/supervisor/OrganizationTree";

export async function loadOrgDepartments(
  session: StaffSession,
): Promise<OrgDepartment[]> {
  const scope = await supervisorScopeDepartmentIds(session);
  const insforge = createInsforgeServerClient();

  let query = insforge.database
    .from("departments")
    .select("id, name, code, is_active")
    .eq("venue_id", session.venueId!)
    .order("name");

  if (scope !== null) {
    if (scope.length === 0) return [];
    query = query.in("id", scope);
  }

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    code: row.code as string,
    isActive: row.is_active as boolean,
  }));
}
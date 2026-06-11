import type { StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { assertDepartmentInVenue } from "@/lib/supervisor/org/helpers";
import { SupervisorOrgError } from "@/lib/supervisor/org-errors";
import type {
  jobRoleCreateSchema,
  jobRoleUpdateSchema,
} from "@/lib/validators/supervisor-org";
import type { z } from "zod";

export interface JobRoleItem {
  id: string;
  departmentId: string;
  title: string;
  isActive: boolean;
}

function mapJobRole(row: Record<string, unknown>): JobRoleItem {
  return {
    id: row.id as string,
    departmentId: row.department_id as string,
    title: row.title as string,
    isActive: row.is_active as boolean,
  };
}

export async function listJobRoles(
  session: StaffSession,
  departmentId: string,
): Promise<{ items: JobRoleItem[] }> {
  await assertDepartmentInVenue(session, departmentId);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("job_roles")
    .select("id, department_id, title, is_active")
    .eq("department_id", departmentId)
    .order("title");

  if (error) throw new Error(error.message);
  return { items: (data ?? []).map(mapJobRole) };
}

export async function createJobRole(
  session: StaffSession,
  body: z.input<typeof jobRoleCreateSchema>,
): Promise<JobRoleItem> {
  await assertDepartmentInVenue(session, body.departmentId);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("job_roles")
    .insert([
      {
        department_id: body.departmentId,
        title: body.title,
        is_active: body.isActive ?? true,
      },
    ])
    .select("id, department_id, title, is_active")
    .single();

  if (error) throw new Error(error.message);
  return mapJobRole(data);
}

export async function updateJobRole(
  session: StaffSession,
  id: string,
  body: z.infer<typeof jobRoleUpdateSchema>,
): Promise<JobRoleItem> {
  const insforge = createInsforgeServerClient();

  const { data: existing } = await insforge.database
    .from("job_roles")
    .select("id, department_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    throw new SupervisorOrgError("NOT_FOUND", "Cargo no encontrado", 404);
  }

  await assertDepartmentInVenue(
    session,
    existing.department_id as string,
  );

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const { data, error } = await insforge.database
    .from("job_roles")
    .update(patch)
    .eq("id", id)
    .select("id, department_id, title, is_active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new SupervisorOrgError("NOT_FOUND", "Cargo no encontrado", 404);
  }

  return mapJobRole(data);
}
import type { StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { assertDepartmentAccess } from "@/lib/supervisor/department-scope";
import {
  assertManagerOrAdmin,
  requireVenueId,
  scopedDepartmentIds,
} from "@/lib/supervisor/org/helpers";
import { SupervisorOrgError } from "@/lib/supervisor/org-errors";
import type {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "@/lib/validators/supervisor-org";
import type { z } from "zod";

export interface DepartmentItem {
  id: string;
  venueId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

function mapDepartment(row: Record<string, unknown>): DepartmentItem {
  return {
    id: row.id as string,
    venueId: row.venue_id as string,
    name: row.name as string,
    code: row.code as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

export async function listDepartments(
  session: StaffSession,
): Promise<{ items: DepartmentItem[] }> {
  const venueId = await requireVenueId(session);
  const scope = await scopedDepartmentIds(session);
  const insforge = createInsforgeServerClient();

  let query = insforge.database
    .from("departments")
    .select("id, venue_id, name, code, is_active, created_at")
    .eq("venue_id", venueId)
    .order("name");

  if (scope !== null) {
    if (scope.length === 0) {
      return { items: [] };
    }
    query = query.in("id", scope);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return { items: (data ?? []).map(mapDepartment) };
}

export async function getDepartment(
  session: StaffSession,
  id: string,
): Promise<DepartmentItem> {
  await assertDepartmentAccess(session, id);
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("departments")
    .select("id, venue_id, name, code, is_active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.venue_id !== session.venueId) {
    throw new SupervisorOrgError(
      "NOT_FOUND",
      "Departamento no encontrado",
      404,
    );
  }

  return mapDepartment(data);
}

export async function createDepartment(
  session: StaffSession,
  body: z.infer<typeof departmentCreateSchema>,
): Promise<DepartmentItem> {
  await assertManagerOrAdmin(session);
  const venueId = await requireVenueId(session);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("departments")
    .insert([
      {
        venue_id: venueId,
        name: body.name,
        code: body.code,
        is_active: body.isActive ?? true,
      },
    ])
    .select("id, venue_id, name, code, is_active, created_at")
    .single();

  if (error) {
    if (error.message.includes("unique") || error.code === "23505") {
      throw new SupervisorOrgError(
        "CONFLICT",
        "Ya existe un departamento con ese código",
        409,
      );
    }
    throw new Error(error.message);
  }

  return mapDepartment(data);
}

export async function updateDepartment(
  session: StaffSession,
  id: string,
  body: z.infer<typeof departmentUpdateSchema>,
): Promise<DepartmentItem> {
  await assertDepartmentAccess(session, id);
  const insforge = createInsforgeServerClient();

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.code !== undefined) patch.code = body.code;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const { data, error } = await insforge.database
    .from("departments")
    .update(patch)
    .eq("id", id)
    .eq("venue_id", session.venueId!)
    .select("id, venue_id, name, code, is_active, created_at")
    .maybeSingle();

  if (error) {
    if (error.message.includes("unique") || error.code === "23505") {
      throw new SupervisorOrgError(
        "CONFLICT",
        "Ya existe un departamento con ese código",
        409,
      );
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new SupervisorOrgError(
      "NOT_FOUND",
      "Departamento no encontrado",
      404,
    );
  }

  return mapDepartment(data);
}
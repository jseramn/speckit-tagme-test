import type { StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { assertDepartmentInVenue } from "@/lib/supervisor/org/helpers";
import { SupervisorOrgError } from "@/lib/supervisor/org-errors";
import type {
  shiftCreateSchema,
  shiftUpdateSchema,
} from "@/lib/validators/supervisor-org";
import type { z } from "zod";

export interface ShiftItem {
  id: string;
  departmentId: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[];
  isActive: boolean;
}

function mapShift(row: Record<string, unknown>): ShiftItem {
  return {
    id: row.id as string,
    departmentId: row.department_id as string,
    name: row.name as string,
    startTime: (row.start_time as string | null) ?? null,
    endTime: (row.end_time as string | null) ?? null,
    daysOfWeek: (row.days_of_week as number[]) ?? [],
    isActive: row.is_active as boolean,
  };
}

export async function listShifts(
  session: StaffSession,
  departmentId: string,
): Promise<{ items: ShiftItem[] }> {
  await assertDepartmentInVenue(session, departmentId);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("shifts")
    .select(
      "id, department_id, name, start_time, end_time, days_of_week, is_active",
    )
    .eq("department_id", departmentId)
    .order("name");

  if (error) throw new Error(error.message);
  return { items: (data ?? []).map(mapShift) };
}

export async function createShift(
  session: StaffSession,
  body: z.infer<typeof shiftCreateSchema>,
): Promise<ShiftItem> {
  await assertDepartmentInVenue(session, body.departmentId);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("shifts")
    .insert([
      {
        department_id: body.departmentId,
        name: body.name,
        start_time: body.startTime ?? null,
        end_time: body.endTime ?? null,
        days_of_week: body.daysOfWeek,
        is_active: body.isActive ?? true,
      },
    ])
    .select(
      "id, department_id, name, start_time, end_time, days_of_week, is_active",
    )
    .single();

  if (error) throw new Error(error.message);
  return mapShift(data);
}

export async function updateShift(
  session: StaffSession,
  id: string,
  body: z.infer<typeof shiftUpdateSchema>,
): Promise<ShiftItem> {
  const insforge = createInsforgeServerClient();

  const { data: existing } = await insforge.database
    .from("shifts")
    .select("id, department_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    throw new SupervisorOrgError("NOT_FOUND", "Turno no encontrado", 404);
  }

  await assertDepartmentInVenue(
    session,
    existing.department_id as string,
  );

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.startTime !== undefined) patch.start_time = body.startTime;
  if (body.endTime !== undefined) patch.end_time = body.endTime;
  if (body.daysOfWeek !== undefined) patch.days_of_week = body.daysOfWeek;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const { data, error } = await insforge.database
    .from("shifts")
    .update(patch)
    .eq("id", id)
    .select(
      "id, department_id, name, start_time, end_time, days_of_week, is_active",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new SupervisorOrgError("NOT_FOUND", "Turno no encontrado", 404);
  }

  return mapShift(data);
}
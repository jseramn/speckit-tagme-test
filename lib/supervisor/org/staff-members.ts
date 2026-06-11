import type { StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertDepartmentInVenue,
  assertJobRoleInDepartment,
  assertStaffMemberAccess,
  requireVenueId,
  scopedDepartmentIds,
} from "@/lib/supervisor/org/helpers";
import { SupervisorOrgError } from "@/lib/supervisor/org-errors";
import type {
  nfcTagAssignSchema,
  shiftAssignmentSchema,
  staffMemberCreateSchema,
  staffMemberUpdateSchema,
} from "@/lib/validators/supervisor-org";
import type { z } from "zod";

export interface StaffMemberItem {
  id: string;
  venueId: string;
  departmentId: string;
  jobRoleId: string;
  displayName: string;
  userProfileId: string | null;
  employeeCode: string | null;
  isActive: boolean;
  activeNfcTag: { id: string; tagSlug: string } | null;
}

function mapStaffMember(
  row: Record<string, unknown>,
  nfcTag?: { id: string; tag_slug: string } | null,
): StaffMemberItem {
  return {
    id: row.id as string,
    venueId: row.venue_id as string,
    departmentId: row.department_id as string,
    jobRoleId: row.job_role_id as string,
    displayName: row.display_name as string,
    userProfileId: (row.user_profile_id as string | null) ?? null,
    employeeCode: (row.employee_code as string | null) ?? null,
    isActive: row.is_active as boolean,
    activeNfcTag: nfcTag
      ? { id: nfcTag.id, tagSlug: nfcTag.tag_slug }
      : null,
  };
}

async function loadActiveNfcTags(
  staffMemberIds: string[],
): Promise<Map<string, { id: string; tag_slug: string }>> {
  const map = new Map<string, { id: string; tag_slug: string }>();
  if (staffMemberIds.length === 0) return map;

  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("staff_nfc_tags")
    .select("id, staff_member_id, tag_slug")
    .in("staff_member_id", staffMemberIds)
    .eq("is_active", true);

  for (const row of data ?? []) {
    map.set(row.staff_member_id as string, {
      id: row.id as string,
      tag_slug: row.tag_slug as string,
    });
  }

  return map;
}

export async function listStaffMembers(
  session: StaffSession,
  departmentId?: string,
): Promise<{ items: StaffMemberItem[] }> {
  const venueId = await requireVenueId(session);
  const scope = await scopedDepartmentIds(session);
  const insforge = createInsforgeServerClient();

  if (departmentId) {
    await assertDepartmentInVenue(session, departmentId);
  }

  let query = insforge.database
    .from("staff_members")
    .select(
      "id, venue_id, department_id, job_role_id, display_name, user_profile_id, employee_code, is_active",
    )
    .eq("venue_id", venueId)
    .order("display_name");

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  } else if (scope !== null) {
    if (scope.length === 0) return { items: [] };
    query = query.in("department_id", scope);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((r) => r.id as string);
  const nfcMap = await loadActiveNfcTags(ids);

  return {
    items: (data ?? []).map((row) =>
      mapStaffMember(row, nfcMap.get(row.id as string) ?? null),
    ),
  };
}

export async function createStaffMember(
  session: StaffSession,
  body: z.infer<typeof staffMemberCreateSchema>,
): Promise<StaffMemberItem> {
  await assertDepartmentInVenue(session, body.departmentId);
  await assertJobRoleInDepartment(body.jobRoleId, body.departmentId);
  const venueId = await requireVenueId(session);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("staff_members")
    .insert([
      {
        venue_id: venueId,
        department_id: body.departmentId,
        job_role_id: body.jobRoleId,
        display_name: body.displayName,
        user_profile_id: body.userProfileId ?? null,
        employee_code: body.employeeCode ?? null,
        is_active: body.isActive ?? true,
      },
    ])
    .select(
      "id, venue_id, department_id, job_role_id, display_name, user_profile_id, employee_code, is_active",
    )
    .single();

  if (error) throw new Error(error.message);
  return mapStaffMember(data);
}

export async function updateStaffMember(
  session: StaffSession,
  id: string,
  body: z.infer<typeof staffMemberUpdateSchema>,
): Promise<StaffMemberItem> {
  await assertStaffMemberAccess(session, id);
  const insforge = createInsforgeServerClient();

  if (body.departmentId && body.jobRoleId) {
    await assertDepartmentInVenue(session, body.departmentId);
    await assertJobRoleInDepartment(body.jobRoleId, body.departmentId);
  } else if (body.departmentId) {
    await assertDepartmentInVenue(session, body.departmentId);
  } else if (body.jobRoleId) {
    const { data: current } = await insforge.database
      .from("staff_members")
      .select("department_id")
      .eq("id", id)
      .maybeSingle();
    if (!current) {
      throw new SupervisorOrgError("NOT_FOUND", "Empleado no encontrado", 404);
    }
    await assertJobRoleInDepartment(
      body.jobRoleId,
      current.department_id as string,
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.departmentId !== undefined) patch.department_id = body.departmentId;
  if (body.jobRoleId !== undefined) patch.job_role_id = body.jobRoleId;
  if (body.displayName !== undefined) patch.display_name = body.displayName;
  if (body.userProfileId !== undefined) {
    patch.user_profile_id = body.userProfileId;
  }
  if (body.employeeCode !== undefined) patch.employee_code = body.employeeCode;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  const { data, error } = await insforge.database
    .from("staff_members")
    .update(patch)
    .eq("id", id)
    .select(
      "id, venue_id, department_id, job_role_id, display_name, user_profile_id, employee_code, is_active",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new SupervisorOrgError("NOT_FOUND", "Empleado no encontrado", 404);
  }

  const nfcMap = await loadActiveNfcTags([id]);
  return mapStaffMember(data, nfcMap.get(id) ?? null);
}

export async function assignNfcTag(
  session: StaffSession,
  staffMemberId: string,
  body: z.infer<typeof nfcTagAssignSchema>,
): Promise<{ id: string; tagSlug: string; assignedAt: string }> {
  await assertStaffMemberAccess(session, staffMemberId);
  const insforge = createInsforgeServerClient();

  const { data: existingActive } = await insforge.database
    .from("staff_nfc_tags")
    .select("id")
    .eq("staff_member_id", staffMemberId)
    .eq("is_active", true);

  if (existingActive?.length) {
    const now = new Date().toISOString();
    await insforge.database
      .from("staff_nfc_tags")
      .update({ is_active: false, revoked_at: now })
      .in(
        "id",
        existingActive.map((r) => r.id as string),
      );
  }

  const { data, error } = await insforge.database
    .from("staff_nfc_tags")
    .insert([
      {
        staff_member_id: staffMemberId,
        tag_slug: body.tagSlug,
        is_active: true,
      },
    ])
    .select("id, tag_slug, assigned_at")
    .single();

  if (error) {
    if (error.message.includes("unique") || error.code === "23505") {
      throw new SupervisorOrgError(
        "CONFLICT",
        "El slug NFC ya está en uso",
        409,
      );
    }
    throw new Error(error.message);
  }

  return {
    id: data.id as string,
    tagSlug: data.tag_slug as string,
    assignedAt: data.assigned_at as string,
  };
}

export async function assignShift(
  session: StaffSession,
  staffMemberId: string,
  body: z.infer<typeof shiftAssignmentSchema>,
): Promise<{ id: string }> {
  const { departmentId } = await assertStaffMemberAccess(
    session,
    staffMemberId,
  );
  const insforge = createInsforgeServerClient();

  const { data: shift } = await insforge.database
    .from("shifts")
    .select("id, department_id, is_active")
    .eq("id", body.shiftId)
    .maybeSingle();

  if (!shift || !shift.is_active) {
    throw new SupervisorOrgError("NOT_FOUND", "Turno no encontrado", 404);
  }

  if (shift.department_id !== departmentId) {
    throw new SupervisorOrgError(
      "VALIDATION_ERROR",
      "El turno no pertenece al departamento del empleado",
      422,
    );
  }

  const { data, error } = await insforge.database
    .from("staff_shift_assignments")
    .insert([
      {
        staff_member_id: staffMemberId,
        shift_id: body.shiftId,
        effective_from: body.effectiveFrom,
        effective_to: body.effectiveTo ?? null,
      },
    ])
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export interface StaffHistoryItem {
  type: "feedback" | "incident";
  id: string;
  summary: string;
  createdAt: string;
}

export async function getStaffHistory(
  session: StaffSession,
  staffMemberId: string,
): Promise<{ items: StaffHistoryItem[] }> {
  await assertStaffMemberAccess(session, staffMemberId);
  const insforge = createInsforgeServerClient();

  const [feedbacks, incidents] = await Promise.all([
    insforge.database
      .from("feedback_entries")
      .select("id, rating, created_at")
      .eq("staff_member_id", staffMemberId)
      .order("created_at", { ascending: false })
      .limit(25),
    insforge.database
      .from("incident_reports")
      .select("id, category, status, created_at")
      .eq("staff_member_id", staffMemberId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const items: StaffHistoryItem[] = [];

  for (const fb of feedbacks.data ?? []) {
    items.push({
      type: "feedback",
      id: fb.id as string,
      summary: `Feedback ${fb.rating}★`,
      createdAt: fb.created_at as string,
    });
  }

  for (const inc of incidents.data ?? []) {
    items.push({
      type: "incident",
      id: inc.id as string,
      summary: `Incidencia ${inc.category} (${inc.status})`,
      createdAt: inc.created_at as string,
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { items: items.slice(0, 50) };
}
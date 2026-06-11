import type { StaffSession } from "@/lib/auth/session";
import {
  assertDepartmentFilterAccess,
  supervisorScopeDepartmentIds,
} from "@/lib/supervisor/department-scope";
import { resolveStatusFilter } from "@/lib/supervisor/incident-transitions";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { CaptureOriginType, IncidentStatus } from "@/types/staff";
import type { ContextSnapshot } from "@/types/staff";

export interface ListIncidentsQuery {
  status?: string | null;
  departmentId?: string | null;
  category?: string | null;
  limit?: number;
}

export interface IncidentInboxItem {
  id: string;
  status: IncidentStatus;
  category: string;
  priority: string;
  description: string;
  originType: CaptureOriginType;
  originLabel: string;
  roomNumber: string | null;
  departmentName: string | null;
  createdAt: string;
  assignedTo: string | null;
}

export interface ListIncidentsResult {
  items: IncidentInboxItem[];
  total: number;
}

function roomNumberFromSnapshot(
  snapshot: ContextSnapshot | Record<string, unknown>,
): string | null {
  const value =
    (snapshot as Record<string, unknown>).room_number ??
    (snapshot as Record<string, unknown>).roomNumber;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function originLabelFromSnapshot(
  originType: CaptureOriginType,
  snapshot: ContextSnapshot | Record<string, unknown>,
): string {
  if (originType === "staff_nfc") {
    const name =
      (snapshot as ContextSnapshot).display_name ??
      (snapshot as Record<string, unknown>).display_name;
    return typeof name === "string" && name
      ? `NFC Staff — ${name}`
      : "NFC Staff";
  }

  const roomNumber = roomNumberFromSnapshot(snapshot);
  if (roomNumber) {
    return `NFC Habitación — ${roomNumber}`;
  }

  const zone = (snapshot as Record<string, unknown>).zone;
  return typeof zone === "string" && zone
    ? `NFC Zona — ${zone}`
    : "NFC Habitación";
}

export async function listIncidents(
  session: StaffSession,
  query: ListIncidentsQuery,
): Promise<ListIncidentsResult> {
  if (!session.venueId) {
    return { items: [], total: 0 };
  }

  if (query.departmentId) {
    await assertDepartmentFilterAccess(session, query.departmentId);
  }

  const scopeDeptIds = await supervisorScopeDepartmentIds(session);
  const statusFilter = resolveStatusFilter(query.status ?? null);
  const limit = query.limit ?? 50;

  const insforge = createInsforgeServerClient();

  let dbQuery = insforge.database
    .from("incident_reports")
    .select(
      `
      id,
      status,
      category,
      priority,
      description,
      origin_type,
      context_snapshot,
      created_at,
      assigned_to,
      department_id,
      departments ( name )
    `,
      { count: "exact" },
    )
    .eq("venue_id", session.venueId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scopeDeptIds) {
    if (scopeDeptIds.length === 0) {
      return { items: [], total: 0 };
    }
    dbQuery = dbQuery.in("department_id", scopeDeptIds);
  }

  if (query.departmentId) {
    dbQuery = dbQuery.eq("department_id", query.departmentId);
  }

  if (query.category) {
    dbQuery = dbQuery.eq("category", query.category);
  }

  if (statusFilter) {
    dbQuery = dbQuery.in("status", statusFilter);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    throw new Error(error.message ?? "Error al listar incidencias");
  }

  const items: IncidentInboxItem[] = (data ?? []).map((row) => {
    const departments = row.departments as
      | { name: string }
      | { name: string }[]
      | null;
    const departmentName = Array.isArray(departments)
      ? (departments[0]?.name ?? null)
      : (departments?.name ?? null);

    return {
      id: row.id as string,
      status: row.status as IncidentStatus,
      category: row.category as string,
      priority: row.priority as string,
      description: row.description as string,
      originType: row.origin_type as CaptureOriginType,
      originLabel: originLabelFromSnapshot(
        row.origin_type as CaptureOriginType,
        row.context_snapshot as ContextSnapshot,
      ),
      roomNumber:
        row.origin_type === "room_nfc"
          ? roomNumberFromSnapshot(
              row.context_snapshot as ContextSnapshot | Record<string, unknown>,
            )
          : null,
      departmentName,
      createdAt: row.created_at as string,
      assignedTo: (row.assigned_to as string | null) ?? null,
    };
  });

  return { items, total: count ?? items.length };
}
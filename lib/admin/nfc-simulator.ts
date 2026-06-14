import { createInsforgeServerClient } from "@/lib/insforge-server";

interface VenueRelation {
  id: string;
}

interface DepartmentRelation {
  name: string;
}

interface JobRoleRelation {
  title: string;
}

interface StaffMemberRow {
  display_name: string;
  departments: DepartmentRelation | DepartmentRelation[] | null;
  job_roles: JobRoleRelation | JobRoleRelation[] | null;
}

interface StaffTagRow {
  id: string;
  tag_slug: string;
  staff_members: StaffMemberRow | StaffMemberRow[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export interface StaffNfcSimulatorItem {
  tagId: string;
  tagSlug: string;
  staffName: string;
  departmentName: string;
  jobRoleTitle: string;
}

export interface RoomTagSimulatorItem {
  id: string;
  slug: string;
  label: string;
  roomNumber: string | null;
}

export async function fetchActiveStaffNfcTags(
  venueId: string,
): Promise<StaffNfcSimulatorItem[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("staff_nfc_tags")
    .select(
      `
      id,
      tag_slug,
      staff_members!inner (
        display_name,
        departments!inner (name),
        job_roles!inner (title),
        venue_id
      )
    `,
    )
    .eq("is_active", true)
    .eq("staff_members.venue_id", venueId)
    .eq("staff_members.is_active", true)
    .order("tag_slug");

  if (error || !data) {
    return [];
  }

  return (data as StaffTagRow[]).map((row) => {
    const staff = firstRelation(row.staff_members);
    const department = firstRelation(staff?.departments);
    const jobRole = firstRelation(staff?.job_roles);

    return {
      tagId: row.id,
      tagSlug: row.tag_slug,
      staffName: staff?.display_name ?? "Sin nombre",
      departmentName: department?.name ?? "Sin departamento",
      jobRoleTitle: jobRole?.title ?? "Sin cargo",
    };
  });
}

export async function fetchActiveRoomTags(
  venueId: string,
): Promise<RoomTagSimulatorItem[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("nfc_tags")
    .select("id, slug, label, room_number")
    .eq("venue_id", venueId)
    .eq("zone", "room")
    .eq("is_active", true)
    .order("slug");

  if (error || !data) {
    return [];
  }

  return (data as RoomTagSimulatorItem[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    roomNumber: row.room_number,
  }));
}

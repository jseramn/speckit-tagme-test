import { createInsforgeServerClient } from "@/lib/insforge-server";

interface VenueRow {
  id: string;
  timezone: string;
}

interface DepartmentRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface JobRoleRow {
  id: string;
  title: string;
  is_active: boolean;
}

interface StaffMemberRow {
  id: string;
  venue_id: string;
  display_name: string;
  is_active: boolean;
  departments: DepartmentRow | DepartmentRow[] | null;
  job_roles: JobRoleRow | JobRoleRow[] | null;
  venues: VenueRow | VenueRow[] | null;
}

interface StaffTagRow {
  id: string;
  tag_slug: string;
  is_active: boolean;
  revoked_at: string | null;
  staff_members: StaffMemberRow | StaffMemberRow[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Resolved staff NFC tag with venue, department, and job role context. */
export interface ResolvedStaffTag {
  tagId: string;
  tagSlug: string;
  staffMemberId: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  jobRoleId: string;
  jobRoleTitle: string;
  venueId: string;
  venueTimezone: string;
}

/**
 * Resolves a staff NFC tag slug via JOIN staff_nfc_tags → staff_members →
 * departments → job_roles → venues. Returns null when inactive or revoked.
 */
export async function resolveStaffTag(
  slug: string,
): Promise<ResolvedStaffTag | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("staff_nfc_tags")
    .select(
      `
      id,
      tag_slug,
      is_active,
      revoked_at,
      staff_members!inner (
        id,
        venue_id,
        display_name,
        is_active,
        departments!inner (
          id,
          name,
          is_active
        ),
        job_roles!inner (
          id,
          title,
          is_active
        ),
        venues!inner (
          id,
          timezone
        )
      )
    `,
    )
    .eq("tag_slug", slug)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as StaffTagRow;
  const member = firstRelation(row.staff_members);

  if (!member?.is_active) {
    return null;
  }

  const department = firstRelation(member.departments);
  const jobRole = firstRelation(member.job_roles);
  const venue = firstRelation(member.venues);

  if (!department?.is_active || !jobRole?.is_active || !venue) {
    return null;
  }

  return {
    tagId: row.id,
    tagSlug: row.tag_slug,
    staffMemberId: member.id,
    displayName: member.display_name,
    departmentId: department.id,
    departmentName: department.name,
    jobRoleId: jobRole.id,
    jobRoleTitle: jobRole.title,
    venueId: venue.id,
    venueTimezone: venue.timezone || "America/Bogota",
  };
}
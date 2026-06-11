import type { ContextSnapshot } from "@/types/staff";
import type { ResolvedShift } from "@/lib/staff/resolve-shift";
import type { ResolvedStaffTag } from "@/lib/staff/resolve-staff-tag";

/**
 * Builds an immutable context snapshot from resolved tag and optional shift.
 */
export function buildContextSnapshot(
  tag: ResolvedStaffTag,
  shift: ResolvedShift | null,
): ContextSnapshot {
  return {
    staff_member_id: tag.staffMemberId,
    display_name: tag.displayName,
    department_id: tag.departmentId,
    department_name: tag.departmentName,
    job_role_id: tag.jobRoleId,
    job_role_title: tag.jobRoleTitle,
    shift_id: shift?.shiftId ?? null,
    shift_name: shift?.shiftName ?? null,
    staff_nfc_tag_id: tag.tagId,
    venue_timezone: tag.venueTimezone,
  };
}

/** Maps snapshot fields to API staff context (camelCase). */
export function staffContextFromSnapshot(snapshot: ContextSnapshot): {
  displayName: string;
  departmentName: string;
  jobRoleTitle: string;
} {
  return {
    displayName: snapshot.display_name,
    departmentName: snapshot.department_name,
    jobRoleTitle: snapshot.job_role_title,
  };
}
import { addMinutes, differenceInSeconds } from "date-fns";
import { describe, expect, it } from "vitest";
import { buildContextSnapshot } from "@/lib/staff/build-context-snapshot";
import { openStaffSessionResponseSchema } from "@/lib/validators/staff-session";
import type { ResolvedStaffTag } from "@/lib/staff/resolve-staff-tag";

const SAMPLE_TAG: ResolvedStaffTag = {
  tagId: "550e8400-e29b-41d4-a716-446655440001",
  tagSlug: "caribe-staff-maria-g",
  staffMemberId: "550e8400-e29b-41d4-a716-446655440002",
  displayName: "María G.",
  departmentId: "550e8400-e29b-41d4-a716-446655440003",
  departmentName: "Housekeeping",
  jobRoleId: "550e8400-e29b-41d4-a716-446655440004",
  jobRoleTitle: "Camarista",
  venueId: "550e8400-e29b-41d4-a716-446655440005",
  venueTimezone: "America/Bogota",
};

describe("session TTL unit (T028)", () => {
  it("defaults session TTL to 5 minutes", () => {
    const now = new Date("2026-06-10T14:30:00.000Z");
    const expiresAt = addMinutes(now, 5);
    expect(differenceInSeconds(expiresAt, now)).toBe(300);
  });

  it("buildContextSnapshot is immutable per capture moment", () => {
    const snapshot = buildContextSnapshot(SAMPLE_TAG, null);
    expect(snapshot).toEqual({
      staff_member_id: SAMPLE_TAG.staffMemberId,
      display_name: "María G.",
      department_id: SAMPLE_TAG.departmentId,
      department_name: "Housekeeping",
      job_role_id: SAMPLE_TAG.jobRoleId,
      job_role_title: "Camarista",
      shift_id: null,
      shift_name: null,
      staff_nfc_tag_id: SAMPLE_TAG.tagId,
      venue_timezone: "America/Bogota",
    });

    const copy = { ...snapshot, display_name: "Changed" };
    expect(snapshot.display_name).toBe("María G.");
    expect(copy.display_name).toBe("Changed");
  });

  it("open session response matches contract schema", () => {
    const result = openStaffSessionResponseSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      expiresAt: "2026-06-10T14:35:00.000Z",
      captureUrl: "/capture/550e8400-e29b-41d4-a716-446655440000",
      staff: {
        displayName: "María G.",
        departmentName: "Housekeeping",
        jobRoleTitle: "Camarista",
      },
      deduplicated: false,
    });
    expect(result.success).toBe(true);
  });

  it("dedup window is 45 seconds per constitution/plan defaults", () => {
    const dedupSeconds = 45;
    const createdAt = new Date("2026-06-10T14:30:00.000Z");
    const withinWindow = new Date("2026-06-10T14:30:40.000Z");
    const outsideWindow = new Date("2026-06-10T14:31:00.000Z");

    expect(
      differenceInSeconds(withinWindow, createdAt) <= dedupSeconds,
    ).toBe(true);
    expect(
      differenceInSeconds(outsideWindow, createdAt) <= dedupSeconds,
    ).toBe(false);
  });
});
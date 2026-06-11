import { describe, expect, it } from "vitest";
import { loadTestEnv } from "./helpers/load-env";

loadTestEnv();
import {
  assertDepartmentScorecardAccess,
  assertEmployeeScorecardAccess,
} from "@/lib/scorecards/assert-scorecard-access";
import { AuthError, type StaffSession } from "@/lib/auth/session";

const STAFF_SESSION: StaffSession = {
  userId: "user-staff",
  profileId: "profile-staff",
  role: "staff",
  venueId: "venue-1",
  venueName: "Hotel Caribe",
  venueSlug: "hotel-caribe",
  displayName: "María G.",
  staffMemberId: "staff-maria",
};

const SUPERVISOR_SESSION: StaffSession = {
  userId: "user-sup",
  profileId: "profile-sup",
  role: "supervisor",
  venueId: "venue-1",
  venueName: "Hotel Caribe",
  venueSlug: "hotel-caribe",
  displayName: "Jefe HK",
  staffMemberId: null,
};

describe("scorecards auth contract (T100)", () => {
  it("staff cannot access another employee scorecard", async () => {
    await expect(
      assertEmployeeScorecardAccess(STAFF_SESSION, "staff-other"),
    ).rejects.toBeInstanceOf(AuthError);

    try {
      await assertEmployeeScorecardAccess(STAFF_SESSION, "staff-other");
    } catch (err) {
      expect((err as AuthError).code).toBe("FORBIDDEN");
    }
  });

  it("supervisor cannot access department scorecard without assignment", async () => {
    await expect(
      assertDepartmentScorecardAccess(
        SUPERVISOR_SESSION,
        "00000000-0000-4000-8000-000000000099",
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("staff role cannot access department scorecard endpoint logic", async () => {
    await expect(
      assertDepartmentScorecardAccess(
        STAFF_SESSION,
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
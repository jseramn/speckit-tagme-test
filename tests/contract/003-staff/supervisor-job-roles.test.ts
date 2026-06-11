import { describe, expect, it } from "vitest";
import { AuthError, type StaffSession } from "@/lib/auth/session";
import { assertDepartmentAccess } from "@/lib/supervisor/department-scope";
import {
  jobRoleCreateSchema,
  jobRoleUpdateSchema,
} from "@/lib/validators/supervisor-org";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

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

describe("supervisor job-roles contract (T116)", () => {
  it("create schema requires departmentId and title", () => {
    const valid = jobRoleCreateSchema.safeParse({
      departmentId: "00000000-0000-4000-8000-000000000001",
      title: "Camarista",
    });
    expect(valid.success).toBe(true);

    const invalid = jobRoleCreateSchema.safeParse({ title: "Camarista" });
    expect(invalid.success).toBe(false);
  });

  it("update schema accepts isActive deactivation", () => {
    const result = jobRoleUpdateSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it("supervisor gets 403 on department outside assignment", async () => {
    await expect(
      assertDepartmentAccess(
        SUPERVISOR_SESSION,
        "00000000-0000-4000-8000-000000000099",
      ),
    ).rejects.toBeInstanceOf(AuthError);

    try {
      await assertDepartmentAccess(
        SUPERVISOR_SESSION,
        "00000000-0000-4000-8000-000000000099",
      );
    } catch (err) {
      expect((err as AuthError).code).toBe("FORBIDDEN");
    }
  });
});

describe.skipIf(!hasInsforge)("supervisor job-roles integration (T116)", () => {
  it(
    "supervisor creates job role in assigned department (201 path)",
    async () => {
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );
      const { createJobRole } = await import(
        "@/lib/supervisor/org/job-roles"
      );

      const insforge = createInsforgeServerClient();

      const { data: supervisorProfile } = await insforge.database
        .from("user_profiles")
        .select("id, venue_id, display_name")
        .eq("role", "supervisor")
        .limit(1)
        .maybeSingle();

      expect(supervisorProfile?.id).toBeTruthy();

      const { data: assignment } = await insforge.database
        .from("supervisor_department_assignments")
        .select("department_id")
        .eq("user_profile_id", supervisorProfile!.id as string)
        .limit(1)
        .maybeSingle();

      expect(assignment?.department_id).toBeTruthy();

      const session: StaffSession = {
        userId: "test-supervisor",
        profileId: supervisorProfile!.id as string,
        role: "supervisor",
        venueId: supervisorProfile!.venue_id as string,
        venueName: "Hotel Caribe",
        venueSlug: "hotel-caribe",
        displayName: supervisorProfile!.display_name as string,
        staffMemberId: null,
      };

      const title = `Test Cargo ${Date.now()}`;
      const created = await createJobRole(session, {
        departmentId: assignment!.department_id as string,
        title,
        isActive: true,
      });

      expect(created.title).toBe(title);
      expect(created.isActive).toBe(true);
    },
    30_000,
  );

  it(
    "manager can CRUD job roles across venue departments",
    async () => {
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );
      const { createJobRole, updateJobRole } = await import(
        "@/lib/supervisor/org/job-roles"
      );

      const insforge = createInsforgeServerClient();

      const { data: managerProfile } = await insforge.database
        .from("user_profiles")
        .select("id, venue_id, display_name")
        .eq("role", "manager")
        .limit(1)
        .maybeSingle();

      const { data: department } = await insforge.database
        .from("departments")
        .select("id")
        .eq("venue_id", managerProfile!.venue_id as string)
        .limit(1)
        .maybeSingle();

      expect(managerProfile?.id).toBeTruthy();
      expect(department?.id).toBeTruthy();

      const session: StaffSession = {
        userId: "test-manager",
        profileId: managerProfile!.id as string,
        role: "manager",
        venueId: managerProfile!.venue_id as string,
        venueName: "Hotel Caribe",
        venueSlug: "hotel-caribe",
        displayName: managerProfile!.display_name as string,
        staffMemberId: null,
      };

      const created = await createJobRole(session, {
        departmentId: department!.id as string,
        title: `Manager Cargo ${Date.now()}`,
        isActive: true,
      });

      const updated = await updateJobRole(session, created.id, {
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    },
    30_000,
  );
});
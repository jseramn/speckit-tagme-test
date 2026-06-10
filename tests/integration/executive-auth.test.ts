import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  AuthError,
  canAccessExecutiveRoutes,
  isExecutiveSession,
  requireExecutive,
} from "@/lib/auth/session";
import type { ExecutiveSession } from "@/lib/auth/session";

const executiveSession: ExecutiveSession = {
  userId: "11111111-1111-4111-a111-111111111111",
  role: "executive",
  executiveScope: null,
  venueId: "22222222-2222-4222-a222-222222222222",
  venueName: "Hotel Caribe",
  venueSlug: "hotel-caribe",
  displayName: "Gerente General Demo",
  isExecutive: true,
};

const staffSession = {
  userId: "33333333-3333-4333-a333-333333333333",
  role: "staff" as const,
  venueId: "22222222-2222-4222-a222-222222222222",
  venueName: "Hotel Caribe",
  venueSlug: "hotel-caribe",
  displayName: "Staff Demo",
};

function mockRequireExecutive(session: Awaited<ReturnType<typeof requireExecutive>> | null) {
  return async (request?: NextRequest) => {
    if (!session) {
      throw new AuthError("UNAUTHORIZED", "Sesión requerida");
    }
    if (!isExecutiveSession(session)) {
      throw new AuthError("FORBIDDEN", "Se requiere rol gerencial");
    }
    return session;
  };
}

describe("executive-auth", () => {
  it("requireExecutive pattern accepts executive session", async () => {
    const guard = mockRequireExecutive(executiveSession);
    const session = await guard(new NextRequest("http://localhost/api/executive/me"));
    expect(session.role).toBe("executive");
    expect(isExecutiveSession(session)).toBe(true);
  });

  it("requireExecutive pattern rejects staff with FORBIDDEN", async () => {
    const guard = mockRequireExecutive(
      staffSession as unknown as ExecutiveSession,
    );
    await expect(
      guard(new NextRequest("http://localhost/api/executive/me")),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Se requiere rol gerencial",
    });
  });

  it("requireExecutive pattern rejects unauthenticated with UNAUTHORIZED", async () => {
    const guard = mockRequireExecutive(null);
    await expect(
      guard(new NextRequest("http://localhost/api/executive/me")),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("canAccessExecutiveRoutes blocks staff and allows executive", () => {
    expect(canAccessExecutiveRoutes(staffSession)).toBe(false);
    expect(canAccessExecutiveRoutes(executiveSession)).toBe(true);
  });

  it("manager with operations scope is executive session", () => {
    const managerSession: ExecutiveSession = {
      ...executiveSession,
      role: "manager",
      executiveScope: "operations",
      displayName: "Gerente Operaciones",
    };
    expect(isExecutiveSession(managerSession)).toBe(true);
    expect(managerSession.executiveScope).toBe("operations");
    expect(canAccessExecutiveRoutes(managerSession)).toBe(true);
  });

  it("ops role cannot access executive routes", () => {
    expect(
      canAccessExecutiveRoutes({
        userId: "44444444-4444-4444-a444-444444444444",
        role: "ops",
        venueId: executiveSession.venueId,
        venueName: "Hotel Caribe",
        venueSlug: "hotel-caribe",
        displayName: "Ops Readonly",
      }),
    ).toBe(false);
  });

  it("AuthError carries HTTP-oriented codes", () => {
    const err = new AuthError("FORBIDDEN", "Se requiere rol gerencial");
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toContain("gerencial");
  });
});
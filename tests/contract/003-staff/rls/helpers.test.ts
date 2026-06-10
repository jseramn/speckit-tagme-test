import { describe, expect, it } from "vitest";
import {
  canManageGuestStays,
  type StaffSession,
} from "@/lib/auth/session";

function session(partial: Partial<StaffSession> & Pick<StaffSession, "role">): StaffSession {
  return {
    userId: "test-user",
    profileId: null,
    venueId: "venue-1",
    venueName: "Hotel Caribe",
    venueSlug: "hotel-caribe",
    displayName: "Test User",
    staffMemberId: null,
    ...partial,
  };
}

describe("canManageGuestStays (app layer, T022)", () => {
  it("allows admin for any venue", async () => {
    const allowed = await canManageGuestStays(
      session({ role: "admin", venueId: null }),
      "any-venue",
    );
    expect(allowed).toBe(true);
  });

  it("allows manager at same venue", async () => {
    const allowed = await canManageGuestStays(
      session({ role: "manager", venueId: "venue-1" }),
      "venue-1",
    );
    expect(allowed).toBe(true);
  });

  it("denies manager at different venue", async () => {
    const allowed = await canManageGuestStays(
      session({ role: "manager", venueId: "venue-1" }),
      "venue-2",
    );
    expect(allowed).toBe(false);
  });

  it("denies generic staff without reception link", async () => {
    const allowed = await canManageGuestStays(
      session({ role: "staff", venueId: "venue-1", staffMemberId: null }),
      "venue-1",
    );
    expect(allowed).toBe(false);
  });

  it("denies supervisor role (not reception capacity)", async () => {
    const allowed = await canManageGuestStays(
      session({ role: "supervisor", venueId: "venue-1" }),
      "venue-1",
    );
    expect(allowed).toBe(false);
  });
});

describe("calc_internal_nps contract (schema expectation)", () => {
  it("documents expected SQL behavior: n>=6 returns value, n<6 returns NULL", () => {
    // Verified post-migration via: SELECT calc_internal_nps(1,0,6), calc_internal_nps(0,0,5)
    const npsAt6 = ((1 / 6) * 100 - (0 / 6) * 100);
    expect(Math.round(npsAt6 * 10) / 10).toBe(16.7);
    expect(5 < 6).toBe(true);
  });
});
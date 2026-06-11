import { describe, expect, it, vi } from "vitest";
import { StayError } from "@/lib/stays/errors";

const mockFrom = vi.fn();

vi.mock("@/lib/insforge-server", () => ({
  createInsforgeServerClient: () => ({
    database: { from: mockFrom },
  }),
}));

vi.mock("@/lib/stays/create-formal-stay", () => ({
  createFormalStay: vi.fn(async () => ({
    id: "formal-stay-id",
    stay_token: "formal-token",
    stay_type: "formal",
    status: "active",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  })),
}));

function guestStayChain(data: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "update", "order", "limit"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => ({ data, error: null }));
  builder.single = vi.fn(async () => ({ data, error: null }));
  return builder;
}

function countChain(count: number) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(async () => ({ count, error: null }));
  return builder;
}

describe("consolidateStays unit (T081)", () => {
  it("rejects re-consolidation with conflicting formalStayId", async () => {
    const ephemeralRow = {
      id: "eph-1",
      venue_id: "venue-1",
      stay_type: "ephemeral",
      status: "consolidated",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      consolidated_into: "formal-existing",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "guest_stays") {
        return guestStayChain(ephemeralRow);
      }
      if (table === "feedback_entries" || table === "incident_reports") {
        return countChain(1);
      }
      return guestStayChain(null);
    });

    const { consolidateStays } = await import("@/lib/stays/consolidate-stays");

    await expect(
      consolidateStays({
        ephemeralStayToken: "ephemeral-token",
        formalStayId: "other-formal-id",
        venueId: "venue-1",
        createdByProfileId: null,
      }),
    ).rejects.toMatchObject({
      code: "CONSOLIDATION_CONFLICT",
    });
  });

  it("rejects expired ephemeral stays", async () => {
    const expiredRow = {
      id: "eph-expired",
      venue_id: "venue-1",
      stay_type: "ephemeral",
      status: "expired",
      expires_at: new Date(Date.now() - 86_400_000).toISOString(),
      consolidated_into: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "guest_stays") {
        return guestStayChain(expiredRow);
      }
      return guestStayChain(null);
    });

    const { consolidateStays } = await import("@/lib/stays/consolidate-stays");

    await expect(
      consolidateStays({
        ephemeralStayToken: "expired-token",
        venueId: "venue-1",
        createdByProfileId: null,
      }),
    ).rejects.toBeInstanceOf(StayError);
  });

  it("returns idempotent result when already consolidated", async () => {
    const consolidatedRow = {
      id: "eph-done",
      venue_id: "venue-1",
      stay_type: "ephemeral",
      status: "consolidated",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      consolidated_into: "formal-dest",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "guest_stays") {
        return guestStayChain(consolidatedRow);
      }
      if (table === "feedback_entries" || table === "incident_reports") {
        return countChain(2);
      }
      return guestStayChain(null);
    });

    const { consolidateStays } = await import("@/lib/stays/consolidate-stays");

    const result = await consolidateStays({
      ephemeralStayToken: "done-token",
      venueId: "venue-1",
      createdByProfileId: null,
    });

    expect(result.formalStayId).toBe("formal-dest");
    expect(result.ephemeralStatus).toBe("consolidated");
    expect(result.consolidatedRecords.feedbacks).toBe(2);
    expect(result.consolidatedRecords.incidents).toBe(2);
  });
});
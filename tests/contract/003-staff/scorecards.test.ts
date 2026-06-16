import { describe, expect, it } from "vitest";
import { scorecardQuerySchema, employeeScorecardResponseSchema } from "@/lib/validators/scorecards";
import { mapEmployeeResponse } from "@/lib/scorecards/map-response";
import { parsePeriod } from "@/lib/scorecards/parse-period";

describe("scorecards contract (T100)", () => {
  it("validates period query defaults to 30d", () => {
    const result = scorecardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe("30d");
    }
  });

  it("requires from/to for custom period", () => {
    const result = scorecardQuerySchema.safeParse({ period: "custom" });
    expect(result.success).toBe(false);
  });

  it("parses 30d period with ISO bounds", () => {
    const period = parsePeriod("30d", undefined, undefined, new Date("2026-06-10"));
    expect(period.fromIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period.toIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("maps employee response with insufficient data message", () => {
    const period = parsePeriod("30d");
    const mapped = mapEmployeeResponse({
      staffMemberId: "550e8400-e29b-41d4-a716-446655440001",
      displayName: "María G.",
      departmentId: "550e8400-e29b-41d4-a716-446655440002",
      departmentName: "Housekeeping",
      venueId: "550e8400-e29b-41d4-a716-446655440003",
      period,
      metrics: {
        feedbackCount: 3,
        avgRating: 4.3,
        promoters: 2,
        detractors: 0,
        npsInternal: null,
        insufficientData: true,
        pctPromoters: 66.7,
        pctDetractors: 0,
        message: "Datos insuficientes (n=3). Se requieren al menos 6 opiniones.",
        incidentCountLinked: 0,
        trend7d: {
          feedbackCount: 1,
          avgRating: 5,
          promoters: 1,
          detractors: 0,
          npsInternal: null,
          insufficientData: true,
          pctPromoters: 100,
          pctDetractors: 0,
        },
      },
    });

    const validated = employeeScorecardResponseSchema.safeParse(mapped);
    expect(validated.success).toBe(true);
    expect(mapped.metrics.insufficientData).toBe(true);
    expect(mapped.metrics.npsInternal).toBeNull();
    expect(mapped.metrics.message).toContain("n=3");
  });
});
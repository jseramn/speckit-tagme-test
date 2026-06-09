import { describe, expect, it } from "vitest";
import { metricsSummarySchema } from "@/lib/validators/events";

const validSummary = {
  venueId: "770e8400-e29b-41d4-a716-446655440002",
  period: { from: "2026-06-01", to: "2026-06-08" },
  touchesDaily: [
    { date: "2026-06-07", count: 255 },
    { date: "2026-06-08", count: 120 },
  ],
  peakHours: [
    { hour: 23, count: 120 },
    { hour: 12, count: 85 },
  ],
  destinationBreakdown: [
    { type: "menu", count: 860, percentage: 60.1 },
    { type: "external", count: 320, percentage: 22.4 },
  ],
  deviceBreakdown: [
    { type: "iphone", count: 304, percentage: 95.3 },
    { type: "android", count: 15, percentage: 4.7 },
  ],
  countryBreakdown: [{ countryCode: "CO", count: 150 }],
};

describe("MetricsSummary contract", () => {
  it("accepts valid metrics summary response", () => {
    const result = metricsSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it("accepts empty breakdown arrays", () => {
    const result = metricsSummarySchema.safeParse({
      ...validSummary,
      touchesDaily: [],
      peakHours: [],
      destinationBreakdown: [],
      deviceBreakdown: [],
      countryBreakdown: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid venueId", () => {
    const result = metricsSummarySchema.safeParse({
      ...validSummary,
      venueId: "not-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects peak hour out of range", () => {
    const result = metricsSummarySchema.safeParse({
      ...validSummary,
      peakHours: [{ hour: 25, count: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing deviceBreakdown", () => {
    const { deviceBreakdown: _, ...withoutDevice } = validSummary;
    const result = metricsSummarySchema.safeParse(withoutDevice);
    expect(result.success).toBe(false);
  });
});
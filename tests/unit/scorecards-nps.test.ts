import { describe, expect, it } from "vitest";
import { calcNps } from "@/lib/scorecards/calc-nps";
import { aggregateRatings } from "@/lib/scorecards/aggregate-ratings";

describe("scorecards NPS (T098)", () => {
  it("returns null and insufficientData when n=5", () => {
    const result = calcNps(4, 1, 5, 6);
    expect(result.npsInternal).toBeNull();
    expect(result.insufficientData).toBe(true);
  });

  it("returns NPS when n=6 (boundary)", () => {
    const result = calcNps(4, 1, 6, 6);
    expect(result.npsInternal).toBe(50);
    expect(result.insufficientData).toBe(false);
    expect(result.pctPromoters).toBeCloseTo(66.7, 0);
    expect(result.pctDetractors).toBeCloseTo(16.7, 0);
  });

  it("returns 100 when all promoters", () => {
    const result = calcNps(8, 0, 8, 6);
    expect(result.npsInternal).toBe(100);
    expect(result.pctPromoters).toBe(100);
    expect(result.pctDetractors).toBe(0);
  });

  it("returns -100 when all detractors", () => {
    const result = calcNps(0, 10, 10, 6);
    expect(result.npsInternal).toBe(-100);
    expect(result.pctPromoters).toBe(0);
    expect(result.pctDetractors).toBe(100);
  });

  it("aggregateRatings applies NPS formula %5 - %1-2", () => {
    const ratings = [5, 5, 5, 5, 3, 2];
    const agg = aggregateRatings(ratings, 6);
    expect(agg.feedbackCount).toBe(6);
    expect(agg.npsInternal).toBeCloseTo(50, 0);
    expect(agg.insufficientData).toBe(false);
  });

  it("aggregateRatings marks insufficient when below threshold", () => {
    const agg = aggregateRatings([5, 5, 5], 6);
    expect(agg.insufficientData).toBe(true);
    expect(agg.npsInternal).toBeNull();
  });
});
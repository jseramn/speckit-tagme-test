import { describe, expect, it } from "vitest";
import {
  computeBaselineStatus,
  isBaselineReady,
} from "@/lib/executive/baseline";

describe("executive-baseline (CL-11)", () => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  it("is not ready with fewer than 14 days", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const status = computeBaselineStatus(
      threeDaysAgo.toISOString(),
      150,
    );
    expect(status.ready).toBe(false);
    expect(status.day).toBe(3);
    expect(isBaselineReady(status)).toBe(false);
  });

  it("is not ready with fewer than 100 touches", () => {
    const status = computeBaselineStatus(
      fourteenDaysAgo.toISOString(),
      42,
    );
    expect(status.ready).toBe(false);
    expect(isBaselineReady(status)).toBe(false);
  });

  it("is ready when both 14 days and 100 touches are met", () => {
    const status = computeBaselineStatus(
      fourteenDaysAgo.toISOString(),
      100,
    );
    expect(status.ready).toBe(true);
    expect(isBaselineReady(status)).toBe(true);
  });

  it("returns day 0 when no first touch", () => {
    const status = computeBaselineStatus(null, 0);
    expect(status.ready).toBe(false);
    expect(status.day).toBe(0);
  });
});
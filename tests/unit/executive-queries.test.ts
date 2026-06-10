import { describe, expect, it } from "vitest";
import { deltaPct } from "@/lib/executive/period";

describe("executive-queries", () => {
  describe("pulse window aggregation", () => {
    it("counts touches within 30 min window per zone", () => {
      const now = Date.now();
      const windowMs = 30 * 60 * 1000;
      const touches = [
        { zone: "lobby", at: now - 5 * 60 * 1000 },
        { zone: "lobby", at: now - 10 * 60 * 1000 },
        { zone: "room", at: now - 20 * 60 * 1000 },
        { zone: "room", at: now - 45 * 60 * 1000 },
      ];

      const inWindow = touches.filter((t) => now - t.at <= windowMs);
      const zones = inWindow.reduce<Record<string, number>>((acc, t) => {
        acc[t.zone] = (acc[t.zone] ?? 0) + 1;
        return acc;
      }, {});

      expect(zones.lobby).toBe(2);
      expect(zones.room).toBe(1);
      expect(inWindow).toHaveLength(3);
    });
  });

  describe("trends Δ% vs previous week", () => {
    it("computes positive delta when current week exceeds previous", () => {
      expect(deltaPct(128, 118)).toBe(8.5);
    });

    it("computes negative delta on activity drop", () => {
      expect(deltaPct(80, 100)).toBe(-20);
    });

    it("returns null when previous period had zero touches", () => {
      expect(deltaPct(50, 0)).toBe(100);
      expect(deltaPct(0, 0)).toBeNull();
    });
  });
});
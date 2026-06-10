import { describe, expect, it } from "vitest";
import { deltaPct } from "@/lib/executive/period";

describe("content impact helpers (M5)", () => {
  it("deltaPct computes post vs prior engagement change", () => {
    expect(deltaPct(150, 100)).toBe(50);
    expect(deltaPct(0, 0)).toBeNull();
    expect(deltaPct(10, 0)).toBe(100);
  });
});
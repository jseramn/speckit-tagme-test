import { describe, expect, it } from "vitest";
import {
  assertValidTransition,
  resolveStatusFilter,
} from "@/lib/supervisor/incident-transitions";

describe("incident transitions (T074)", () => {
  it("resolves open filter to abierta + en_progreso", () => {
    expect(resolveStatusFilter("open")).toEqual(["abierta", "en_progreso"]);
  });

  it("rejects skip transitions", () => {
    expect(() => assertValidTransition("abierta", "resuelta")).toThrow();
  });
});
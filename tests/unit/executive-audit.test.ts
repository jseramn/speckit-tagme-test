import { describe, expect, it } from "vitest";
import { resolveAuditUserId } from "@/lib/executive/audit";

describe("resolveAuditUserId", () => {
  it("returns null for dev staff id", () => {
    expect(resolveAuditUserId("dev-staff")).toBeNull();
  });

  it("returns null for dev executive uuid", () => {
    expect(
      resolveAuditUserId("00000000-0000-4000-a000-000000000001"),
    ).toBeNull();
  });

  it("returns real auth user id unchanged", () => {
    const realId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(resolveAuditUserId(realId)).toBe(realId);
  });
});
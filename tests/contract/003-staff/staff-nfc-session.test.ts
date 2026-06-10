import { differenceInSeconds } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";
import { openStaffSessionResponseSchema } from "@/lib/validators/staff-session";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe.skipIf(!hasInsforge)("staff NFC session contract (T026)", () => {
  it("opens session for valid staff tag slug", async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );

    const fingerprint = `test-${Date.now()}-open`;
    const result = await openCaptureSession({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: fingerprint,
      userAgent: "vitest-contract",
    });

    expect(result).not.toBeNull();
    const parsed = openStaffSessionResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result!.deduplicated).toBe(false);
    expect(result!.captureUrl).toMatch(/^\/capture\//);
    expect(result!.staff.displayName).toBeTruthy();
    expect(result!.staff.departmentName).toBeTruthy();
    expect(result!.staff.jobRoleTitle).toBeTruthy();

    const remaining = differenceInSeconds(
      new Date(result!.expiresAt),
      new Date(),
    );
    expect(remaining).toBeGreaterThan(290);
    expect(remaining).toBeLessThanOrEqual(300);
  });

  it("returns null for invalid or revoked staff tag", async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );

    const result = await openCaptureSession({
      staffTagSlug: "caribe-staff-no-existe-xyz",
      clientFingerprint: `test-${Date.now()}-invalid`,
    });

    expect(result).toBeNull();
  });

  it("deduplicates active session within 45s for same tag + fingerprint", async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );

    const fingerprint = `test-${Date.now()}-dedup`;
    const first = await openCaptureSession({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: fingerprint,
    });
    const second = await openCaptureSession({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: fingerprint,
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.sessionToken).toBe(first!.sessionToken);
    expect(second!.deduplicated).toBe(true);
  });
});
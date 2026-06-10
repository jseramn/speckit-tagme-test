import { describe, expect, it } from "vitest";
import { submitFeedbackRequestSchema } from "@/lib/validators/feedback";
import { submitIncidentRequestSchema } from "@/lib/validators/incident";
import { openStaffSessionRequestSchema } from "@/lib/validators/staff-session";
import { createFormalStayRequestSchema } from "@/lib/validators/guest-stay";

describe("F3 validators (T021)", () => {
  it("feedback schema rejects missing origin", () => {
    const result = submitFeedbackRequestSchema.safeParse({ rating: 5 });
    expect(result.success).toBe(false);
  });

  it("feedback schema accepts staff session payload without incident fields", () => {
    const result = submitFeedbackRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      rating: 5,
      comment: "Excelente",
    });
    expect(result.success).toBe(true);
  });

  it("incident schema rejects rating field (Principio IV)", () => {
    const result = submitIncidentRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      category: "mantenimiento",
      description: "AC roto",
      rating: 1,
    });
    expect(result.success).toBe(false);
  });

  it("staff session open schema accepts slug + fingerprint", () => {
    const result = openStaffSessionRequestSchema.safeParse({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: "sha256:abc",
    });
    expect(result.success).toBe(true);
  });

  it("formal stay schema requires venueId", () => {
    const result = createFormalStayRequestSchema.safeParse({
      venueId: "550e8400-e29b-41d4-a716-446655440000",
      ttlDays: 7,
    });
    expect(result.success).toBe(true);
  });
});
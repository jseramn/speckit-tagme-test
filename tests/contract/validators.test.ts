import { describe, expect, it } from "vitest";
import {
  touchEventRequestSchema,
  destinationVisitRequestSchema,
} from "@/lib/validators/events";

describe("touchEventRequestSchema", () => {
  it("accepts valid NFC touch payload", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "caribe-lobby",
      channel: "nfc",
      clientFingerprint: "sha256:abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid channel", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "caribe-lobby",
      channel: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("destinationVisitRequestSchema", () => {
  it("accepts menu destination visit", () => {
    const result = destinationVisitRequestSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      destinationType: "menu",
      destinationUrl: "https://example.com/menu",
    });
    expect(result.success).toBe(true);
  });
});
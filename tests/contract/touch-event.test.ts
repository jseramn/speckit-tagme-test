import { describe, expect, it } from "vitest";
import {
  touchEventRequestSchema,
  touchEventResponseSchema,
} from "@/lib/validators/events";

describe("TouchEventRequest contract", () => {
  it("accepts valid NFC touch payload", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "caribe-lobby",
      channel: "nfc",
      clientFingerprint: "sha256:abc123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagSlug).toBe("caribe-lobby");
      expect(result.data.channel).toBe("nfc");
    }
  });

  it("accepts url_direct channel without fingerprint", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "caribe-restaurant",
      channel: "url_direct",
    });
    expect(result.success).toBe(true);
  });

  it("accepts staff_assisted channel (M6 fallback)", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "caribe-lobby",
      channel: "staff_assisted",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channel).toBe("staff_assisted");
    }
  });

  it("rejects empty tagSlug", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "",
      channel: "nfc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid channel", () => {
    const result = touchEventRequestSchema.safeParse({
      tagSlug: "caribe-lobby",
      channel: "bluetooth",
    });
    expect(result.success).toBe(false);
  });
});

describe("TouchEventResponse contract", () => {
  it("accepts valid 201 response", () => {
    const result = touchEventResponseSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      deduplicated: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts deduplicated response", () => {
    const result = touchEventResponseSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      deduplicated: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid touchEventId", () => {
    const result = touchEventResponseSchema.safeParse({
      touchEventId: "not-a-uuid",
      deduplicated: false,
    });
    expect(result.success).toBe(false);
  });
});
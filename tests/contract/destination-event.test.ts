import { describe, expect, it } from "vitest";
import {
  destinationVisitRequestSchema,
  destinationVisitResponseSchema,
} from "@/lib/validators/events";

describe("DestinationVisitRequest contract", () => {
  it("accepts valid menu destination visit", () => {
    const result = destinationVisitRequestSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      destinationType: "menu",
      destinationUrl: "https://menu.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts avex visit without destinationUrl", () => {
    const result = destinationVisitRequestSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      destinationType: "avex",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-avex visit without destinationUrl", () => {
    const result = destinationVisitRequestSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      destinationType: "external",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid touchEventId", () => {
    const result = destinationVisitRequestSchema.safeParse({
      touchEventId: "not-a-uuid",
      destinationType: "menu",
      destinationUrl: "https://menu.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid destinationType", () => {
    const result = destinationVisitRequestSchema.safeParse({
      touchEventId: "550e8400-e29b-41d4-a716-446655440000",
      destinationType: "pdf",
      destinationUrl: "https://menu.example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("DestinationVisitResponse contract", () => {
  it("accepts valid 201 response", () => {
    const result = destinationVisitResponseSchema.safeParse({
      destinationVisitId: "660e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid destinationVisitId", () => {
    const result = destinationVisitResponseSchema.safeParse({
      destinationVisitId: "bad-id",
    });
    expect(result.success).toBe(false);
  });
});
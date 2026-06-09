import { describe, expect, it } from "vitest";
import {
  avexChatRequestSchema,
  avexDoneEventSchema,
  avexErrorEventSchema,
  avexEscalationEventSchema,
  avexRedirectEventSchema,
  avexSseEventSchema,
  avexTokenEventSchema,
} from "@/lib/validators/avex";

const VALID_SESSION = "550e8400-e29b-41d4-a716-446655440000";

describe("AvexChatRequest contract", () => {
  it("accepts valid chat request", () => {
    const result = avexChatRequestSchema.safeParse({
      sessionToken: VALID_SESSION,
      tagSlug: "caribe-room-412",
      message: "¿A qué hora abre el restaurante?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects message over 500 characters", () => {
    const result = avexChatRequestSchema.safeParse({
      sessionToken: VALID_SESSION,
      tagSlug: "caribe-lobby",
      message: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sessionToken", () => {
    const result = avexChatRequestSchema.safeParse({
      sessionToken: "not-uuid",
      tagSlug: "caribe-lobby",
      message: "Hola",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tagSlug characters", () => {
    const result = avexChatRequestSchema.safeParse({
      sessionToken: VALID_SESSION,
      tagSlug: "Caribe Lobby!",
      message: "Hola",
    });
    expect(result.success).toBe(false);
  });

  it("trims and validates message length after trim", () => {
    const result = avexChatRequestSchema.safeParse({
      sessionToken: VALID_SESSION,
      tagSlug: "caribe-lobby",
      message: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("AvexChat SSE event contract", () => {
  it("accepts token event", () => {
    const result = avexTokenEventSchema.safeParse({
      type: "token",
      content: "El restaurante",
    });
    expect(result.success).toBe(true);
  });

  it("accepts escalation event", () => {
    const result = avexEscalationEventSchema.safeParse({
      type: "escalation",
      reason: "Contacte recepción",
      contact: { phone: "+57 605 664 9494", whatsapp: "+57 300 123 4567" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts redirect event", () => {
    const result = avexRedirectEventSchema.safeParse({
      type: "redirect",
      destinationType: "reservation_link",
      url: "https://www.farandahotels.com/hotel-caribe/reservar",
    });
    expect(result.success).toBe(true);
  });

  it("accepts done event", () => {
    const result = avexDoneEventSchema.safeParse({
      type: "done",
      escalated: false,
      sessionId: VALID_SESSION,
    });
    expect(result.success).toBe(true);
  });

  it("accepts error event", () => {
    const result = avexErrorEventSchema.safeParse({
      type: "error",
      code: "AVEX_TIMEOUT",
      message: "La respuesta tardó demasiado",
    });
    expect(result.success).toBe(true);
  });

  it("parses discriminated union for all event types", () => {
    const events = [
      { type: "token", content: "Hola" },
      {
        type: "escalation",
        reason: "Derivación",
        contact: { phone: "+571234" },
      },
      {
        type: "redirect",
        destinationType: "reservation_link",
        url: "https://example.com/reservar",
      },
      { type: "done", escalated: true, sessionId: VALID_SESSION },
      { type: "error", code: "RATE_LIMIT", message: "Demasiados mensajes" },
    ];

    for (const event of events) {
      expect(avexSseEventSchema.safeParse(event).success).toBe(true);
    }
  });
});
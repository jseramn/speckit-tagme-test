import { describe, expect, it } from "vitest";
import {
  detectSensitiveRequest,
  detectTransactionalIntent,
  evaluateGuardrails,
  shouldEscalate,
} from "@/lib/avex/guardrails";

const RESERVATION_URL = "https://www.farandahotels.com/hotel-caribe/reservar";

describe("detectTransactionalIntent", () => {
  it("detects table reservation intent", () => {
    expect(detectTransactionalIntent("Quiero reservar mesa para 8pm")).toBe(
      "reservation",
    );
  });

  it("detects room booking intent", () => {
    expect(detectTransactionalIntent("Quiero reservar una habitación")).toBe(
      "booking",
    );
  });

  it("detects payment intent", () => {
    expect(detectTransactionalIntent("¿Puedo pagar con tarjeta de crédito?")).toBe(
      "payment",
    );
  });

  it("returns null for informational questions", () => {
    expect(
      detectTransactionalIntent("¿A qué hora abre el restaurante?"),
    ).toBeNull();
  });
});

describe("shouldEscalate", () => {
  it("detects human handoff requests", () => {
    expect(shouldEscalate("Quiero hablar con una persona")).toBe(true);
  });

  it("detects complaints", () => {
    expect(shouldEscalate("Tengo una queja sobre el servicio")).toBe(true);
  });

  it("returns false for FAQ questions", () => {
    expect(shouldEscalate("¿Hay wifi gratis?")).toBe(false);
  });
});

describe("detectSensitiveRequest", () => {
  it("blocks credit card number requests", () => {
    expect(detectSensitiveRequest("Mi número de tarjeta es 4111")).toBe(true);
  });

  it("allows normal amenity questions", () => {
    expect(detectSensitiveRequest("¿Tienen caja fuerte?")).toBe(false);
  });
});

describe("evaluateGuardrails", () => {
  it("redirects transactional intent when reservation URL exists", () => {
    const action = evaluateGuardrails(
      "Quiero reservar mesa para 8pm",
      RESERVATION_URL,
    );
    expect(action.kind).toBe("redirect");
    if (action.kind === "redirect") {
      expect(action.url).toBe(RESERVATION_URL);
    }
  });

  it("escalates transactional intent without reservation URL", () => {
    const action = evaluateGuardrails("Quiero reservar mesa para 8pm", null);
    expect(action.kind).toBe("escalate");
  });

  it("blocks sensitive data sharing", () => {
    const action = evaluateGuardrails(
      "Aquí está mi número de tarjeta",
      RESERVATION_URL,
    );
    expect(action.kind).toBe("block_sensitive");
  });

  it("escalates human handoff requests", () => {
    const action = evaluateGuardrails(
      "Necesito hablar con recepción ahora",
      RESERVATION_URL,
    );
    expect(action.kind).toBe("escalate");
  });

  it("allows informational FAQ questions", () => {
    const action = evaluateGuardrails(
      "¿A qué hora abre el restaurante?",
      RESERVATION_URL,
    );
    expect(action.kind).toBe("allow");
  });
});
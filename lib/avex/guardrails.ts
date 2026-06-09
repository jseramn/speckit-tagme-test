import type { GuardrailAction } from "@/lib/avex/types";

const TRANSACTIONAL_PATTERNS: Array<{
  intent: "reservation" | "payment" | "booking";
  patterns: RegExp[];
}> = [
  {
    intent: "booking",
    patterns: [
      /\b(reserv(ar|a|e|o) (una )?habitaci[oó]n|book a room|check.?in|check.?out)\b/i,
      /\bquiero (una )?habitaci[oó]n\b/i,
      /\bextender (mi )?estad[ií]a\b/i,
    ],
  },
  {
    intent: "reservation",
    patterns: [
      /\b(reserv(ar|a|e|o|ación|aciones)|book(ing)?|mesa para|table for)\b/i,
      /\bquiero (una )?mesa\b/i,
      /\bhacer una reserva\b/i,
      /\bconfirm(ar|a|e) (la )?reserva\b/i,
    ],
  },
  {
    intent: "payment",
    patterns: [
      /\b(pagar|pago|cobrar|cargo|factur(a|ar)|tarjeta de cr[eé]dito|debito|d[eé]bito)\b/i,
      /\b(cu[aá]nto cuesta|precio de|costo de)\b.*\b(reserva|habitaci[oó]n|spa|masaje)\b/i,
      /\bprocesar (el )?pago\b/i,
    ],
  },
];

const ESCALATION_PATTERNS = [
  /\b(hablar con (una )?persona|agente humano|recepci[oó]n|gerente|supervisor)\b/i,
  /\b(queja|reclamo|molest(o|a)|insatisfech[oa])\b/i,
  /\b(emergencia|urgente|ayuda inmediata)\b/i,
];

const SENSITIVE_PATTERNS = [
  /\b(n[uú]mero de (tarjeta|cuenta|documento)|contrase[nñ]a|password|cvv|cvc)\b/i,
  /\b(datos (bancarios|personales|privados)|informaci[oó]n confidencial)\b/i,
  /\b(c[eé]dula|pasaporte|ssn|social security)\b/i,
];

export type TransactionalIntent = "reservation" | "payment" | "booking";

export function detectTransactionalIntent(
  message: string,
): TransactionalIntent | null {
  const normalized = message.trim();
  for (const group of TRANSACTIONAL_PATTERNS) {
    if (group.patterns.some((pattern) => pattern.test(normalized))) {
      return group.intent;
    }
  }
  return null;
}

export function shouldEscalate(message: string): boolean {
  const normalized = message.trim();
  return ESCALATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function detectSensitiveRequest(message: string): boolean {
  const normalized = message.trim();
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function evaluateGuardrails(
  message: string,
  reservationUrl: string | null,
): GuardrailAction {
  if (detectSensitiveRequest(message)) {
    return {
      kind: "block_sensitive",
      message:
        "Por su seguridad, no comparta datos bancarios ni personales aquí. " +
        "Para pagos o datos sensibles, contacte directamente a recepción.",
    };
  }

  const transactional = detectTransactionalIntent(message);
  if (transactional) {
    if (reservationUrl) {
      return {
        kind: "redirect",
        reason:
          transactional === "payment"
            ? "Los pagos y cargos se gestionan en recepción o por los canales oficiales del hotel."
            : "Las reservas y confirmaciones se realizan por los canales oficiales del hotel.",
        url: reservationUrl,
      };
    }

    return {
      kind: "escalate",
      reason:
        "Para reservas, pagos o confirmaciones, nuestro equipo de recepción puede ayudarle directamente.",
    };
  }

  if (shouldEscalate(message)) {
    return {
      kind: "escalate",
      reason:
        "Entiendo que prefiere hablar con nuestro equipo. Recepción está disponible para asistirle.",
    };
  }

  return { kind: "allow" };
}

export const REDIRECT_USER_MESSAGE =
  "No puedo confirmar reservas ni procesar pagos desde el chat. " +
  "Puede completar su solicitud en el enlace oficial del hotel.";

export const SENSITIVE_BLOCK_MESSAGE =
  "Por su seguridad, no comparta datos bancarios ni personales aquí. " +
  "Para pagos o datos sensibles, contacte directamente a recepción.";
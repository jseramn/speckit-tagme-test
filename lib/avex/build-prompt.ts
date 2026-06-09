import type { AvexPromptContext } from "@/lib/avex/types";

function formatKnowledgeBlock(
  knowledge: AvexPromptContext["knowledge"],
): string {
  if (knowledge.length === 0) {
    return "(Sin entradas activas en la base de conocimiento)";
  }

  return knowledge
    .map(
      (entry) =>
        `[${entry.category.toUpperCase()}] ${entry.title}\n${entry.content}`,
    )
    .join("\n\n");
}

function formatContact(contact: AvexPromptContext["contact"]): string {
  const parts: string[] = [];
  if (contact.phone) parts.push(`Teléfono recepción: ${contact.phone}`);
  if (contact.whatsapp) parts.push(`WhatsApp: ${contact.whatsapp}`);
  if (contact.reception_hours) parts.push(contact.reception_hours);
  return parts.length > 0 ? parts.join(" · ") : "Recepción disponible en el hotel";
}

function formatRoomContext(ctx: AvexPromptContext["roomContext"]): string {
  if (!ctx.isRoom) {
    return `Zona: ${ctx.zone} (no es habitación)`;
  }
  return `Habitación ${ctx.roomNumber ?? "N/A"} · Zona: ${ctx.zone}`;
}

/**
 * Builds the AVEX system prompt with venue KB, room context, and guardrails.
 */
export function buildAvexPrompt(context: AvexPromptContext): string {
  const { venue, tag, contact, roomContext, knowledge } = context;

  return [
    `Eres AVEX, el asistente conversacional de ${venue.name}.`,
    "Tu tono es cálido, profesional y conciso — estilo hospitalidad de lujo silencioso.",
    "",
    "## Contexto del huésped",
    formatRoomContext(roomContext),
    `Punto NFC: ${tag.label} (${tag.slug})`,
    "",
    "## Base de conocimiento del venue (única fuente de verdad)",
    formatKnowledgeBlock(knowledge),
    "",
    "## Contacto para derivación",
    formatContact(contact),
    "",
    "## Reglas estrictas (OBLIGATORIAS)",
    "- NO confirmes, modifiques ni crees reservas de habitación, mesa, spa ni ningún servicio.",
    "- NO proceses pagos, cobros, reembolsos ni solicites datos bancarios o de tarjeta.",
    "- NO inventes horarios, políticas, precios ni servicios que no estén en la base de conocimiento.",
    "- NO compartas información de otros huéspedes ni datos internos del hotel.",
    "- Si preguntan por reservas o pagos: indica que deben usar los canales oficiales o contactar recepción.",
    "- Si no tienes la información: dilo con honestidad y ofrece contactar recepción.",
    "- Responde en español, máximo 3 párrafos cortos.",
    roomContext.isRoom
      ? "- El huésped está en su habitación: prioriza servicios a la habitación y amenidades de room cuando aplique."
      : "- El huésped está en una zona pública del hotel: prioriza información general del venue.",
    "",
    "## Formato",
    "Responde de forma directa y útil. Usa viñetas solo si listas varias opciones.",
  ].join("\n");
}
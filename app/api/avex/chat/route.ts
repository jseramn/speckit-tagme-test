import { NextRequest } from "next/server";
import { buildAvexPrompt } from "@/lib/avex/build-prompt";
import {
  evaluateGuardrails,
  REDIRECT_USER_MESSAGE,
  SENSITIVE_BLOCK_MESSAGE,
} from "@/lib/avex/guardrails";
import { fetchKnowledgeForVenue } from "@/lib/avex/knowledge";
import { resolveAvexTag } from "@/lib/avex/resolve-context";
import {
  checkRateLimit,
  fetchSessionHistory,
  getOrCreateSession,
  persistAvexMessages,
} from "@/lib/avex/session";
import { isOpenRouterConfigured, streamAvexChat } from "@/lib/avex/stream-chat";
import { avexChatRequestSchema } from "@/lib/validators/avex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseLine(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function createSseStream(
  handler: (
    send: (payload: Record<string, unknown>) => void,
  ) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseLine(payload)));
      };

      try {
        await handler(send);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error inesperado";
        const code =
          message === "AVEX_TIMEOUT"
            ? "AVEX_TIMEOUT"
            : message === "OPENROUTER_NOT_CONFIGURED"
              ? "AI_NOT_CONFIGURED"
              : "INTERNAL_ERROR";

        send({
          type: "error",
          code,
          message:
            code === "AVEX_TIMEOUT"
              ? "La respuesta tardó demasiado. Intente de nuevo."
              : code === "AI_NOT_CONFIGURED"
                ? "El asistente no está disponible en este momento."
                : "Ocurrió un error. Intente de nuevo.",
        });
        send({ type: "done", escalated: false, sessionId: "" });
      } finally {
        controller.close();
      }
    },
  });
}

async function streamTextAsTokens(
  text: string,
  send: (payload: Record<string, unknown>) => void,
): Promise<void> {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (word) send({ type: "token", content: word });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_BODY", message: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = avexChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const tooLong = parsed.error.flatten().fieldErrors.message?.includes(
      "MESSAGE_TOO_LONG",
    );
    return Response.json(
      {
        error: tooLong ? "MESSAGE_TOO_LONG" : "VALIDATION_ERROR",
        message: tooLong
          ? "El mensaje supera 500 caracteres"
          : "Datos inválidos",
      },
      { status: 400 },
    );
  }

  const { sessionToken, tagSlug, message } = parsed.data;

  const tagContext = await resolveAvexTag(tagSlug);
  if (!tagContext) {
    return Response.json(
      { error: "INVALID_TAG", message: "Tag no encontrado" },
      { status: 400 },
    );
  }

  if (!tagContext.avexEnabled) {
    return Response.json(
      { error: "AVEX_DISABLED", message: "AVEX no habilitado para este punto" },
      { status: 400 },
    );
  }

  const session = await getOrCreateSession({
    sessionToken,
    tagId: tagContext.tag.id,
    venueId: tagContext.venue.id,
    roomNumber: tagContext.tag.roomNumber,
  });

  const rateLimit = await checkRateLimit(session);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "RATE_LIMIT",
        message: "Demasiados mensajes; intenta en unos minutos",
      },
      { status: 429 },
    );
  }

  const guardrail = evaluateGuardrails(message, tagContext.reservationUrl);

  const stream = createSseStream(async (send) => {
    if (guardrail.kind === "block_sensitive") {
      const text = SENSITIVE_BLOCK_MESSAGE;
      await streamTextAsTokens(text, send);
      await persistAvexMessages({
        sessionId: session.id,
        userMessage: message,
        assistantMessage: text,
        escalated: false,
      });
      send({ type: "done", escalated: false, sessionId: session.id });
      return;
    }

    if (guardrail.kind === "redirect") {
      send({
        type: "redirect",
        destinationType: "reservation_link",
        url: guardrail.url,
      });
      await streamTextAsTokens(REDIRECT_USER_MESSAGE, send);
      await persistAvexMessages({
        sessionId: session.id,
        userMessage: message,
        assistantMessage: REDIRECT_USER_MESSAGE,
        escalated: false,
      });
      send({ type: "done", escalated: false, sessionId: session.id });
      return;
    }

    if (guardrail.kind === "escalate") {
      send({
        type: "escalation",
        reason: guardrail.reason,
        contact: {
          phone: tagContext.contact.phone,
          whatsapp: tagContext.contact.whatsapp,
        },
      });
      const text = guardrail.reason;
      await streamTextAsTokens(text, send);
      await persistAvexMessages({
        sessionId: session.id,
        userMessage: message,
        assistantMessage: text,
        escalated: true,
      });
      send({ type: "done", escalated: true, sessionId: session.id });
      return;
    }

    const knowledge = await fetchKnowledgeForVenue(tagContext.venue.id);

    if (knowledge.length === 0) {
      send({
        type: "escalation",
        reason:
          "No tengo información disponible en este momento. Nuestro equipo de recepción puede ayudarle.",
        contact: {
          phone: tagContext.contact.phone,
          whatsapp: tagContext.contact.whatsapp,
        },
      });
      const text =
        "No tengo información disponible en este momento. Por favor contacte a recepción.";
      await streamTextAsTokens(text, send);
      await persistAvexMessages({
        sessionId: session.id,
        userMessage: message,
        assistantMessage: text,
        escalated: true,
      });
      send({ type: "done", escalated: true, sessionId: session.id });
      return;
    }

    if (!isOpenRouterConfigured()) {
      send({
        type: "error",
        code: "AI_NOT_CONFIGURED",
        message: "El asistente no está disponible en este momento.",
      });
      send({ type: "done", escalated: false, sessionId: session.id });
      return;
    }

    const systemPrompt = buildAvexPrompt({
      venue: tagContext.venue,
      tag: tagContext.tag,
      contact: tagContext.contact,
      roomContext: tagContext.roomContext,
      knowledge,
      reservationUrl: tagContext.reservationUrl,
    });

    const history = await fetchSessionHistory(session.id);
    let assistantText = "";

    try {
      for await (const token of streamAvexChat(
        systemPrompt,
        history,
        message,
      )) {
        assistantText += token;
        send({ type: "token", content: token });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "";
      if (errMsg === "AVEX_TIMEOUT") {
        send({
          type: "error",
          code: "AVEX_TIMEOUT",
          message: "La respuesta tardó demasiado. Intente de nuevo.",
        });
      } else {
        send({
          type: "error",
          code: "AI_ERROR",
          message: "No pude generar una respuesta. Intente de nuevo.",
        });
      }
      send({ type: "done", escalated: false, sessionId: session.id });
      return;
    }

    await persistAvexMessages({
      sessionId: session.id,
      userMessage: message,
      assistantMessage: assistantText,
      escalated: false,
    });

    send({ type: "done", escalated: false, sessionId: session.id });
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
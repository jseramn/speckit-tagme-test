"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { trackDestination } from "@/lib/analytics/client-track";
import type { VenueContact } from "@/types";
import { AvexEscalation } from "./AvexEscalation";
import { AvexMessage } from "./AvexMessage";

const SESSION_KEY_PREFIX = "tagme-avex-session:";
const CHAT_API = "/api/avex/chat";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AvexChatProps {
  tagSlug: string;
  touchEventId: string | null;
  contact: VenueContact;
  roomLabel?: string | null;
}

function generateSessionToken(): string {
  return crypto.randomUUID();
}

function getSessionToken(tagSlug: string): string {
  const key = `${SESSION_KEY_PREFIX}${tagSlug}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const token = generateSessionToken();
  localStorage.setItem(key, token);
  return token;
}

type SseEvent =
  | { type: "token"; content: string }
  | {
      type: "escalation";
      reason: string;
      contact: { phone?: string; whatsapp?: string };
    }
  | { type: "redirect"; destinationType: string; url: string }
  | { type: "done"; escalated: boolean; sessionId: string }
  | { type: "error"; code: string; message: string };

export function AvexChat({
  tagSlug,
  touchEventId,
  contact: venueContact,
  roomLabel,
}: AvexChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalation, setEscalation] = useState<{
    reason: string;
    contact: VenueContact;
  } | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [hasTrackedOpen, setHasTrackedOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>("");

  useEffect(() => {
    sessionTokenRef.current = getSessionToken(tagSlug);
  }, [tagSlug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, escalation]);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);

    if (!hasTrackedOpen && touchEventId) {
      await trackDestination({
        touchEventId,
        destinationType: "avex",
      });
      setHasTrackedOpen(true);
    }

    if (messages.length === 0) {
      const greeting = roomLabel
        ? `Hola, soy AVEX. Estoy aquí para ayudarle en ${roomLabel}. ¿En qué puedo asistirle?`
        : "Hola, soy AVEX, su asistente del hotel. ¿En qué puedo ayudarle hoy?";
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: greeting,
        },
      ]);
    }
  }, [hasTrackedOpen, messages.length, roomLabel, touchEventId]);

  const handleRedirect = useCallback(
    async (url: string) => {
      if (touchEventId) {
        await trackDestination({
          touchEventId,
          destinationType: "reservation_link",
          destinationUrl: url,
        });
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [touchEventId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setEscalation(null);
      setRedirectUrl(null);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const response = await fetch(CHAT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: sessionTokenRef.current,
            tagSlug,
            message: trimmed,
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as {
            error?: string;
            message?: string;
          };
          if (response.status === 429) {
            setError(
              "Demasiadas solicitudes. Espere un momento e intente de nuevo.",
            );
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            return;
          }
          setEscalation({
            reason:
              data.message ??
              "No pudimos conectar con AVEX. Contacte a recepción.",
            contact: venueContact,
          });
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Sin respuesta del servidor");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            let event: SseEvent;
            try {
              event = JSON.parse(json) as SseEvent;
            } catch {
              continue;
            }

            if (event.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m,
                ),
              );
            } else if (event.type === "escalation") {
              setEscalation({
                reason: event.reason,
                contact: {
                  phone: event.contact.phone ?? venueContact.phone,
                  whatsapp: event.contact.whatsapp ?? venueContact.whatsapp,
                },
              });
            } else if (event.type === "redirect") {
              setRedirectUrl(event.url);
            } else if (event.type === "error") {
              const escalateCodes = [
                "AI_NOT_CONFIGURED",
                "AI_ERROR",
                "AVEX_TIMEOUT",
                "OPENROUTER_NOT_CONFIGURED",
              ];
              if (escalateCodes.includes(event.code)) {
                setEscalation({
                  reason:
                    "AVEX no está disponible en este momento. Un miembro de nuestro equipo puede ayudarle.",
                  contact: venueContact,
                });
              } else {
                setError(event.message);
              }
            }
          }
        }
      } catch {
        setEscalation({
          reason:
            "No pudimos conectar con AVEX. Un miembro de nuestro equipo puede ayudarle.",
          contact: venueContact,
        });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, tagSlug, venueContact],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="fixed bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-tagme-ink text-tagme-cream shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Abrir chat AVEX"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md flex-col">
      <div className="mx-3 mb-3 flex max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-2xl border border-tagme-slate/10 bg-tagme-cream shadow-2xl">
        <header className="flex items-center justify-between border-b border-tagme-slate/10 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-tagme-gold">
              AVEX
            </p>
            <p className="text-sm font-medium text-tagme-ink">
              Asistente del hotel
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-tagme-slate transition-colors hover:bg-tagme-cream"
            aria-label="Cerrar chat"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((msg) => (
            <AvexMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={
                isStreaming &&
                msg.role === "assistant" &&
                msg.id.startsWith("assistant-") &&
                msg === messages[messages.length - 1]
              }
            />
          ))}

          {escalation && (
            <AvexEscalation
              reason={escalation.reason}
              contact={escalation.contact}
            />
          )}

          {redirectUrl && (
            <div className="rounded-2xl border border-tagme-slate/10 bg-white px-4 py-3">
              <p className="text-sm text-tagme-ink">
                Para completar su solicitud, use el canal oficial de reservas.
              </p>
              <button
                type="button"
                onClick={() => void handleRedirect(redirectUrl)}
                className="mt-2 text-sm font-medium text-tagme-gold hover:underline"
              >
                Ir a reservas →
              </button>
            </div>
          )}

          {error && !escalation && (
            <p
              role="alert"
              className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {error}
            </p>
          )}

          {!escalation && !error && (
            <button
              type="button"
              onClick={() =>
                setEscalation({
                  reason: "Prefiero hablar con una persona.",
                  contact: venueContact,
                })
              }
              className="w-full rounded-xl border border-tagme-slate/10 bg-white px-3 py-2 text-left text-xs text-tagme-slate transition-colors hover:bg-tagme-cream"
            >
              Hablar con recepción →
            </button>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-tagme-slate/10 bg-white px-3 py-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escriba su pregunta…"
            maxLength={500}
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-tagme-slate/15 bg-tagme-cream/50 px-4 py-2.5 text-sm text-tagme-ink placeholder:text-tagme-slate/40 focus:border-tagme-gold/50 focus:outline-none focus:ring-1 focus:ring-tagme-gold/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-xl bg-tagme-ink px-4 py-2.5 text-sm font-medium text-tagme-cream transition-opacity disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
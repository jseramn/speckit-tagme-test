"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SubmitFeedbackResponse } from "@/lib/validators/feedback";

const RATING_LABELS: Record<number, string> = {
  1: "Muy mala",
  2: "Mala",
  3: "Regular",
  4: "Buena",
  5: "Excelente",
};

export interface FeedbackFormProps {
  sessionToken: string;
  disabled?: boolean;
  onSuccess: (message: string) => void;
  onBack: () => void;
}

export function FeedbackForm({
  sessionToken,
  disabled = false,
  onSuccess,
  onBack,
}: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (disabled) return;

    if (rating === null) {
      setError("Selecciona una calificación del 1 al 5.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/capture/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          rating,
          comment: comment.trim() ? comment.trim() : null,
        }),
      });

      if (response.status === 410) {
        setError(
          "La sesión expiró. Pide al personal que acerque su tarjeta nuevamente.",
        );
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(
          payload?.message ??
            "No pudimos enviar tu opinión. Intenta de nuevo.",
        );
        return;
      }

      const data = (await response.json()) as SubmitFeedbackResponse;
      onSuccess(data.message);
    } catch {
      setError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="mb-3 text-sm text-tagme-slate/80">
          ¿Cómo calificarías la atención?
        </p>
        <div
          className="grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="Calificación del 1 al 5"
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = rating === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled || loading}
                onClick={() => setRating(value)}
                className={[
                  "flex flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors",
                  selected
                    ? "border-tagme-gold bg-tagme-gold/15 text-tagme-ink"
                    : "border-tagme-slate/15 bg-white text-tagme-slate hover:border-tagme-gold/40",
                  disabled ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
              >
                <span className="text-lg font-semibold">{value}</span>
                <span className="mt-1 hidden text-[10px] leading-tight sm:block">
                  {RATING_LABELS[value]}
                </span>
              </button>
            );
          })}
        </div>
        {rating !== null && (
          <p className="mt-2 text-xs text-tagme-gold sm:hidden">
            {RATING_LABELS[rating]}
          </p>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
          Comentario (opcional)
        </span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={disabled || loading}
          rows={4}
          maxLength={2000}
          placeholder="Cuéntanos más sobre tu experiencia…"
          className="w-full resize-none rounded-xl border border-tagme-slate/15 bg-white px-3.5 py-2.5 text-sm text-tagme-ink placeholder:text-tagme-slate/40 focus:border-tagme-gold/60 focus:outline-none focus:ring-2 focus:ring-tagme-gold/20 disabled:opacity-50"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={onBack}
          disabled={loading}
        >
          Volver
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="w-full flex-1"
          loading={loading}
          disabled={disabled}
        >
          Enviar opinión
        </Button>
      </div>
    </form>
  );
}
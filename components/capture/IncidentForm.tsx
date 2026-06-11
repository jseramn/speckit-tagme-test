"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { IncidentPriority } from "@/types/staff";
import type { SubmitIncidentResponse } from "@/lib/validators/incident";

export interface IncidentCategoryOption {
  code: string;
  label: string;
  defaultPriority: IncidentPriority;
}

const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITIES: IncidentPriority[] = ["baja", "media", "alta", "urgente"];

export interface IncidentFormProps {
  sessionToken?: string;
  roomTagSlug?: string;
  categories: IncidentCategoryOption[];
  disabled?: boolean;
  onSuccess: (message: string) => void;
  onBack: () => void;
}

export function IncidentForm({
  sessionToken,
  roomTagSlug,
  categories,
  disabled = false,
  onSuccess,
  onBack,
}: IncidentFormProps) {
  const [category, setCategory] = useState(categories[0]?.code ?? "");
  const [description, setDescription] = useState("");
  const [priorityOverride, setPriorityOverride] = useState<
    IncidentPriority | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.code === category),
    [categories, category],
  );

  const suggestedPriority =
    selectedCategory?.defaultPriority ?? ("media" as IncidentPriority);
  const effectivePriority = priorityOverride ?? suggestedPriority;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (disabled || !category) return;

    if (description.trim().length < 3) {
      setError("Describe el problema con al menos 3 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/capture/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(roomTagSlug ? { roomTagSlug } : { sessionToken }),
          category,
          description: description.trim(),
          priority: effectivePriority,
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
          typeof payload?.message === "string"
            ? payload.message
            : "No pudimos registrar la incidencia. Intenta de nuevo.",
        );
        return;
      }

      await response.json() as SubmitIncidentResponse;
      onSuccess(
        "Incidencia registrada. El equipo la atenderá lo antes posible.",
      );
    } catch {
      setError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No hay categorías de incidencia configuradas para este hotel.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="mb-3 text-sm text-tagme-slate/80">
          ¿Qué tipo de problema necesitas reportar?
        </p>
        <div className="flex flex-col gap-2">
          {categories.map((item) => {
            const selected = category === item.code;
            return (
              <button
                key={item.code}
                type="button"
                disabled={disabled || loading}
                onClick={() => {
                  setCategory(item.code);
                  setPriorityOverride(null);
                }}
                className={[
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-tagme-gold bg-tagme-gold/15 text-tagme-ink"
                    : "border-tagme-slate/15 bg-white text-tagme-slate hover:border-tagme-gold/40",
                  disabled ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-xs text-tagme-slate/60">
                  Prioridad sugerida: {PRIORITY_LABELS[item.defaultPriority]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
          Descripción del problema
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled || loading}
          rows={4}
          maxLength={4000}
          placeholder="Ej.: El aire acondicionado no enfría la habitación…"
          className="w-full resize-none rounded-xl border border-tagme-slate/15 bg-white px-3.5 py-2.5 text-sm text-tagme-ink placeholder:text-tagme-slate/40 focus:border-tagme-gold/60 focus:outline-none focus:ring-2 focus:ring-tagme-gold/20 disabled:opacity-50"
        />
      </label>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
          Prioridad
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRIORITIES.map((value) => {
            const selected = effectivePriority === value;
            const isSuggested = suggestedPriority === value && !priorityOverride;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled || loading}
                onClick={() => setPriorityOverride(value)}
                className={[
                  "rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-colors",
                  selected
                    ? "border-tagme-gold bg-tagme-gold/15 text-tagme-ink"
                    : "border-tagme-slate/15 bg-white text-tagme-slate hover:border-tagme-gold/40",
                ].join(" ")}
              >
                {PRIORITY_LABELS[value]}
                {isSuggested && (
                  <span className="mt-0.5 block text-[10px] text-tagme-gold">
                    sugerida
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

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
          Reportar incidencia
        </Button>
      </div>
    </form>
  );
}
"use client";

import { FormEvent, useState } from "react";
import type { Destination, DestinationType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const DESTINATION_TYPES: DestinationType[] = [
  "menu",
  "external",
  "reservation_link",
  "info",
  "social",
];

export interface ExperienceConfigState {
  id: string;
  title: string;
  welcomeMessage: string | null;
  avexEnabled: boolean;
  destinations: Destination[];
}

interface DestinationEditorProps {
  config: ExperienceConfigState;
  readOnly?: boolean;
  onSaved?: () => void;
}

function emptyDestination(): Destination {
  return {
    id: `dest-${Date.now()}`,
    type: "external",
    label: "Nuevo destino",
    url: "https://",
    icon: "link",
    isPrimary: false,
  };
}

function toEditorDestination(raw: Record<string, unknown>): Destination {
  return {
    id: String(raw.id ?? ""),
    type: (raw.type as DestinationType) ?? "external",
    label: String(raw.label ?? ""),
    url: String(raw.url ?? ""),
    icon: String(raw.icon ?? "link"),
    isPrimary: Boolean(raw.isPrimary ?? raw.is_primary ?? false),
  };
}

export function DestinationEditor({
  config,
  readOnly = false,
  onSaved,
}: DestinationEditorProps) {
  const [title, setTitle] = useState(config.title);
  const [welcomeMessage, setWelcomeMessage] = useState(
    config.welcomeMessage ?? "",
  );
  const [avexEnabled, setAvexEnabled] = useState(config.avexEnabled);
  const [destinations, setDestinations] = useState<Destination[]>(
    config.destinations.map((d) =>
      toEditorDestination(d as unknown as Record<string, unknown>),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateDestination(index: number, patch: Partial<Destination>) {
    setDestinations((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function setPrimary(index: number) {
    setDestinations((prev) =>
      prev.map((d, i) => ({ ...d, isPrimary: i === index })),
    );
  }

  function moveDestination(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= destinations.length) return;
    setDestinations((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function removeDestination(index: number) {
    if (destinations.length <= 1) return;
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (readOnly) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/experience/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          welcomeMessage: welcomeMessage || null,
          avexEnabled,
          destinations: destinations.map((d) => ({
            ...d,
            isPrimary: d.isPrimary ?? false,
          })),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "No se pudo guardar");
        return;
      }

      setSuccess("Contenido guardado. El hub se actualizará en ≤5 min.");
      onSaved?.();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
          Mensajes del hub
        </h2>
        <div className="mt-4 space-y-4">
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            required
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
              Mensaje de bienvenida
            </span>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              disabled={readOnly}
              rows={3}
              className="w-full rounded-xl border border-tagme-slate/15 px-3.5 py-2.5 text-sm focus:border-tagme-gold/60 focus:outline-none focus:ring-2 focus:ring-tagme-gold/20"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-tagme-slate">
            <input
              type="checkbox"
              checked={avexEnabled}
              onChange={(e) => setAvexEnabled(e.target.checked)}
              disabled={readOnly}
              className="rounded border-tagme-slate/30"
            />
            AVEX habilitado
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Destinos ({destinations.length})
          </h2>
          {!readOnly && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setDestinations((prev) => [...prev, emptyDestination()])
              }
            >
              + Destino
            </Button>
          )}
        </div>

        {destinations.map((dest, index) => (
          <article
            key={dest.id}
            className="rounded-2xl border border-tagme-slate/10 bg-white p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-tagme-ink">
                {dest.label || `Destino ${index + 1}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPrimary(index)}
                  disabled={readOnly}
                  className={[
                    "rounded-lg px-2 py-1 text-xs font-medium",
                    dest.isPrimary
                      ? "bg-tagme-gold/20 text-tagme-ink"
                      : "bg-tagme-cream text-tagme-slate",
                  ].join(" ")}
                >
                  {dest.isPrimary ? "Principal" : "Marcar principal"}
                </button>
                {!readOnly && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => moveDestination(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => moveDestination(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeDestination(index)}
                    >
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="ID"
                value={dest.id}
                onChange={(e) =>
                  updateDestination(index, { id: e.target.value })
                }
                disabled={readOnly}
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
                  Tipo
                </span>
                <select
                  value={dest.type}
                  onChange={(e) =>
                    updateDestination(index, {
                      type: e.target.value as DestinationType,
                    })
                  }
                  disabled={readOnly}
                  className="w-full rounded-xl border border-tagme-slate/15 px-3.5 py-2.5 text-sm"
                >
                  {DESTINATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Etiqueta"
                value={dest.label}
                onChange={(e) =>
                  updateDestination(index, { label: e.target.value })
                }
                disabled={readOnly}
              />
              <Input
                label="Icono"
                value={dest.icon}
                onChange={(e) =>
                  updateDestination(index, { icon: e.target.value })
                }
                disabled={readOnly}
              />
              <div className="sm:col-span-2">
                <Input
                  label="URL"
                  type="url"
                  value={dest.url}
                  onChange={(e) =>
                    updateDestination(index, { url: e.target.value })
                  }
                  disabled={readOnly}
                />
              </div>
            </div>
          </article>
        ))}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {!readOnly && (
        <Button type="submit" loading={loading}>
          Guardar contenido
        </Button>
      )}
    </form>
  );
}
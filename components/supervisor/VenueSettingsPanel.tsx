"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface VenueSettings {
  minFeedbacksForNps: number;
  defaultStayTtlDays: number;
  ephemeralStayTtlHours: number;
  sessionDedupSeconds: number;
  staffFeedbackEnabled: boolean;
}

interface Category {
  code: string;
  label: string;
  defaultPriority: string;
  isActive: boolean;
}

interface VenueSettingsPanelProps {
  canEdit: boolean;
}

export function VenueSettingsPanel({ canEdit }: VenueSettingsPanelProps) {
  const [settings, setSettings] = useState<VenueSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const [settingsRes, categoriesRes] = await Promise.all([
        fetch("/api/supervisor/venue-settings"),
        fetch("/api/supervisor/incident-categories"),
      ]);
      const settingsPayload = (await settingsRes.json()) as VenueSettings;
      const categoriesPayload = (await categoriesRes.json()) as {
        items?: Category[];
      };
      setSettings(settingsPayload);
      setCategories(categoriesPayload.items ?? []);
    })();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!settings || !canEdit) return;
    setError(null);
    setSaved(false);
    const response = await fetch("/api/supervisor/venue-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      setError("Error al guardar configuración");
      return;
    }
    setSaved(true);
  }

  if (!settings) {
    return <p className="text-sm text-tagme-slate">Cargando configuración…</p>;
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10"
      >
        <h3 className="text-sm font-semibold text-tagme-ink">
          Umbrales operativos
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-tagme-slate">
            Mín. feedbacks para NPS
            <input
              type="number"
              min={1}
              disabled={!canEdit}
              value={settings.minFeedbacksForNps}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minFeedbacksForNps: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-tagme-slate">
            TTL estadía formal (días)
            <input
              type="number"
              min={1}
              disabled={!canEdit}
              value={settings.defaultStayTtlDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultStayTtlDays: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-tagme-slate">
            TTL estadía efímera (horas)
            <input
              type="number"
              min={1}
              disabled={!canEdit}
              value={settings.ephemeralStayTtlHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ephemeralStayTtlHours: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-tagme-slate">
            Dedup sesión (segundos)
            <input
              type="number"
              min={0}
              disabled={!canEdit}
              value={settings.sessionDedupSeconds}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sessionDedupSeconds: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {canEdit ? (
          <Button type="submit" className="mt-4">
            Guardar umbrales
          </Button>
        ) : (
          <p className="mt-4 text-xs text-tagme-slate/70">
            Solo manager/admin puede editar umbrales.
          </p>
        )}
        {saved ? (
          <p className="mt-2 text-sm text-emerald-700">Guardado.</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10">
        <h3 className="text-sm font-semibold text-tagme-ink">
          Categorías de incidencia
        </h3>
        <ul className="mt-3 space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.code}
              className="flex justify-between rounded-xl bg-tagme-cream/40 px-3 py-2 text-sm"
            >
              <span>{cat.label}</span>
              <span className="text-xs text-tagme-slate">
                {cat.code} · {cat.defaultPriority}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
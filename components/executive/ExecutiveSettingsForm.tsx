"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEPARTMENT_LABELS,
  KPI_LABELS,
  THRESHOLD_LABELS,
} from "@/lib/executive/settings";
import type { AlertThreshold, KpiTarget } from "@/types/executive";

interface ExecutiveSettingsFormProps {
  venueId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function configFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    attention_drop_pct: "% caída — atención",
    critical_drop_pct: "% caída — crítica",
    min_delta_touches_attention: "Δ toques mín. atención",
    min_delta_touches_critical: "Δ toques mín. crítica",
    evaluation_window_min: "Ventana evaluación (min)",
    dedup_window_hours: "Deduplicación (h)",
    inactive_hours: "Horas sin toques",
    min_venue_touches_per_day: "Toques mín. venue/día",
    grace_hours: "Gracia tag nuevo (h)",
    attention_pct: "% derivación — atención",
    critical_pct: "% derivación — crítica",
    window_hours: "Ventana (h)",
    min_sessions_attention: "Sesiones mín. atención",
    min_sessions_critical: "Sesiones mín. crítica",
  };
  return labels[key] ?? key;
}

function numericConfigKeys(alertType: string): string[] {
  switch (alertType) {
    case "activity_drop":
      return [
        "attention_drop_pct",
        "critical_drop_pct",
        "min_delta_touches_attention",
        "min_delta_touches_critical",
        "evaluation_window_min",
        "dedup_window_hours",
      ];
    case "tag_inactive":
      return [
        "inactive_hours",
        "min_venue_touches_per_day",
        "grace_hours",
      ];
    case "avex_derivation":
      return [
        "attention_pct",
        "critical_pct",
        "window_hours",
        "min_sessions_attention",
        "min_sessions_critical",
        "dedup_window_hours",
      ];
    default:
      return [];
  }
}

export function ExecutiveSettingsForm({ venueId }: ExecutiveSettingsFormProps) {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thresholdSave, setThresholdSave] = useState<Record<string, SaveState>>(
    {},
  );
  const [kpiSave, setKpiSave] = useState<Record<string, SaveState>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ venueId });
      const [thresholdRes, kpiRes] = await Promise.all([
        fetch(`/api/executive/thresholds?${params}`),
        fetch(`/api/executive/kpis?${params}`),
      ]);

      if (!thresholdRes.ok || !kpiRes.ok) {
        throw new Error("No se pudo cargar la configuración");
      }

      const thresholdData = (await thresholdRes.json()) as {
        thresholds: AlertThreshold[];
      };
      const kpiData = (await kpiRes.json()) as { targets: KpiTarget[] };

      setThresholds(thresholdData.thresholds);
      setTargets(kpiData.targets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateThresholdConfig(
    id: string,
    key: string,
    value: number,
  ): void {
    setThresholds((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, config: { ...t.config, [key]: value } }
          : t,
      ),
    );
  }

  function updateTargetValue(id: string, value: number): void {
    setTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, targetValue: value } : t)),
    );
  }

  async function saveThreshold(threshold: AlertThreshold): Promise<void> {
    setThresholdSave((s) => ({ ...s, [threshold.id]: "saving" }));
    try {
      const response = await fetch("/api/executive/thresholds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          id: threshold.id,
          config: threshold.config,
        }),
      });
      if (!response.ok) throw new Error("Error al guardar umbral");
      setThresholdSave((s) => ({ ...s, [threshold.id]: "saved" }));
      setTimeout(
        () => setThresholdSave((s) => ({ ...s, [threshold.id]: "idle" })),
        2000,
      );
    } catch {
      setThresholdSave((s) => ({ ...s, [threshold.id]: "error" }));
    }
  }

  async function saveKpiTarget(target: KpiTarget): Promise<void> {
    setKpiSave((s) => ({ ...s, [target.id]: "saving" }));
    try {
      const response = await fetch("/api/executive/kpis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          id: target.id,
          targetValue: target.targetValue,
          comparison: target.comparison,
        }),
      });
      if (!response.ok) throw new Error("Error al guardar meta");
      setKpiSave((s) => ({ ...s, [target.id]: "saved" }));
      setTimeout(
        () => setKpiSave((s) => ({ ...s, [target.id]: "idle" })),
        2000,
      );
    } catch {
      setKpiSave((s) => ({ ...s, [target.id]: "error" }));
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-tagme-slate">Cargando configuración…</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-tagme-ink">
          Umbrales de alerta
        </h2>
        <p className="mt-1 text-sm text-tagme-slate">
          CL-02, CL-03 y CL-04 — aplican en la próxima evaluación automática
          (cron cada 5 min o <code className="text-xs">npm run alerts:evaluate</code>).
        </p>

        <div className="mt-6 space-y-6">
          {thresholds.map((threshold) => {
            const keys = numericConfigKeys(threshold.alertType);
            const state = thresholdSave[threshold.id] ?? "idle";

            return (
              <div
                key={threshold.id}
                className="rounded-xl border border-tagme-slate/10 bg-tagme-cream/20 p-5"
              >
                <h3 className="text-sm font-medium text-tagme-ink">
                  {THRESHOLD_LABELS[threshold.alertType] ?? threshold.alertType}
                  {threshold.department
                    ? ` · ${DEPARTMENT_LABELS[threshold.department] ?? threshold.department}`
                    : ""}
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {keys.map((key) => (
                    <label key={key} className="block">
                      <span className="text-xs text-tagme-slate">
                        {configFieldLabel(key)}
                      </span>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-tagme-slate/20 bg-white px-3 py-2 text-sm text-tagme-ink"
                        value={Number(
                          (threshold.config as Record<string, unknown>)[key] ?? 0,
                        )}
                        onChange={(e) =>
                          updateThresholdConfig(
                            threshold.id,
                            key,
                            Number(e.target.value),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void saveThreshold(threshold)}
                    disabled={state === "saving"}
                    className="rounded-xl bg-tagme-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {state === "saving" ? "Guardando…" : "Guardar umbral"}
                  </button>
                  {state === "saved" && (
                    <span className="text-xs text-green-700">Guardado</span>
                  )}
                  {state === "error" && (
                    <span className="text-xs text-red-600">Error al guardar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-tagme-ink">Metas KPI (CL-08)</h2>
        <p className="mt-1 text-sm text-tagme-slate">
          Semana 1 = calibración sin semáforo. Metas activas desde semana 2 del
          piloto.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-tagme-slate/10 text-xs uppercase tracking-widest text-tagme-slate/60">
                <th className="pb-3 pr-4 font-medium">KPI</th>
                <th className="pb-3 pr-4 font-medium">Área</th>
                <th className="pb-3 pr-4 font-medium">Período</th>
                <th className="pb-3 pr-4 font-medium">Meta</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => {
                const state = kpiSave[target.id] ?? "idle";
                const comparisonLabel =
                  target.comparison === "gte" ? "≥" : "≤";

                return (
                  <tr
                    key={target.id}
                    className="border-b border-tagme-slate/5 last:border-0"
                  >
                    <td className="py-3 pr-4 text-tagme-ink">
                      {KPI_LABELS[target.kpiKey] ?? target.kpiKey}
                    </td>
                    <td className="py-3 pr-4 text-tagme-slate">
                      {DEPARTMENT_LABELS[target.department] ?? target.department}
                    </td>
                    <td className="py-3 pr-4 text-tagme-slate">
                      {target.period === "weekly" ? "Semanal" : "Mensual"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="mr-1 text-tagme-slate">{comparisonLabel}</span>
                      <input
                        type="number"
                        step="0.1"
                        className="w-24 rounded-lg border border-tagme-slate/20 bg-white px-2 py-1 text-sm"
                        value={target.targetValue}
                        onChange={(e) =>
                          updateTargetValue(target.id, Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => void saveKpiTarget(target)}
                        disabled={state === "saving"}
                        className="rounded-lg border border-tagme-slate/20 px-3 py-1.5 text-xs font-medium text-tagme-ink transition-colors hover:bg-tagme-cream/60 disabled:opacity-50"
                      >
                        {state === "saving" ? "…" : "Guardar"}
                      </button>
                      {state === "saved" && (
                        <span className="ml-2 text-xs text-green-700">✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
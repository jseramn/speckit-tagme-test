"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ExecutiveAlert } from "@/types/executive";
import { AlertActions } from "./AlertActions";

const POLL_INTERVAL_MS = 30_000;

const SEVERITY_STYLES: Record<
  ExecutiveAlert["severity"],
  { badge: string; label: string }
> = {
  critical: {
    badge: "bg-red-50 text-red-700 ring-red-100",
    label: "Crítica",
  },
  attention: {
    badge: "bg-amber-50 text-amber-800 ring-amber-100",
    label: "Atención",
  },
};

const TYPE_LABELS: Record<ExecutiveAlert["type"], string> = {
  tag_inactive: "Tag inactivo",
  activity_drop: "Caída de actividad",
  avex_derivation: "Derivación AVEX",
  system_health: "Salud del sistema",
};

const STATUS_LABELS: Record<ExecutiveAlert["status"], string> = {
  active: "Activa",
  acknowledged: "Reconocida",
  assigned: "Asignada",
  dismissed: "Descartada",
};

export interface AlertFeedProps {
  venueId: string;
  initialAlerts?: ExecutiveAlert[];
  compact?: boolean;
  showHeader?: boolean;
  statusFilter?: ExecutiveAlert["status"] | ExecutiveAlert["status"][];
  poll?: boolean;
}

export function AlertFeed({
  venueId,
  initialAlerts,
  compact = false,
  showHeader = true,
  statusFilter = ["active", "acknowledged", "assigned"],
  poll = true,
}: AlertFeedProps) {
  const [alerts, setAlerts] = useState<ExecutiveAlert[]>(
    initialAlerts ?? [],
  );
  const [loading, setLoading] = useState(!initialAlerts);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const statuses = Array.isArray(statusFilter)
        ? statusFilter
        : [statusFilter];
      const params = new URLSearchParams({ venueId });
      if (statuses.length === 1) {
        params.set("status", statuses[0]!);
      }

      const res = await fetch(`/api/executive/alerts?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { alerts: ExecutiveAlert[] };
      const filtered = statuses.length > 1
        ? json.alerts.filter((a) => statuses.includes(a.status))
        : json.alerts;
      setAlerts(filtered);
      setError(null);
    } catch {
      setError("No se pudieron cargar las alertas");
    } finally {
      setLoading(false);
    }
  }, [venueId, statusFilter]);

  useEffect(() => {
    if (!initialAlerts) void fetchAlerts();
    if (!poll) return;
    const interval = setInterval(() => void fetchAlerts(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts, initialAlerts, poll]);

  function handleUpdated(updated: ExecutiveAlert) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  }

  if (loading && alerts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-tagme-slate/60">
        Cargando alertas…
      </p>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-tagme-slate/15 px-4 py-8 text-center">
        <p className="text-sm text-tagme-slate/70">
          Sin alertas activas en este momento.
        </p>
        <p className="mt-1 text-xs text-tagme-slate/50">
          El motor evalúa cada 5 minutos durante horario operativo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            {compact ? "Alertas destacadas" : "Bandeja de alertas"}
          </h2>
          {compact && (
            <Link
              href="/executive/alerts"
              className="text-xs font-medium text-tagme-gold hover:underline"
            >
              Ver todas
            </Link>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-amber-700">{error}</p>
      )}

      <ul className="space-y-3">
        {alerts.map((alert) => {
          const sev = SEVERITY_STYLES[alert.severity];
          return (
            <li
              key={alert.id}
              className={[
                "rounded-2xl border bg-white p-4 shadow-sm",
                alert.severity === "critical"
                  ? "border-red-100"
                  : "border-tagme-slate/10",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${sev.badge}`}
                    >
                      {sev.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-tagme-slate/50">
                      {TYPE_LABELS[alert.type]}
                    </span>
                    <span className="text-[10px] text-tagme-slate/40">
                      {STATUS_LABELS[alert.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-tagme-ink">
                    {alert.message}
                  </p>
                  {alert.suggestedAction && (
                    <p className="mt-1 text-xs text-tagme-slate/70">
                      {alert.suggestedAction}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-tagme-slate/40">
                    {new Date(alert.createdAt).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {alert.department ? ` · ${alert.department}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-tagme-slate/5 pt-3">
                <AlertActions
                  alert={alert}
                  onUpdated={handleUpdated}
                  compact={compact}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
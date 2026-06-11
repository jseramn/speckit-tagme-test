"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IncidentStatusBadge } from "@/components/supervisor/IncidentStatusBadge";
import type { IncidentStatus } from "@/types/staff";

interface IncidentInboxItem {
  id: string;
  status: IncidentStatus;
  category: string;
  priority: string;
  description: string;
  originType: string;
  originLabel: string;
  roomNumber: string | null;
  departmentName: string | null;
  createdAt: string;
  assignedTo: string | null;
}

interface IncidentInboxProps {
  initialOpenCount: number;
}

const STATUS_FILTERS = [
  { value: "open", label: "Abiertas" },
  { value: "abierta", label: "Nueva" },
  { value: "en_progreso", label: "En progreso" },
  { value: "resuelta", label: "Resuelta" },
  { value: "cerrada", label: "Cerrada" },
  { value: "", label: "Todas" },
] as const;

const NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  abierta: "en_progreso",
  en_progreso: "resuelta",
  resuelta: "cerrada",
};

const ACTION_LABELS: Partial<Record<IncidentStatus, string>> = {
  abierta: "Tomar en progreso",
  en_progreso: "Marcar resuelta",
  resuelta: "Cerrar incidencia",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function IncidentInbox({ initialOpenCount }: IncidentInboxProps) {
  const [items, setItems] = useState<IncidentInboxItem[]>([]);
  const [openCount, setOpenCount] = useState(initialOpenCount);
  const [statusFilter, setStatusFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(
        `/api/supervisor/incidents?${params.toString()}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Error al cargar incidencias");
      }

      const data = (await response.json()) as {
        items: IncidentInboxItem[];
        total: number;
      };
      setItems(data.items);

      const openResponse = await fetch(
        "/api/supervisor/incidents?status=open&limit=100",
      );
      if (openResponse.ok) {
        const openData = (await openResponse.json()) as { total: number };
        setOpenCount(openData.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  async function advanceStatus(incident: IncidentInboxItem) {
    const next = NEXT_STATUS[incident.status];
    if (!next) return;

    setUpdatingId(incident.id);
    setError(null);

    try {
      const response = await fetch(`/api/supervisor/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "No se pudo actualizar el estado");
      }

      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-tagme-ink">Bandeja</h2>
          {openCount > 0 && (
            <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              {openCount}
            </span>
          )}
        </div>
        <Button variant="ghost" onClick={() => void loadIncidents()}>
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-tagme-gold bg-tagme-gold/15 text-tagme-ink"
                  : "border-tagme-slate/15 bg-white text-tagme-slate hover:border-tagme-gold/40",
              ].join(" ")}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-tagme-slate/70">Cargando incidencias…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-tagme-slate/10 bg-white px-5 py-8 text-center text-sm text-tagme-slate/70">
          No hay incidencias para los filtros seleccionados.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((incident) => {
            const nextAction = ACTION_LABELS[incident.status];
            return (
              <li
                key={incident.id}
                className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <IncidentStatusBadge status={incident.status} />
                      <span className="text-xs uppercase tracking-widest text-tagme-slate/50">
                        {incident.category}
                      </span>
                      <span className="text-xs text-tagme-slate/60">
                        · {incident.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-tagme-ink">
                      {incident.description}
                    </p>
                    <dl className="mt-3 grid gap-1 text-xs text-tagme-slate/70 sm:grid-cols-2">
                      <div>
                        <dt className="inline font-medium">Origen: </dt>
                        <dd className="inline">{incident.originLabel}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Departamento: </dt>
                        <dd className="inline">
                          {incident.departmentName ?? "Sin asignar"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Registrada: </dt>
                        <dd className="inline">
                          {formatDate(incident.createdAt)}
                        </dd>
                      </div>
                      {incident.roomNumber && (
                        <div>
                          <dt className="inline font-medium">Habitación: </dt>
                          <dd className="inline">{incident.roomNumber}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  {nextAction && (
                    <Button
                      variant="secondary"
                      loading={updatingId === incident.id}
                      onClick={() => void advanceStatus(incident)}
                      className="shrink-0"
                    >
                      {nextAction}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
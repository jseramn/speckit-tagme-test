"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface OrgCrudPanelProps {
  title: string;
  description: string;
  listUrl: string;
  createUrl: string;
  departmentId?: string;
  renderItem: (item: Record<string, unknown>) => React.ReactNode;
  createFields: React.ReactNode;
  getCreateBody: () => Record<string, unknown>;
  patchUrl?: (id: string) => string;
  emptyMessage?: string;
}

export function OrgCrudPanel({
  title,
  description,
  listUrl,
  createUrl,
  departmentId,
  renderItem,
  createFields,
  getCreateBody,
  patchUrl,
  emptyMessage = "Sin registros.",
}: OrgCrudPanelProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set("departmentId", departmentId);
      const url = params.toString() ? `${listUrl}?${params}` : listUrl;
      const response = await fetch(url);
      const payload = (await response.json()) as { items?: Record<string, unknown>[] };
      if (!response.ok) {
        throw new Error("Error al cargar datos");
      }
      setItems(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [listUrl, departmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getCreateBody()),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Error al crear");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    if (!patchUrl) return;
    setError(null);
    try {
      const response = await fetch(patchUrl(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error("Error al actualizar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-tagme-ink">{title}</h2>
        <p className="mt-1 text-sm text-tagme-slate/80">{description}</p>
      </header>

      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10"
      >
        <h3 className="text-sm font-semibold text-tagme-ink">Crear nuevo</h3>
        <div className="mt-3 space-y-3">{createFields}</div>
        <Button type="submit" disabled={submitting} className="mt-4">
          {submitting ? "Guardando…" : "Guardar"}
        </Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl bg-white ring-1 ring-tagme-slate/10">
        {loading ? (
          <p className="p-5 text-sm text-tagme-slate">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-tagme-slate/70">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-tagme-slate/10">
            {items.map((item) => (
              <li
                key={item.id as string}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">{renderItem(item)}</div>
                {patchUrl && typeof item.isActive === "boolean" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void toggleActive(item.id as string, item.isActive as boolean)
                    }
                    className="shrink-0 text-xs font-medium text-tagme-gold hover:underline"
                  >
                    {(item.isActive as boolean) ? "Desactivar" : "Activar"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
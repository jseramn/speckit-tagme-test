"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OrgDepartment } from "@/components/supervisor/OrganizationTree";

interface JobRole {
  id: string;
  departmentId: string;
  title: string;
  isActive: boolean;
}

interface JobRolesPanelProps {
  departments: OrgDepartment[];
}

export function JobRolesPanel({ departments }: JobRolesPanelProps) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/supervisor/job-roles?departmentId=${departmentId}`,
      );
      const payload = (await response.json()) as { items?: JobRole[] };
      if (!response.ok) throw new Error("Error al cargar cargos");
      setItems(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch("/api/supervisor/job-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId, title: title.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Error al crear cargo");
      }
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setError(null);
    try {
      const response = await fetch(`/api/supervisor/job-roles/${id}`, {
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

  if (departments.length === 0) {
    return (
      <p className="text-sm text-tagme-slate/70">
        Sin departamentos en su alcance.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <label className="block text-sm text-tagme-slate">
        Departamento
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10"
      >
        <h3 className="text-sm font-semibold text-tagme-ink">Nuevo cargo</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Camarista, Mesero"
          required
          className="mt-3 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={!title.trim()} className="mt-4">
          Crear cargo
        </Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl bg-white ring-1 ring-tagme-slate/10">
        {loading ? (
          <p className="p-5 text-sm text-tagme-slate">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-tagme-slate/70">Sin cargos aún.</p>
        ) : (
          <ul className="divide-y divide-tagme-slate/10">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <span
                  className={
                    item.isActive
                      ? "text-sm font-medium text-tagme-ink"
                      : "text-sm text-tagme-slate/50 line-through"
                  }
                >
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleActive(item.id, item.isActive)}
                  className="text-xs font-medium text-tagme-gold hover:underline"
                >
                  {item.isActive ? "Desactivar" : "Activar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
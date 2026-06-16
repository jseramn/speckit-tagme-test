"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OrgDepartment } from "@/components/supervisor/OrganizationTree";

interface Shift {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number[];
  isActive: boolean;
}

interface ShiftsPanelProps {
  departments: OrgDepartment[];
}

export function ShiftsPanel({ departments }: ShiftsPanelProps) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:00");
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/supervisor/shifts?departmentId=${departmentId}`,
      );
      const payload = (await response.json()) as { items?: Shift[] };
      if (!response.ok) throw new Error("Error al cargar turnos");
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
      const response = await fetch("/api/supervisor/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          name: name.trim(),
          startTime,
          endTime,
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        }),
      });
      if (!response.ok) throw new Error("Error al crear turno");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
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
        <h3 className="text-sm font-semibold text-tagme-ink">Nuevo turno</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (Mañana 6–14)"
            required
            className="rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm sm:col-span-3"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={!name.trim()} className="mt-4">
          Crear turno
        </Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl bg-white ring-1 ring-tagme-slate/10">
        {loading ? (
          <p className="p-5 text-sm">Cargando…</p>
        ) : (
          <ul className="divide-y divide-tagme-slate/10">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4 text-sm">
                <span className="font-medium text-tagme-ink">{item.name}</span>
                {item.startTime && item.endTime ? (
                  <span className="ml-2 text-tagme-slate">
                    {item.startTime} – {item.endTime}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
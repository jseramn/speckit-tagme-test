"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StaffNfcAssignForm } from "@/components/supervisor/StaffNfcAssignForm";
import type { OrgDepartment } from "@/components/supervisor/OrganizationTree";

interface JobRole {
  id: string;
  title: string;
}

interface Shift {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  displayName: string;
  departmentId: string;
  jobRoleId: string;
  isActive: boolean;
  activeNfcTag: { tagSlug: string } | null;
}

interface StaffOrgPanelProps {
  departments: OrgDepartment[];
}

export function StaffOrgPanel({ departments }: StaffOrgPanelProps) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    if (!departmentId) return;
    const response = await fetch(
      `/api/supervisor/staff-members?departmentId=${departmentId}`,
    );
    const payload = (await response.json()) as { items?: StaffMember[] };
    setStaff(payload.items ?? []);
  }, [departmentId]);

  const loadMeta = useCallback(async () => {
    if (!departmentId) return;
    const [rolesRes, shiftsRes] = await Promise.all([
      fetch(`/api/supervisor/job-roles?departmentId=${departmentId}`),
      fetch(`/api/supervisor/shifts?departmentId=${departmentId}`),
    ]);
    const rolesPayload = (await rolesRes.json()) as { items?: JobRole[] };
    const shiftsPayload = (await shiftsRes.json()) as { items?: Shift[] };
    const activeRoles = (rolesPayload.items ?? []).filter(
      (r) => (r as JobRole & { isActive?: boolean }).isActive !== false,
    );
    setJobRoles(activeRoles);
    setShifts(shiftsPayload.items ?? []);
    if (activeRoles[0]) setJobRoleId(activeRoles[0].id);
    if (shiftsPayload.items?.[0]) setShiftId(shiftsPayload.items[0].id);
    await loadStaff();
  }, [departmentId, loadStaff]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch("/api/supervisor/staff-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          jobRoleId,
          displayName: displayName.trim(),
        }),
      });
      if (!response.ok) throw new Error("Error al crear empleado");
      setDisplayName("");
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function assignShift(staffMemberId: string) {
    if (!shiftId) return;
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch(
      `/api/supervisor/staff-members/${staffMemberId}/shift-assignment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          effectiveFrom: today,
        }),
      },
    );
    if (!response.ok) {
      setError("Error al asignar turno");
      return;
    }
    setError(null);
  }

  const selected = staff.find((s) => s.id === selectedStaffId) ?? null;

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
        <h3 className="text-sm font-semibold text-tagme-ink">Nuevo empleado</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nombre visible (ej. Carlos R.)"
            required
            className="rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
          />
          <select
            value={jobRoleId}
            onChange={(e) => setJobRoleId(e.target.value)}
            className="rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
          >
            {jobRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={!displayName.trim() || !jobRoleId} className="mt-4">
          Crear empleado
        </Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl bg-white ring-1 ring-tagme-slate/10">
        <ul className="divide-y divide-tagme-slate/10">
          {staff.map((member) => (
            <li key={member.id} className="px-5 py-4">
              <button
                type="button"
                onClick={() => setSelectedStaffId(member.id)}
                className="w-full text-left"
              >
                <span className="font-medium text-tagme-ink">
                  {member.displayName}
                </span>
                {member.activeNfcTag ? (
                  <span className="ml-2 text-xs text-emerald-700">
                    NFC: {member.activeNfcTag.tagSlug}
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-amber-700">Sin NFC</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected ? (
        <div className="space-y-4">
          <StaffNfcAssignForm
            staffMemberId={selected.id}
            staffDisplayName={selected.displayName}
            currentTagSlug={selected.activeNfcTag?.tagSlug ?? null}
            onAssigned={() => void loadStaff()}
          />
          <div className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10">
            <h3 className="text-sm font-semibold text-tagme-ink">
              Asignar turno
            </h3>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm"
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="mt-3"
              onClick={() => void assignShift(selected.id)}
            >
              Asignar turno vigente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
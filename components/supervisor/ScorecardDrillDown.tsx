"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScorecardPeriodPreset } from "@/lib/scorecards/parse-period";
import { PeriodSelector } from "@/components/supervisor/PeriodSelector";
import { ScorecardCard } from "@/components/supervisor/ScorecardCard";

interface DepartmentOption {
  id: string;
  name: string;
}

interface EmployeeRanking {
  staffMemberId: string;
  displayName: string;
  feedbackCount: number;
  npsInternal: number | null;
  insufficientData: boolean;
}

interface ShiftEntry {
  shiftId: string;
  shiftName: string;
  feedbackCount: number;
  npsInternal: number | null;
  insufficientData: boolean;
}

interface EmployeeMetrics {
  feedbackCount: number;
  avgRating: number | null;
  npsInternal: number | null;
  insufficientData: boolean;
  pctPromoters?: number;
  pctDetractors?: number;
  message?: string;
  trend7d?: { npsInternal: number | null; feedbackCount: number };
}

interface DepartmentScorecard {
  departmentName: string;
  metrics: {
    feedbackCount: number;
    avgRating: number | null;
    npsInternal: number | null;
    insufficientData: boolean;
    openIncidents: number;
    closedIncidents: number;
    employeeRanking: EmployeeRanking[];
  };
  shifts: ShiftEntry[];
}

interface ScorecardDrillDownProps {
  departments: DepartmentOption[];
  initialDepartmentId?: string;
}

export function ScorecardDrillDown({
  departments,
  initialDepartmentId,
}: ScorecardDrillDownProps) {
  const [period, setPeriod] = useState<ScorecardPeriodPreset>("30d");
  const [departmentId, setDepartmentId] = useState(
    initialDepartmentId ?? departments[0]?.id ?? "",
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [departmentData, setDepartmentData] =
    useState<DepartmentScorecard | null>(null);
  const [employeeMetrics, setEmployeeMetrics] = useState<EmployeeMetrics | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartment = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    setError(null);
    setSelectedEmployeeId(null);
    setEmployeeMetrics(null);

    try {
      const res = await fetch(
        `/api/scorecards/department/${departmentId}?period=${period}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Error al cargar departamento");
      }
      const data = await res.json();
      setDepartmentData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setDepartmentData(null);
    } finally {
      setLoading(false);
    }
  }, [departmentId, period]);

  const loadEmployee = useCallback(
    async (staffMemberId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/scorecards/employee/${staffMemberId}?period=${period}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? "Error al cargar empleado");
        }
        const data = await res.json();
        setEmployeeMetrics(data.metrics as EmployeeMetrics);
        setSelectedEmployeeId(staffMemberId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        setLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    void loadDepartment();
  }, [loadDepartment]);

  if (!departments.length) {
    return (
      <p className="text-sm text-tagme-slate">
        No hay departamentos asignados para consultar scorecards.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PeriodSelector value={period} onChange={setPeriod} />
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-xl border border-tagme-slate/15 bg-white px-3 py-2 text-sm text-tagme-ink focus:border-tagme-gold/50 focus:outline-none"
        >
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading && !departmentData ? (
        <p className="text-sm text-tagme-slate">Cargando scorecards…</p>
      ) : null}

      {departmentData ? (
        <>
          <ScorecardCard
            title={departmentData.departmentName}
            subtitle="Roll-up departamento"
            metrics={{
              ...departmentData.metrics,
              openIncidents: departmentData.metrics.openIncidents,
            }}
          />

          <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-tagme-slate/70">
              Por turno
            </h3>
            <ul className="mt-4 space-y-2">
              {departmentData.shifts.map((shift) => (
                <li
                  key={shift.shiftId}
                  className="flex items-center justify-between rounded-xl bg-tagme-cream/40 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-tagme-ink">
                    {shift.shiftName}
                    {shift.shiftId === "unassigned" ? (
                      <span className="ml-2 text-xs text-tagme-gold">
                        (TR-07)
                      </span>
                    ) : null}
                  </span>
                  <span className="text-tagme-slate">
                    {shift.feedbackCount} op. ·{" "}
                    {shift.npsInternal !== null
                      ? `NPS ${shift.npsInternal}`
                      : "n<6"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-tagme-slate/10 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-tagme-slate/70">
              Ranking empleados
            </h3>
            <ul className="mt-4 divide-y divide-tagme-slate/8">
              {departmentData.metrics.employeeRanking.map((emp) => (
                <li key={emp.staffMemberId}>
                  <button
                    type="button"
                    onClick={() => void loadEmployee(emp.staffMemberId)}
                    className={[
                      "flex w-full items-center justify-between px-2 py-3 text-left text-sm transition-colors hover:bg-tagme-cream/50",
                      selectedEmployeeId === emp.staffMemberId
                        ? "bg-tagme-cream/60"
                        : "",
                    ].join(" ")}
                  >
                    <span className="font-medium text-tagme-ink">
                      {emp.displayName}
                    </span>
                    <span className="text-tagme-slate">
                      {emp.feedbackCount} op. ·{" "}
                      {emp.npsInternal !== null
                        ? `NPS ${emp.npsInternal}`
                        : "insuficiente"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selectedEmployeeId && employeeMetrics ? (
            <ScorecardCard
              title={
                departmentData.metrics.employeeRanking.find(
                  (e) => e.staffMemberId === selectedEmployeeId,
                )?.displayName ?? "Empleado"
              }
              subtitle="Drill-down empleado (solo staff_nfc)"
              metrics={employeeMetrics}
              showTrend
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
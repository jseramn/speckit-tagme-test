"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScorecardPeriodPreset } from "@/lib/scorecards/parse-period";
import { PeriodSelector } from "@/components/supervisor/PeriodSelector";
import { ScorecardCard } from "@/components/supervisor/ScorecardCard";

interface MyScorecardClientProps {
  staffMemberId: string;
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
  incidentCountLinked?: number;
}

export function MyScorecardClient({ staffMemberId }: MyScorecardClientProps) {
  const [period, setPeriod] = useState<ScorecardPeriodPreset>("30d");
  const [displayName, setDisplayName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [metrics, setMetrics] = useState<EmployeeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/scorecards/employee/${staffMemberId}?period=${period}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "No se pudo cargar su scorecard");
      }
      const data = await res.json();
      setDisplayName(data.displayName as string);
      setDepartmentName(data.departmentName as string);
      setMetrics(data.metrics as EmployeeMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [staffMemberId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !metrics) {
    return <p className="text-sm text-tagme-slate">Cargando…</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <PeriodSelector value={period} onChange={setPeriod} />
      <ScorecardCard
        title={displayName || "Mi desempeño"}
        subtitle={departmentName}
        metrics={metrics}
        showTrend
      />
    </div>
  );
}
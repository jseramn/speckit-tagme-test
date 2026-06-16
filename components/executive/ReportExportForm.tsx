"use client";

import { useState } from "react";

interface ReportExportFormProps {
  venueId: string;
  venueName: string;
}

export function ReportExportForm({ venueId, venueName }: ReportExportFormProps) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCsvExport() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        venueId,
        period,
        format: "csv",
      });
      const response = await fetch(`/api/executive/reports/export?${params}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Error al exportar CSV");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tagme-reporte-${venueName.toLowerCase().replace(/\s+/g, "-")}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handlePrintPdf() {
    const params = new URLSearchParams({ period });
    window.open(`/executive/reports/print?${params}`, "_blank", "noopener");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-tagme-slate/60">
          Período
        </span>
        <div className="inline-flex rounded-xl border border-tagme-slate/15 bg-white p-1">
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-tagme-cream text-tagme-ink"
                  : "text-tagme-slate hover:bg-tagme-cream/50",
              ].join(" ")}
            >
              {p === "7d" ? "Semanal (7d)" : "Mensual (30d)"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCsvExport}
          disabled={loading}
          className="rounded-xl bg-tagme-ink px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Generando…" : "Exportar CSV"}
        </button>
        <button
          type="button"
          onClick={handlePrintPdf}
          className="rounded-xl border border-tagme-slate/20 bg-white px-5 py-2.5 text-sm font-medium text-tagme-ink transition-colors hover:bg-tagme-cream/40"
        >
          Vista PDF (imprimir)
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-tagme-slate/60">
        El CSV incluye interacciones diarias, zonas top, destinos, AVEX, alertas y
        KPIs. La vista PDF usa el mismo resumen — guarde como PDF desde el
        diálogo de impresión del navegador.
      </p>
    </div>
  );
}
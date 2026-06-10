"use client";

import { useState } from "react";
import type { ExecutiveAlert } from "@/types/executive";

interface AlertActionsProps {
  alert: ExecutiveAlert;
  onUpdated: (alert: ExecutiveAlert) => void;
  compact?: boolean;
}

export function AlertActions({
  alert,
  onUpdated,
  compact = false,
}: AlertActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (alert.status === "dismissed") return null;

  async function runAction(
    action: "acknowledge" | "assign" | "dismiss",
  ) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/executive/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("action failed");
      const updated = (await res.json()) as ExecutiveAlert;
      onUpdated(updated);
    } catch {
      setError("No se pudo actualizar la alerta");
    } finally {
      setLoading(null);
    }
  }

  const btnClass = compact
    ? "rounded-lg px-2.5 py-1 text-[11px] font-medium"
    : "rounded-xl px-3 py-1.5 text-xs font-medium";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {alert.status === "active" && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void runAction("acknowledge")}
          className={`${btnClass} bg-tagme-cream text-tagme-ink transition-colors hover:bg-tagme-gold/20 disabled:opacity-50`}
        >
          {loading === "acknowledge" ? "…" : "Reconocer"}
        </button>
      )}
      {(alert.status === "active" || alert.status === "acknowledged") && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void runAction("assign")}
          className={`${btnClass} border border-tagme-slate/15 text-tagme-slate transition-colors hover:border-tagme-gold/40 hover:text-tagme-ink disabled:opacity-50`}
        >
          {loading === "assign" ? "…" : "Asignar"}
        </button>
      )}
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void runAction("dismiss")}
        className={`${btnClass} text-tagme-slate/60 transition-colors hover:text-tagme-ink disabled:opacity-50`}
      >
        {loading === "dismiss" ? "…" : "Descartar"}
      </button>
      {error && (
        <span className="text-[11px] text-red-600">{error}</span>
      )}
    </div>
  );
}
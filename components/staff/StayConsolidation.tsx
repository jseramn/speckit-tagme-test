"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface StayConsolidationProps {
  venueId: string;
}

interface LookupResult {
  stayId: string;
  stayType: "formal" | "ephemeral";
  status: string;
  startedAt: string;
  expiresAt: string;
  recordCounts: { feedbacks: number; incidents: number };
}

interface ConsolidateResult {
  formalStayId: string;
  consolidatedRecords: { feedbacks: number; incidents: number };
  ephemeralStatus: "consolidated";
}

export function StayConsolidation({ venueId }: StayConsolidationProps) {
  const [token, setToken] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [consolidated, setConsolidated] = useState<ConsolidateResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingConsolidate, setLoadingConsolidate] = useState(false);

  async function handleLookup() {
    if (!token.trim()) return;

    setLoadingLookup(true);
    setError(null);
    setConsolidated(null);

    try {
      const params = new URLSearchParams({
        stayToken: token.trim(),
        venueId,
      });
      const response = await fetch(
        `/api/reception/stays/lookup?${params.toString()}`,
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLookup(null);
        setError(payload.message ?? "Estadía no encontrada");
        return;
      }

      setLookup(payload as LookupResult);
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleConsolidate() {
    if (!token.trim()) return;

    setLoadingConsolidate(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reception/stays/consolidate?venueId=${encodeURIComponent(venueId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ephemeralStayToken: token.trim() }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "No se pudo consolidar la estadía");
        return;
      }

      setConsolidated(payload as ConsolidateResult);
      setLookup(null);
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setLoadingConsolidate(false);
    }
  }

  return (
    <section className="rounded-2xl border border-tagme-gold/25 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
        Walk-in → formal
      </p>
      <h2 className="mt-2 text-xl font-semibold text-tagme-ink">
        Consolidar estadía efímera
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-tagme-slate/80">
        Si el huésped ya envió feedback sin pasar por recepción, busque su token
        efímero y consolídelo en una estadía formal. Los registros se transfieren
        sin pérdida y queda trazabilidad en{" "}
        <code className="rounded bg-tagme-cream px-1.5 py-0.5 text-xs">
          consolidated_into
        </code>
        .
      </p>

      <div className="mt-4 space-y-3">
        <Input
          label="Token de estadía (cookie tagme_stay)"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Pegue el token del huésped"
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={handleLookup}
            loading={loadingLookup}
          >
            Buscar
          </Button>
          <Button onClick={handleConsolidate} loading={loadingConsolidate}>
            Crear formal y consolidar
          </Button>
          <Link
            href="/reception"
            className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-tagme-slate hover:bg-tagme-cream/80"
          >
            Volver a recepción
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {lookup ? (
        <div className="mt-4 rounded-xl border border-tagme-slate/15 bg-tagme-cream/40 p-4 text-sm">
          <p className="font-medium text-tagme-ink">Vista previa</p>
          <p className="mt-1 text-tagme-slate/80">
            Tipo: {lookup.stayType} · Estado: {lookup.status}
          </p>
          <p className="mt-1 text-tagme-slate/80">
            Feedbacks: {lookup.recordCounts.feedbacks} · Incidencias:{" "}
            {lookup.recordCounts.incidents}
          </p>
          <p className="mt-1 text-xs text-tagme-slate/70">
            Inicio: {new Date(lookup.startedAt).toLocaleString("es-CO")}
          </p>
        </div>
      ) : null}

      {consolidated ? (
        <div className="mt-4 rounded-xl border border-tagme-gold/20 bg-tagme-cream/50 p-4 text-sm">
          <p className="font-medium text-tagme-ink">Consolidación exitosa</p>
          <p className="mt-1 text-tagme-slate/80">
            Estadía formal:{" "}
            <span className="font-mono text-xs">{consolidated.formalStayId}</span>
          </p>
          <p className="mt-1 text-tagme-slate/80">
            Registros transferidos: {consolidated.consolidatedRecords.feedbacks}{" "}
            feedbacks, {consolidated.consolidatedRecords.incidents} incidencias
          </p>
        </div>
      ) : null}
    </section>
  );
}
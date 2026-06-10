"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface StayGeneratorProps {
  venueId: string;
  venueName: string;
}

interface FormalStayResult {
  stayId: string;
  stayToken: string;
  stayType: "formal";
  expiresAt: string;
  cookieSet: boolean;
}

export function StayGenerator({ venueId, venueName }: StayGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FormalStayResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reception/stays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "No se pudo generar la estadía");
        return;
      }

      setResult(payload as FormalStayResult);
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    if (!result) return;

    setClosing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reception/stays/${result.stayId}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "No se pudo cerrar la estadía");
        return;
      }

      setResult(null);
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-tagme-gold/25 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
        Check-in huésped
      </p>
      <h2 className="mt-2 text-xl font-semibold text-tagme-ink">
        Generar estadía formal
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-tagme-slate/80">
        Al generar la estadía, el navegador del huésped recibirá la cookie{" "}
        <code className="rounded bg-tagme-cream px-1.5 py-0.5 text-xs">
          tagme_stay
        </code>
        . Todos los feedbacks posteriores quedarán vinculados a la misma estadía
        en {venueName}.
      </p>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-tagme-slate/90">
        <li>Genere la estadía al hacer check-in.</li>
        <li>Entregue el dispositivo al huésped o comparta el mismo navegador.</li>
        <li>El huésped puede dar feedback vía tarjeta NFC del staff.</li>
        <li>Al checkout, cierre la estadía para finalizar la cookie.</li>
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleGenerate} loading={loading}>
          Generar estadía
        </Button>
        {result ? (
          <Button variant="secondary" onClick={handleClose} loading={closing}>
            Cerrar estadía (checkout)
          </Button>
        ) : null}
        <Link
          href="/reception/consolidate"
          className="inline-flex items-center rounded-xl border border-tagme-slate/20 bg-white px-4 py-2.5 text-sm font-medium text-tagme-ink transition hover:border-tagme-gold/50"
        >
          Consolidar walk-in
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-tagme-gold/20 bg-tagme-cream/50 p-4 text-sm">
          <p className="font-medium text-tagme-ink">Estadía activa</p>
          <p className="mt-1 text-tagme-slate/80">
            ID: <span className="font-mono text-xs">{result.stayId}</span>
          </p>
          <p className="mt-1 text-tagme-slate/80">
            Expira: {new Date(result.expiresAt).toLocaleString("es-CO")}
          </p>
          <p className="mt-2 text-xs text-tagme-slate/70">
            Cookie establecida en este navegador. Verifique en DevTools →
            Application → Cookies.
          </p>
        </div>
      ) : null}
    </section>
  );
}
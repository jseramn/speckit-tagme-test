"use client";

import { useCallback, useEffect, useState } from "react";
import { ZoneActivityBar } from "@/components/charts/ZoneActivityBar";
import type { PulseResponse } from "@/types/executive";

const POLL_INTERVAL_MS = 30_000;

export interface PulsePanelProps {
  venueId: string;
  initialData?: PulseResponse | null;
}

export function PulsePanel({ venueId, initialData }: PulsePanelProps) {
  const [data, setData] = useState<PulseResponse | null>(initialData ?? null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(
    initialData ? new Date(initialData.fetchedAt) : null,
  );
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [degraded, setDegraded] = useState(false);
  const [loading, setLoading] = useState(!initialData);

  const fetchPulse = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/executive/pulse?venueId=${encodeURIComponent(venueId)}&windowMin=30`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("pulse fetch failed");
      const json = (await res.json()) as PulseResponse;
      setData(json);
      setFetchedAt(new Date(json.fetchedAt));
      setDegraded(false);
    } catch {
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (!initialData) void fetchPulse();
    const poll = setInterval(() => void fetchPulse(), POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [fetchPulse, initialData]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (!fetchedAt) return;
      setSecondsAgo(
        Math.max(0, Math.floor((Date.now() - fetchedAt.getTime()) / 1000)),
      );
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchedAt]);

  return (
    <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
            Pulso — últimos 30 min
          </h2>
          <p className="mt-1 text-xs text-tagme-slate/60">
            Actualizado hace {secondsAgo} s
          </p>
        </div>
        {degraded && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
            Datos en caché — reconectando
          </span>
        )}
      </div>

      {loading && !data ? (
        <p className="py-8 text-center text-sm text-tagme-slate/60">
          Cargando pulso…
        </p>
      ) : (
        <>
          <ZoneActivityBar zones={data?.zones ?? []} />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PulseStat
              label="Sesiones AVEX"
              value={data?.avex.recentSessions ?? 0}
            />
            <PulseStat
              label="Derivación AVEX"
              value={`${data?.avex.derivationPct ?? 0}%`}
            />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-tagme-slate/50">
                Temas frecuentes
              </p>
              <p className="mt-1 text-sm text-tagme-ink">
                {(data?.avex.topTopics ?? []).join(" · ") || "—"}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function PulseStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-tagme-slate/50">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-tagme-ink">
        {value}
      </p>
    </div>
  );
}
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const ZONE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  operations: [
    { value: "", label: "Todas las zonas" },
    { value: "lobby", label: "Lobby" },
    { value: "room", label: "Habitación" },
    { value: "other", label: "Otro" },
  ],
  fnb: [
    { value: "", label: "Todas las zonas" },
    { value: "restaurant", label: "Restaurante" },
    { value: "bar", label: "Bar" },
  ],
  experience: [
    { value: "", label: "Todas las zonas" },
    { value: "lobby", label: "Lobby" },
    { value: "restaurant", label: "Restaurante" },
    { value: "bar", label: "Bar" },
    { value: "other", label: "Otro" },
  ],
  front_office: [
    { value: "", label: "Todas las zonas" },
    { value: "lobby", label: "Lobby" },
  ],
};

export interface ExecutiveFiltersProps {
  defaultPeriod?: "7d" | "30d";
  scope?: "operations" | "fnb" | "experience" | "front_office";
  tags?: Array<{ tagId: string; label: string }>;
}

export function ExecutiveFilters({
  defaultPeriod = "7d",
  scope,
  tags = [],
}: ExecutiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as "7d" | "30d") ?? defaultPeriod;
  const zone = searchParams.get("zone") ?? "";
  const tagId = searchParams.get("tagId") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  function setPeriod(next: "7d" | "30d") {
    updateParam("period", next);
  }

  const zoneOptions = scope ? (ZONE_OPTIONS[scope] ?? []) : [];

  return (
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
            {p === "7d" ? "7 días" : "30 días"}
          </button>
        ))}
      </div>

      {scope && zoneOptions.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-tagme-slate/70">
          Zona
          <select
            value={zone}
            onChange={(e) => updateParam("zone", e.target.value)}
            className="rounded-lg border border-tagme-slate/15 bg-white px-2 py-1.5 text-xs text-tagme-ink"
          >
            {zoneOptions.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {scope && tags.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-tagme-slate/70">
          Tag
          <select
            value={tagId}
            onChange={(e) => updateParam("tagId", e.target.value)}
            className="max-w-[12rem] rounded-lg border border-tagme-slate/15 bg-white px-2 py-1.5 text-xs text-tagme-ink"
          >
            <option value="">Todos los tags</option>
            {tags.map((t) => (
              <option key={t.tagId} value={t.tagId}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
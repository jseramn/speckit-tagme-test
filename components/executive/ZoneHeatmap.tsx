"use client";

import type { ZoneHourlyCell } from "@/types/executive";

const ZONE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  room: "Habitación",
  restaurant: "Restaurante",
  bar: "Bar",
  other: "Otro",
};

export interface ZoneHeatmapProps {
  cells: ZoneHourlyCell[];
}

function intensityClass(touches: number, max: number): string {
  if (touches === 0 || max === 0) return "bg-tagme-cream/40";
  const ratio = touches / max;
  if (ratio >= 0.75) return "bg-tagme-ink text-white";
  if (ratio >= 0.5) return "bg-tagme-slate/70 text-white";
  if (ratio >= 0.25) return "bg-tagme-gold/60 text-tagme-ink";
  return "bg-tagme-gold/25 text-tagme-ink";
}

export function ZoneHeatmap({ cells }: ZoneHeatmapProps) {
  if (cells.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-tagme-slate/60">
        Sin actividad horaria en el período
      </p>
    );
  }

  const zones = [...new Set(cells.map((c) => c.zone))];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxTouches = Math.max(...cells.map((c) => c.touches), 1);

  const lookup = new Map<string, number>();
  for (const cell of cells) {
    lookup.set(`${cell.zone}:${cell.hour}`, cell.touches);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-2 py-2 text-left font-medium text-tagme-slate/60">
              Zona
            </th>
            {hours.map((h) => (
              <th
                key={h}
                className="px-1 py-2 text-center font-normal text-tagme-slate/50"
              >
                {h.toString().padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone}>
              <td className="sticky left-0 bg-white px-2 py-1.5 font-medium text-tagme-ink">
                {ZONE_LABELS[zone] ?? zone}
              </td>
              {hours.map((hour) => {
                const touches = lookup.get(`${zone}:${hour}`) ?? 0;
                return (
                  <td key={hour} className="p-0.5">
                    <div
                      className={[
                        "flex h-7 min-w-[1.75rem] items-center justify-center rounded-md tabular-nums",
                        intensityClass(touches, maxTouches),
                      ].join(" ")}
                      title={`${ZONE_LABELS[zone] ?? zone} ${hour}:00 — ${touches} toques`}
                    >
                      {touches > 0 ? touches : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
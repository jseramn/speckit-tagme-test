"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PulseZoneActivity } from "@/types/executive";

const ZONE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  room: "Habitación",
  restaurant: "Restaurante",
  bar: "Bar",
  other: "Otro",
};

export interface ZoneActivityBarProps {
  zones: PulseZoneActivity[];
}

export function ZoneActivityBar({ zones }: ZoneActivityBarProps) {
  if (zones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-tagme-slate/60">
        Sin actividad en la ventana seleccionada
      </p>
    );
  }

  const chartData = zones.map((z) => ({
    ...z,
    label: ZONE_LABELS[z.zone] ?? z.zone,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e8e4dc"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e8e4dc",
            }}
            formatter={(value, _name, props) => {
              const delta = (props?.payload as PulseZoneActivity)?.deltaPct;
              const deltaLabel =
                delta != null ? ` (${delta > 0 ? "+" : ""}${delta}% vs. ventana anterior)` : "";
              return [`${value ?? 0} toques${deltaLabel}`, "Actividad"];
            }}
          />
          <Bar dataKey="touches" fill="#c9a962" radius={[0, 6, 6, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
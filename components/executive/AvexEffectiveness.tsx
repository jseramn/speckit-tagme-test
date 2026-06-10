"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DepartmentDashboardResponse } from "@/types/executive";

export interface AvexEffectivenessProps {
  rows: DepartmentDashboardResponse["avexEffectiveness"];
  topTopics: string[];
}

export function AvexEffectiveness({ rows, topTopics }: AvexEffectivenessProps) {
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  const totalEscalated = rows.reduce((s, r) => s + r.escalated, 0);
  const derivationPct =
    totalSessions > 0
      ? Math.round((totalEscalated / totalSessions) * 1000) / 10
      : 0;

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-tagme-slate/60">
        Sin sesiones AVEX en el período
      </p>
    );
  }

  const chartData = rows.map((r) => ({
    day: r.day.slice(5),
    sessions: r.sessions,
    derivationPct: r.derivation_pct,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Sesiones totales" value={totalSessions} />
        <Stat label="Derivación período" value={`${derivationPct}%`} />
        <div>
          <p className="text-[10px] uppercase tracking-widest text-tagme-slate/50">
            Top temas derivación
          </p>
          <p className="mt-1 text-sm text-tagme-ink">
            {topTopics.length > 0 ? topTopics.join(" · ") : "—"}
          </p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              allowDecimals={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e8e4dc",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sessions"
              name="Sesiones"
              stroke="#2d3748"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="derivationPct"
              name="Derivación %"
              stroke="#c9a962"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
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
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

export interface PeakHoursChartProps {
  data: { hour: number; count: number }[];
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-tagme-slate/60">
        Sin datos de horas pico
      </p>
    );
  }

  const chartData = [...data]
    .sort((a, b) => a.hour - b.hour)
    .map((item) => ({
      ...item,
      label: formatHour(item.hour),
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e8e4dc",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            formatter={(value) => [value ?? 0, "Toques"]}
          />
          <Bar dataKey="count" fill="#2d3748" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
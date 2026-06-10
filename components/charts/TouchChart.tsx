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

export interface TouchChartProps {
  data: { date: string; count: number }[];
}

function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

export function TouchChart({ data }: TouchChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-tagme-slate/60">
        Sin toques en el período seleccionado
      </p>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatDateLabel(item.date),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
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
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as { date?: string } | undefined;
              return item?.date ?? "";
            }}
          />
          <Bar dataKey="count" fill="#c9a962" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
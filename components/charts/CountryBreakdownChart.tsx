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

export interface CountryBreakdownChartProps {
  data: { countryCode: string; count: number }[];
}

export function CountryBreakdownChart({ data }: CountryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-tagme-slate/60">
        Sin datos de origen geográfico en el período
      </p>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data.map((item) => {
    const percentage =
      total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0;
    return {
      ...item,
      percentage,
      label: item.countryCode === "XX" ? "Desconocido" : item.countryCode,
    };
  });

  return (
    <div className="space-y-6">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={48}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e8e4dc",
              }}
              formatter={(value, _name, props) => {
                const pct =
                  (props?.payload as { percentage?: number })?.percentage ?? 0;
                return [`${value ?? 0} (${pct}%)`, "Toques"];
              }}
            />
            <Bar dataKey="count" fill="#2d3748" radius={[0, 6, 6, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="divide-y divide-tagme-slate/10 rounded-xl border border-tagme-slate/10">
        {chartData.map((item) => (
          <li
            key={item.countryCode}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="text-tagme-slate">{item.label}</span>
            <span className="font-medium text-tagme-ink">
              {item.count}{" "}
              <span className="text-tagme-slate/60">({item.percentage}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
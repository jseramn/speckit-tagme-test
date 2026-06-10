"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#c9a962", "#2d3748", "#8b9aab", "#d4b896", "#5c6b7a", "#e8c97a"];

const TYPE_LABELS: Record<string, string> = {
  menu: "Menú",
  external: "Externo",
  reservation_link: "Reservas",
  info: "Información",
  social: "Redes",
  avex: "AVEX",
};

export interface DestinationBreakdownProps {
  data: { type: string; count: number; percentage: number }[];
}

export function DestinationBreakdown({ data }: DestinationBreakdownProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-tagme-slate/60">
        Sin visitas a destinos en el período
      </p>
    );
  }

  const chartData = data.map((item) => ({
    name: TYPE_LABELS[item.type] ?? item.type,
    value: item.count,
    percentage: item.percentage,
    type: item.type,
  }));

  return (
    <div className="space-y-6">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.type} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e8e4dc",
              }}
              formatter={(value, _name, props) => {
                const pct = (props?.payload as { percentage?: number })?.percentage ?? 0;
                return [`${value ?? 0} (${pct}%)`, "Visitas"];
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs text-tagme-slate">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="divide-y divide-tagme-slate/10 rounded-xl border border-tagme-slate/10">
        {data.map((item) => (
          <li
            key={item.type}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="text-tagme-slate">
              {TYPE_LABELS[item.type] ?? item.type}
            </span>
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
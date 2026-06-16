import type { DepartmentSummary } from "@/types/executive";

export interface DepartmentSummaryRowProps {
  summaries: DepartmentSummary[];
}

export function DepartmentSummaryRow({ summaries }: DepartmentSummaryRowProps) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-tagme-slate/70">
        Resumen por área
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaries.map((dept) => (
          <article
            key={dept.scope}
            className="rounded-2xl border border-tagme-slate/10 bg-white px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-tagme-gold">
              {dept.label}
            </p>
            <p className="mt-2 text-sm text-tagme-ink">
              {dept.primaryKpi.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-tagme-ink">
              {formatDeptValue(dept.primaryKpi.value, dept.primaryKpi.key)}
            </p>
            {dept.primaryKpi.onTarget != null && (
              <p
                className={[
                  "mt-2 text-[10px] font-medium uppercase tracking-wide",
                  dept.primaryKpi.onTarget
                    ? "text-emerald-600"
                    : "text-amber-600",
                ].join(" ")}
              >
                {dept.primaryKpi.onTarget ? "En meta" : "Revisar"}
              </p>
            )}
            {dept.primaryKpi.suggestedAction && !dept.primaryKpi.onTarget && (
              <p className="mt-2 text-[11px] text-tagme-slate/80 line-clamp-2">
                {dept.primaryKpi.suggestedAction}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDeptValue(value: number, key: string): string {
  if (key.includes("rate") || key.includes("pct")) return `${value}%`;
  return value.toFixed(1);
}
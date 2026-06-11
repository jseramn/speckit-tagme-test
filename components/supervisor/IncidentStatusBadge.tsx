import type { IncidentStatus } from "@/types/staff";

const STATUS_LABELS: Record<IncidentStatus, string> = {
  abierta: "Abierta",
  en_progreso: "En progreso",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  abierta: "bg-red-100 text-red-800 border-red-200",
  en_progreso: "bg-amber-100 text-amber-900 border-amber-200",
  resuelta: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cerrada: "bg-tagme-slate/10 text-tagme-slate border-tagme-slate/15",
};

export interface IncidentStatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export function IncidentStatusBadge({
  status,
  className = "",
}: IncidentStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
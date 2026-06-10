import type { AlertSeverity } from "@/types/executive";
import type { DbAlertSeverity, DbAlertType } from "./types";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  attention: 1,
  critical: 2,
};

const DB_SEVERITY_RANK: Record<DbAlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

/** Truncate timestamp to dedup bucket (default 4 h per CL-02). */
export function computeWindowStart(now: Date, dedupHours: number): Date {
  const bucketMs = dedupHours * 60 * 60 * 1000;
  return new Date(Math.floor(now.getTime() / bucketMs) * bucketMs);
}

export function buildDedupKey(
  venueId: string,
  alertType: DbAlertType,
  entityRef: string | null,
  windowStart: Date,
): string {
  return `${venueId}:${alertType}:${entityRef ?? ""}:${windowStart.toISOString()}`;
}

export function apiSeverityToDb(severity: AlertSeverity): DbAlertSeverity {
  return severity === "critical" ? "critical" : "warning";
}

export function dbSeverityToApi(severity: DbAlertSeverity): AlertSeverity {
  return severity === "critical" ? "critical" : "attention";
}

/** Allow re-alert in same window when severity escalates (CL-02 dedup exception). */
export function shouldEscalate(
  existing: DbAlertSeverity,
  incoming: AlertSeverity,
): boolean {
  return (
    SEVERITY_RANK[incoming] > DB_SEVERITY_RANK[existing]
  );
}
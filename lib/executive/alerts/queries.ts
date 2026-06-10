import { createInsforgeServerClient } from "@/lib/insforge-server";
import { resolveAuditUserId } from "@/lib/executive/audit";
import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  ExecutiveAlert,
  ExecutiveLayer,
  ExecutiveScope,
} from "@/types/executive";
import { dbSeverityToApi } from "./dedup";
import type { DbAlertType, PersistedAlertRow } from "./types";

const LAYER_BY_TYPE: Record<AlertType, ExecutiveLayer> = {
  activity_drop: "pulse",
  tag_inactive: "pulse",
  avex_derivation: "pulse",
  system_health: "pulse",
};

function mapDbTypeToApi(dbType: DbAlertType): AlertType {
  if (dbType === "tag_disabled") return "tag_inactive";
  return dbType as AlertType;
}

export function mapRowToExecutiveAlert(row: PersistedAlertRow): ExecutiveAlert {
  const apiType = mapDbTypeToApi(row.alert_type);
  return {
    id: row.id,
    venueId: row.venue_id,
    type: apiType,
    severity: dbSeverityToApi(row.severity),
    status: row.status as AlertStatus,
    department: row.department as ExecutiveScope | null,
    entityRef: row.entity_ref,
    message: row.message,
    suggestedAction: row.suggested_action,
    layer: LAYER_BY_TYPE[apiType],
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
  };
}

export interface ListAlertsOptions {
  venueId: string;
  status?: AlertStatus | AlertStatus[];
  severity?: AlertSeverity;
  department?: ExecutiveScope;
  limit?: number;
}

export async function getAlertById(
  alertId: string,
): Promise<ExecutiveAlert | null> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("executive_alerts")
    .select(
      "id, venue_id, alert_type, severity, status, department, entity_ref, message, suggested_action, created_at, acknowledged_at",
    )
    .eq("id", alertId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRowToExecutiveAlert(data as PersistedAlertRow);
}

export async function listExecutiveAlerts(
  options: ListAlertsOptions,
): Promise<ExecutiveAlert[]> {
  const insforge = createInsforgeServerClient();
  let query = insforge.database
    .from("executive_alerts")
    .select(
      "id, venue_id, alert_type, severity, status, department, entity_ref, message, suggested_action, created_at, acknowledged_at",
    )
    .eq("venue_id", options.venueId)
    .order("created_at", { ascending: false });

  if (options.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query = query.in("status", statuses);
  }

  if (options.severity) {
    const dbSeverity =
      options.severity === "critical" ? "critical" : "warning";
    query = query.eq("severity", dbSeverity);
  }

  if (options.department) {
    query = query.eq("department", options.department);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as PersistedAlertRow[]).map(mapRowToExecutiveAlert);
}

export async function getAlertsSummary(
  venueId: string,
): Promise<{ critical: number; attention: number }> {
  const active = await listExecutiveAlerts({
    venueId,
    status: "active",
  });

  return active.reduce(
    (acc, alert) => {
      if (alert.severity === "critical") acc.critical += 1;
      else acc.attention += 1;
      return acc;
    },
    { critical: 0, attention: 0 },
  );
}

export async function getTopAlerts(
  venueId: string,
  limit = 5,
): Promise<ExecutiveAlert[]> {
  const active = await listExecutiveAlerts({
    venueId,
    status: ["active", "acknowledged", "assigned"],
    limit: limit * 2,
  });

  const rank = (a: ExecutiveAlert) =>
    (a.severity === "critical" ? 2 : 1) * 10 +
    (a.status === "active" ? 1 : 0);

  return [...active]
    .sort((a, b) => rank(b) - rank(a) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function countAlertsByDepartment(
  venueId: string,
): Promise<Record<ExecutiveScope, number>> {
  const active = await listExecutiveAlerts({
    venueId,
    status: ["active", "acknowledged", "assigned"],
  });

  const counts: Record<ExecutiveScope, number> = {
    operations: 0,
    fnb: 0,
    experience: 0,
    front_office: 0,
  };

  for (const alert of active) {
    if (alert.department && alert.department in counts) {
      counts[alert.department] += 1;
    }
  }

  return counts;
}

export type AlertAction = "acknowledge" | "assign" | "dismiss";

export async function applyAlertAction(
  alertId: string,
  action: AlertAction,
  userId: string,
  assignTo?: string,
): Promise<ExecutiveAlert> {
  const insforge = createInsforgeServerClient();
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await insforge.database
    .from("executive_alerts")
    .select(
      "id, venue_id, alert_type, severity, status, department, entity_ref, message, suggested_action, created_at, acknowledged_at",
    )
    .eq("id", alertId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("ALERT_NOT_FOUND");

  const updates: Record<string, unknown> = { updated_at: now };

  if (action === "acknowledge") {
    updates.status = "acknowledged";
    updates.acknowledged_by = userId;
    updates.acknowledged_at = now;
  } else if (action === "assign") {
    updates.status = "assigned";
    updates.assigned_to = assignTo ?? userId;
    updates.assigned_at = now;
  } else if (action === "dismiss") {
    updates.status = "dismissed";
    updates.dismissed_at = now;
  }

  const { data: updated, error } = await insforge.database
    .from("executive_alerts")
    .update(updates)
    .eq("id", alertId)
    .select(
      "id, venue_id, alert_type, severity, status, department, entity_ref, message, suggested_action, created_at, acknowledged_at",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) throw new Error("ALERT_UPDATE_FAILED");

  const auditAction =
    action === "acknowledge"
      ? "acknowledge_alert"
      : action === "assign"
        ? "assign_alert"
        : "dismiss_alert";

  await insforge.database.from("executive_audit_log").insert([
    {
      user_id: resolveAuditUserId(userId),
      venue_id: existing.venue_id,
      action: auditAction,
      resource_type: "executive_alert",
      resource_id: alertId,
      metadata: { action, assignTo: assignTo ?? null },
    },
  ]);

  return mapRowToExecutiveAlert(updated as PersistedAlertRow);
}
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { logConfigChange } from "@/lib/executive/audit";
import { loadTargets } from "@/lib/executive/kpis";
import type {
  AlertThreshold,
  AlertType,
  KpiComparison,
  KpiTarget,
} from "@/types/executive";

interface AlertThresholdRow {
  id: string;
  venue_id: string;
  alert_type: string;
  department: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

export const THRESHOLD_LABELS: Record<string, string> = {
  activity_drop: "Caída abrupta de actividad (CL-02)",
  tag_inactive: "Tag inactivo (CL-03)",
  avex_derivation: "Derivaciones AVEX (CL-04)",
};

export const KPI_LABELS: Record<string, string> = {
  total_interactions: "Interacciones totales",
  avex_resolution_rate: "Tasa resolución AVEX",
  avex_derivation_rate: "Tasa derivación AVEX",
  avex_sessions_per_day: "Sesiones AVEX / día",
  nfc_direct_rate: "Acceso NFC directo",
  abandonment_rate: "Tasa abandono",
  menu_visit_pct: "% visitas menú (F&B)",
  destinations_per_touch: "Destinos por toque",
  alert_action_rate: "Alertas con acción <24 h",
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  executive: "Ejecutivo",
  front_office: "Recepción",
  operations: "Operaciones",
  fnb: "F&B",
  experience: "Experiencia",
  transversal: "Transversal",
};

function mapThresholdRow(row: AlertThresholdRow): AlertThreshold {
  return {
    id: row.id,
    venueId: row.venue_id,
    alertType: row.alert_type as AlertType,
    department: row.department as AlertThreshold["department"],
    config: row.config,
    isActive: row.is_active,
  };
}

export async function loadAlertThresholds(
  venueId: string,
): Promise<AlertThreshold[]> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("alert_thresholds")
    .select("id, venue_id, alert_type, department, config, is_active")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("alert_type");

  if (error) throw new Error(error.message);
  return ((data ?? []) as AlertThresholdRow[]).map(mapThresholdRow);
}

export async function updateAlertThreshold(
  venueId: string,
  thresholdId: string,
  userId: string,
  config: Record<string, unknown>,
  isActive?: boolean,
): Promise<AlertThreshold> {
  const insforge = createInsforgeServerClient();

  const { data: existing, error: lookupError } = await insforge.database
    .from("alert_thresholds")
    .select("id, venue_id, alert_type, department, config, is_active")
    .eq("id", thresholdId)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("THRESHOLD_NOT_FOUND");

  const payload: Record<string, unknown> = { config };
  if (isActive !== undefined) payload.is_active = isActive;

  const { data: updated, error } = await insforge.database
    .from("alert_thresholds")
    .update(payload)
    .eq("id", thresholdId)
    .select("id, venue_id, alert_type, department, config, is_active")
    .single();

  if (error) throw new Error(error.message);

  await logConfigChange({
    userId,
    venueId,
    action: "update_threshold",
    resourceId: thresholdId,
    metadata: {
      alertType: existing.alert_type,
      department: existing.department,
      previousConfig: existing.config,
      newConfig: config,
    },
  });

  return mapThresholdRow(updated as AlertThresholdRow);
}

export async function loadKpiTargets(venueId: string): Promise<KpiTarget[]> {
  return loadTargets(venueId);
}

export async function updateKpiTarget(
  venueId: string,
  targetId: string,
  userId: string,
  targetValue: number,
  comparison?: KpiComparison,
): Promise<KpiTarget> {
  const insforge = createInsforgeServerClient();

  const { data: existing, error: lookupError } = await insforge.database
    .from("kpi_targets")
    .select("id, venue_id, department, kpi_key, period, target_value, comparison")
    .eq("id", targetId)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("KPI_TARGET_NOT_FOUND");

  const payload: Record<string, unknown> = { target_value: targetValue };
  if (comparison) payload.comparison = comparison;

  const { data: updated, error } = await insforge.database
    .from("kpi_targets")
    .update(payload)
    .eq("id", targetId)
    .select("id, venue_id, department, kpi_key, period, target_value, comparison")
    .single();

  if (error) throw new Error(error.message);

  await logConfigChange({
    userId,
    venueId,
    action: "update_kpi_target",
    resourceId: targetId,
    metadata: {
      kpiKey: existing.kpi_key,
      department: existing.department,
      period: existing.period,
      previousValue: existing.target_value,
      newValue: targetValue,
      comparison: comparison ?? existing.comparison,
    },
  });

  const row = updated as {
    id: string;
    venue_id: string;
    department: string;
    kpi_key: string;
    period: string;
    target_value: number;
    comparison: string;
  };

  return {
    id: row.id,
    venueId: row.venue_id,
    department: row.department as KpiTarget["department"],
    kpiKey: row.kpi_key,
    period: row.period as KpiTarget["period"],
    targetValue: Number(row.target_value),
    comparison: row.comparison as KpiComparison,
  };
}
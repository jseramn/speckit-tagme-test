import type {
  ActivityDropThresholdConfig,
  AlertSeverity,
  AlertType,
  AvexDerivationThresholdConfig,
  ExecutiveScope,
  TagInactiveThresholdConfig,
} from "@/types/executive";

export type DbAlertSeverity = "info" | "warning" | "critical";

export type DbAlertType =
  | "activity_drop"
  | "tag_inactive"
  | "tag_disabled"
  | "avex_derivation"
  | "system_health";

export interface AlertCandidate {
  dbAlertType: DbAlertType;
  apiAlertType: AlertType;
  severity: AlertSeverity;
  department: ExecutiveScope | null;
  entityRef: string | null;
  message: string;
  suggestedAction: string | null;
  requiresBaseline: boolean;
}

export interface ThresholdBundle {
  activityDrop: ActivityDropThresholdConfig | null;
  tagInactive: TagInactiveThresholdConfig | null;
  avexDerivation: AvexDerivationThresholdConfig | null;
}

export interface TagRow {
  id: string;
  slug: string;
  label: string;
  zone: string;
  is_active: boolean;
  created_at: string;
}

export interface PersistedAlertRow {
  id: string;
  venue_id: string;
  alert_type: DbAlertType;
  severity: DbAlertSeverity;
  status: string;
  department: string | null;
  entity_ref: string | null;
  message: string;
  suggested_action: string | null;
  created_at: string;
  acknowledged_at: string | null;
}
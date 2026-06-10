/**
 * Executive visibility layer types — aligned to lib/validators/executive.ts
 * Spec: specs/002-clevel/spec.md (capas 1–4, CL-02/03/04, CL-08, CL-13)
 */

/** Capa 1 — Pulso operacional (real-time). */
export type ExecutiveLayerPulse = "pulse";

/** Capa 2 — Rendimiento operativo (today / this week). */
export type ExecutiveLayerPerformance = "performance";

/** Capa 3 — Experiencia del huésped (quality). */
export type ExecutiveLayerExperience = "experience";

/** Capa 4 — Valor ejecutivo / ROI. */
export type ExecutiveLayerRoi = "roi";

/** Cuatro capas de visibilidad gerencial. */
export type ExecutiveLayer =
  | ExecutiveLayerPulse
  | ExecutiveLayerPerformance
  | ExecutiveLayerExperience
  | ExecutiveLayerRoi;

export type AlertSeverity = "attention" | "critical";

export type AlertStatus =
  | "active"
  | "acknowledged"
  | "assigned"
  | "dismissed";

export type AlertType =
  | "activity_drop"
  | "tag_inactive"
  | "avex_derivation"
  | "system_health";

export type ExecutiveScope =
  | "operations"
  | "fnb"
  | "experience"
  | "front_office";

export type ExecutiveRole = "executive" | "manager" | "department_head";

export type KpiPeriod = "weekly" | "monthly";

export type KpiComparison = "gte" | "lte";

export type KpiDepartment =
  | "executive"
  | "front_office"
  | "operations"
  | "fnb"
  | "experience"
  | "transversal";

export interface OperatingHours {
  start: string;
  end: string;
  timezone: string;
}

export interface ActivityDropThresholdConfig {
  attention_drop_pct: number;
  critical_drop_pct: number;
  min_delta_touches_attention: number;
  min_delta_touches_critical: number;
  evaluation_window_min: number;
  dedup_window_hours: number;
  operating_hours: OperatingHours;
}

export interface TagInactiveThresholdConfig {
  inactive_hours: number;
  min_venue_touches_per_day: number;
  grace_hours: number;
  operating_hours: OperatingHours;
}

export interface AvexDerivationThresholdConfig {
  attention_pct: number;
  critical_pct: number;
  window_hours: number;
  min_sessions_attention: number;
  min_sessions_critical: number;
  dedup_window_hours: number;
}

export type AlertThresholdConfig =
  | ActivityDropThresholdConfig
  | TagInactiveThresholdConfig
  | AvexDerivationThresholdConfig
  | Record<string, unknown>;

export interface AlertThreshold {
  id: string;
  venueId: string;
  alertType: AlertType;
  department: ExecutiveScope | null;
  config: AlertThresholdConfig;
  isActive: boolean;
}

export interface KpiTarget {
  id: string;
  venueId: string;
  department: KpiDepartment;
  kpiKey: string;
  period: KpiPeriod;
  targetValue: number;
  comparison: KpiComparison;
}

export interface ExecutiveAlert {
  id: string;
  venueId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  department: ExecutiveScope | null;
  entityRef: string | null;
  message: string;
  suggestedAction: string | null;
  layer: ExecutiveLayer;
  createdAt: string;
  acknowledgedAt?: string | null;
}

export interface ExecutiveQueryParams {
  venueId: string;
  from?: string;
  to?: string;
}

export interface ExecutiveMeResponse {
  userId: string;
  role: ExecutiveRole;
  executiveScope: ExecutiveScope | null;
  venueId: string;
  venueName: string;
  venueSlug: string;
  displayName: string;
  baselineReady: boolean;
  baselineDay: number | null;
  totalTouches: number;
  firstTouchAt: string | null;
}

export interface PulseZoneActivity {
  zone: string;
  touches: number;
  deltaPct?: number | null;
}

export interface PulseTagActivity {
  tagId: string;
  slug: string;
  label: string;
  zone: string;
  touches: number;
}

export interface PulseAvexSummary {
  recentSessions: number;
  derivationPct: number;
  topTopics: string[];
}

export interface PulseAlertsSummary {
  critical: number;
  attention: number;
}

export interface PulseResponse {
  venueId: string;
  windowMin: number;
  fetchedAt: string;
  layer: ExecutiveLayerPulse;
  zones: PulseZoneActivity[];
  tags: PulseTagActivity[];
  avex: PulseAvexSummary;
  alertsSummary: PulseAlertsSummary;
}

export interface BaselineStatus {
  ready: boolean;
  day: number;
  totalTouches: number;
  firstTouchAt: string | null;
}

export interface KpiCard {
  key: string;
  label: string;
  definition: string;
  layer: ExecutiveLayer;
  department: KpiDepartment;
  value: number;
  target: number | null;
  comparison: KpiComparison | null;
  deltaPct: number | null;
  onTarget: boolean | null;
  suggestedAction: string | null;
}

export interface TrendPoint {
  day: string;
  touches: number;
}

export interface RoiSummary {
  staffMinutesSaved: number;
  selfServiceMinutes: number;
  totalMinutes: number;
  deltaPct: number | null;
  label: "Estimado operativo";
}

export interface DepartmentSummary {
  scope: ExecutiveScope;
  label: string;
  primaryKpi: KpiCard;
  alertCount: number;
}

export interface OverviewResponse {
  venueId: string;
  period: "7d" | "30d";
  fetchedAt: string;
  baselineStatus: BaselineStatus;
  kpis: KpiCard[];
  trend: TrendPoint[];
  roi: RoiSummary;
  departmentSummaries: DepartmentSummary[];
  topAlerts: ExecutiveAlert[];
}

export interface ZoneHourlyCell {
  zone: string;
  hour: number;
  touches: number;
}

export interface TagRankingRow {
  tagId: string;
  slug: string;
  label: string;
  zone: string;
  roomNumber: string | null;
  touches: number;
}

/** Room-level AVEX anomaly — operational identifier only, no guest PII. */
export interface AtypicalRoom {
  roomNumber: string;
  label: string;
  sessionCount: number;
  venueAvg: number;
  multiplier: number;
  tagId: string | null;
}

export interface BreakdownRow {
  type: string;
  count: number;
  percentage: number;
}

export interface CountryBreakdownRow {
  countryCode: string;
  count: number;
}

export interface PeakHourRow {
  hour: number;
  count: number;
}

/** Δ engagement 7d post vs. 7d previo a `experience_configs.updated_at`. */
export interface ContentImpactSummary {
  configTitle: string;
  updatedAt: string;
  postTouches: number;
  priorTouches: number;
  postDestinations: number;
  priorDestinations: number;
  touchesDeltaPct: number | null;
  destinationsDeltaPct: number | null;
  windowDays: number;
}

export interface DepartmentDashboardResponse {
  scope: ExecutiveScope;
  label: string;
  period: "7d" | "30d";
  fetchedAt: string;
  baselineStatus: BaselineStatus;
  kpis: KpiCard[];
  zoneHeatmap: ZoneHourlyCell[];
  tagRanking: TagRankingRow[];
  atypicalRooms: AtypicalRoom[];
  nfcFriction: Array<{ channel: string; count: number; pct: number }>;
  avexEffectiveness: Array<{
    day: string;
    sessions: number;
    resolved: number;
    escalated: number;
    derivation_pct: number;
  }>;
  topDerivationTopics: string[];
  topAlerts: ExecutiveAlert[];
  peakHours: PeakHourRow[];
  destinationBreakdown: BreakdownRow[];
  deviceBreakdown: BreakdownRow[];
  countryBreakdown: CountryBreakdownRow[];
  contentImpact: ContentImpactSummary | null;
  fnbAvexTopics: string[];
}

export interface WeeklyReportSummary {
  venueId: string;
  venueName: string;
  period: "7d" | "30d";
  from: string;
  to: string;
  generatedAt: string;
  hasData: boolean;
  baselineStatus: BaselineStatus;
  totalTouches: number;
  previousTotalTouches: number;
  touchesDeltaPct: number | null;
  touchesDaily: TrendPoint[];
  topZones: Array<{ zone: string; touches: number }>;
  destinationBreakdown: BreakdownRow[];
  avex: {
    sessions: number;
    resolved: number;
    escalated: number;
    derivationPct: number;
  };
  alerts: {
    total: number;
    critical: number;
    attention: number;
    acknowledged: number;
  };
  kpis: KpiCard[];
  roi: RoiSummary;
}
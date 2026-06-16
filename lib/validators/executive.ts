import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums — aligned to specs/002-clevel (CL-02/03/04, CL-08, CL-13)
// ---------------------------------------------------------------------------

/** Capas de visibilidad gerencial (1–4). */
export const executiveLayerSchema = z.enum([
  "pulse",
  "performance",
  "experience",
  "roi",
]);

export const alertSeveritySchema = z.enum(["attention", "critical"]);

export const alertStatusSchema = z.enum([
  "active",
  "acknowledged",
  "assigned",
  "dismissed",
]);

export const alertTypeSchema = z.enum([
  "activity_drop",
  "tag_inactive",
  "avex_derivation",
  "system_health",
]);

export const executiveScopeSchema = z.enum([
  "operations",
  "fnb",
  "experience",
  "front_office",
]);

export const executiveRoleSchema = z.enum([
  "executive",
  "manager",
  "department_head",
]);

export const kpiPeriodSchema = z.enum(["weekly", "monthly"]);

export const kpiComparisonSchema = z.enum(["gte", "lte"]);

export const kpiDepartmentSchema = z.enum([
  "executive",
  "front_office",
  "operations",
  "fnb",
  "experience",
  "transversal",
]);

// ---------------------------------------------------------------------------
// Query params — common across executive APIs (M0–M2)
// ---------------------------------------------------------------------------

export const executiveQueryParamsSchema = z.object({
  venueId: z.string().uuid(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const pulseQueryParamsSchema = executiveQueryParamsSchema.extend({
  windowMin: z.coerce.number().int().min(15).max(60).default(30),
});

export const overviewQueryParamsSchema = executiveQueryParamsSchema.extend({
  period: z.enum(["7d", "30d"]).default("7d"),
});

export const departmentQueryParamsSchema = executiveQueryParamsSchema.extend({
  period: z.enum(["7d", "30d"]).default("7d"),
  zone: z.string().min(1).optional(),
  tagId: z.string().uuid().optional(),
});

export const contentCorrectionBodySchema = z.object({
  venueId: z.string().uuid(),
  tagId: z.string().uuid(),
  tagLabel: z.string().min(1),
  note: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Config entities — alert_thresholds / kpi_targets (DB shapes)
// ---------------------------------------------------------------------------

const operatingHoursSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
});

export const activityDropThresholdConfigSchema = z.object({
  attention_drop_pct: z.number().min(0).max(100),
  critical_drop_pct: z.number().min(0).max(100),
  min_delta_touches_attention: z.number().int().min(0),
  min_delta_touches_critical: z.number().int().min(0),
  evaluation_window_min: z.number().int().min(1),
  dedup_window_hours: z.number().int().min(1),
  operating_hours: operatingHoursSchema,
});

export const tagInactiveThresholdConfigSchema = z.object({
  inactive_hours: z.number().int().min(1),
  min_venue_touches_per_day: z.number().int().min(0),
  grace_hours: z.number().int().min(0),
  operating_hours: operatingHoursSchema,
});

export const avexDerivationThresholdConfigSchema = z.object({
  attention_pct: z.number().min(0).max(100),
  critical_pct: z.number().min(0).max(100),
  window_hours: z.number().int().min(1),
  min_sessions_attention: z.number().int().min(1),
  min_sessions_critical: z.number().int().min(1),
  dedup_window_hours: z.number().int().min(1),
});

export const alertThresholdConfigSchema = z.union([
  activityDropThresholdConfigSchema,
  tagInactiveThresholdConfigSchema,
  avexDerivationThresholdConfigSchema,
  z.record(z.unknown()),
]);

export const alertThresholdSchema = z.object({
  id: z.string().uuid(),
  venueId: z.string().uuid(),
  alertType: alertTypeSchema,
  department: executiveScopeSchema.nullable(),
  config: alertThresholdConfigSchema,
  isActive: z.boolean(),
});

export const kpiTargetSchema = z.object({
  id: z.string().uuid(),
  venueId: z.string().uuid(),
  department: kpiDepartmentSchema,
  kpiKey: z.string().min(1),
  period: kpiPeriodSchema,
  targetValue: z.number(),
  comparison: kpiComparisonSchema,
});

// ---------------------------------------------------------------------------
// Alerts — executive_alerts (M3+; draft shape for overview M2)
// ---------------------------------------------------------------------------

export const executiveAlertSchema = z.object({
  id: z.string().uuid(),
  venueId: z.string().uuid(),
  type: alertTypeSchema,
  severity: alertSeveritySchema,
  status: alertStatusSchema,
  department: executiveScopeSchema.nullable(),
  entityRef: z.string().nullable(),
  message: z.string(),
  suggestedAction: z.string().nullable(),
  layer: executiveLayerSchema,
  createdAt: z.string().datetime({ offset: true }),
  acknowledgedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

// ---------------------------------------------------------------------------
// API responses — M0–M2 draft contracts
// ---------------------------------------------------------------------------

export const executiveMeResponseSchema = z.object({
  userId: z.string().uuid(),
  role: executiveRoleSchema,
  executiveScope: executiveScopeSchema.nullable(),
  venueId: z.string().uuid(),
  venueName: z.string(),
  venueSlug: z.string(),
  displayName: z.string(),
  baselineReady: z.boolean(),
  baselineDay: z.number().int().min(0).max(14).nullable(),
  totalTouches: z.number().int().min(0),
  firstTouchAt: z.string().datetime({ offset: true }).nullable(),
});

export const pulseZoneActivitySchema = z.object({
  zone: z.string(),
  touches: z.number().int().min(0),
  deltaPct: z.number().nullable().optional(),
});

export const pulseTagActivitySchema = z.object({
  tagId: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  zone: z.string(),
  touches: z.number().int().min(0),
});

export const pulseAvexSummarySchema = z.object({
  recentSessions: z.number().int().min(0),
  derivationPct: z.number().min(0).max(100),
  topTopics: z.array(z.string()),
});

export const pulseAlertsSummarySchema = z.object({
  critical: z.number().int().min(0),
  attention: z.number().int().min(0),
});

export const pulseResponseSchema = z.object({
  venueId: z.string().uuid(),
  windowMin: z.number().int().min(15).max(60),
  fetchedAt: z.string().datetime({ offset: true }),
  layer: z.literal("pulse"),
  zones: z.array(pulseZoneActivitySchema),
  tags: z.array(pulseTagActivitySchema),
  avex: pulseAvexSummarySchema,
  alertsSummary: pulseAlertsSummarySchema,
});

export const baselineStatusSchema = z.object({
  ready: z.boolean(),
  day: z.number().int().min(0).max(14),
  totalTouches: z.number().int().min(0),
  firstTouchAt: z.string().datetime({ offset: true }).nullable(),
});

export const kpiCardSchema = z.object({
  key: z.string(),
  label: z.string(),
  definition: z.string(),
  layer: executiveLayerSchema,
  department: kpiDepartmentSchema,
  value: z.number(),
  target: z.number().nullable(),
  comparison: kpiComparisonSchema.nullable(),
  deltaPct: z.number().nullable(),
  onTarget: z.boolean().nullable(),
  suggestedAction: z.string().nullable(),
});

export const trendPointSchema = z.object({
  day: z.string(),
  touches: z.number().int().min(0),
});

export const roiSummarySchema = z.object({
  staffMinutesSaved: z.number().min(0),
  selfServiceMinutes: z.number().min(0),
  totalMinutes: z.number().min(0),
  deltaPct: z.number().nullable(),
  label: z.literal("Estimado operativo"),
});

export const departmentSummarySchema = z.object({
  scope: executiveScopeSchema,
  label: z.string(),
  primaryKpi: kpiCardSchema,
  alertCount: z.number().int().min(0),
});

export const alertActionSchema = z.enum([
  "acknowledge",
  "assign",
  "dismiss",
]);

export const patchAlertBodySchema = z.object({
  action: alertActionSchema,
  assignTo: z.string().uuid().optional(),
});

export const alertsListQuerySchema = executiveQueryParamsSchema.extend({
  status: z
    .enum(["active", "acknowledged", "assigned", "dismissed"])
    .optional(),
  severity: alertSeveritySchema.optional(),
  department: executiveScopeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const alertsListResponseSchema = z.object({
  venueId: z.string().uuid(),
  fetchedAt: z.string().datetime({ offset: true }),
  alerts: z.array(executiveAlertSchema),
});

export const overviewResponseSchema = z.object({
  venueId: z.string().uuid(),
  period: z.enum(["7d", "30d"]),
  fetchedAt: z.string().datetime({ offset: true }),
  baselineStatus: baselineStatusSchema,
  kpis: z.array(kpiCardSchema),
  trend: z.array(trendPointSchema),
  roi: roiSummarySchema,
  departmentSummaries: z.array(departmentSummarySchema),
  topAlerts: z.array(executiveAlertSchema),
});

export const zoneHourlyCellSchema = z.object({
  zone: z.string(),
  hour: z.number().int().min(0).max(23),
  touches: z.number().int().min(0),
});

export const tagRankingRowSchema = z.object({
  tagId: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  zone: z.string(),
  roomNumber: z.string().nullable(),
  touches: z.number().int().min(0),
});

export const atypicalRoomSchema = z.object({
  roomNumber: z.string(),
  label: z.string(),
  sessionCount: z.number().int().min(0),
  venueAvg: z.number().min(0),
  multiplier: z.number().min(0),
  tagId: z.string().uuid().nullable(),
});

export const avexEffectivenessRowSchema = z.object({
  day: z.string(),
  sessions: z.number().int().min(0),
  resolved: z.number().int().min(0),
  escalated: z.number().int().min(0),
  derivation_pct: z.number().min(0).max(100),
});

const breakdownRowSchema = z.object({
  type: z.string(),
  count: z.number().int().min(0),
  percentage: z.number().min(0).max(100),
});

const peakHourRowSchema = z.object({
  hour: z.number().int().min(0).max(23),
  count: z.number().int().min(0),
});

const contentImpactSchema = z.object({
  configTitle: z.string(),
  updatedAt: z.string().datetime({ offset: true }),
  postTouches: z.number().int().min(0),
  priorTouches: z.number().int().min(0),
  postDestinations: z.number().int().min(0),
  priorDestinations: z.number().int().min(0),
  touchesDeltaPct: z.number().nullable(),
  destinationsDeltaPct: z.number().nullable(),
  windowDays: z.number().int().min(1),
});

export const departmentDashboardResponseSchema = z.object({
  scope: executiveScopeSchema,
  label: z.string(),
  period: z.enum(["7d", "30d"]),
  fetchedAt: z.string().datetime({ offset: true }),
  baselineStatus: baselineStatusSchema,
  kpis: z.array(kpiCardSchema),
  zoneHeatmap: z.array(zoneHourlyCellSchema),
  tagRanking: z.array(tagRankingRowSchema),
  atypicalRooms: z.array(atypicalRoomSchema),
  nfcFriction: z.array(
    z.object({
      channel: z.string(),
      count: z.number().int().min(0),
      pct: z.number().min(0).max(100),
    }),
  ),
  avexEffectiveness: z.array(avexEffectivenessRowSchema),
  topDerivationTopics: z.array(z.string()),
  topAlerts: z.array(executiveAlertSchema),
  peakHours: z.array(peakHourRowSchema).default([]),
  destinationBreakdown: z.array(breakdownRowSchema).default([]),
  deviceBreakdown: z.array(breakdownRowSchema).default([]),
  countryBreakdown: z
    .array(
      z.object({
        countryCode: z.string(),
        count: z.number().int().min(0),
      }),
    )
    .default([]),
  contentImpact: contentImpactSchema.nullable().default(null),
  fnbAvexTopics: z.array(z.string()).default([]),
});

export const reportExportQuerySchema = overviewQueryParamsSchema.extend({
  format: z.enum(["csv", "json"]).default("csv"),
});

export const settingsQuerySchema = z.object({
  venueId: z.string().uuid(),
});

export const patchThresholdBodySchema = z.object({
  venueId: z.string().uuid(),
  id: z.string().uuid(),
  config: alertThresholdConfigSchema,
  isActive: z.boolean().optional(),
});

export const patchKpiTargetBodySchema = z.object({
  venueId: z.string().uuid(),
  id: z.string().uuid(),
  targetValue: z.number(),
  comparison: kpiComparisonSchema.optional(),
});

export const thresholdsListResponseSchema = z.object({
  venueId: z.string().uuid(),
  thresholds: z.array(alertThresholdSchema),
});

export const kpiTargetsListResponseSchema = z.object({
  venueId: z.string().uuid(),
  targets: z.array(kpiTargetSchema),
});

export const weeklyReportSummarySchema = z.object({
  venueId: z.string().uuid(),
  venueName: z.string(),
  period: z.enum(["7d", "30d"]),
  from: z.string(),
  to: z.string(),
  generatedAt: z.string().datetime({ offset: true }),
  hasData: z.boolean(),
  baselineStatus: baselineStatusSchema,
  totalTouches: z.number().int().min(0),
  previousTotalTouches: z.number().int().min(0),
  touchesDeltaPct: z.number().nullable(),
  touchesDaily: z.array(trendPointSchema),
  topZones: z.array(
    z.object({
      zone: z.string(),
      touches: z.number().int().min(0),
    }),
  ),
  destinationBreakdown: z.array(breakdownRowSchema),
  avex: z.object({
    sessions: z.number().int().min(0),
    resolved: z.number().int().min(0),
    escalated: z.number().int().min(0),
    derivationPct: z.number().min(0).max(100),
  }),
  alerts: z.object({
    total: z.number().int().min(0),
    critical: z.number().int().min(0),
    attention: z.number().int().min(0),
    acknowledged: z.number().int().min(0),
  }),
  kpis: z.array(kpiCardSchema),
  roi: roiSummarySchema,
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type ExecutiveLayer = z.infer<typeof executiveLayerSchema>;
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;
export type AlertStatus = z.infer<typeof alertStatusSchema>;
export type AlertType = z.infer<typeof alertTypeSchema>;
export type ExecutiveScope = z.infer<typeof executiveScopeSchema>;
export type ExecutiveRole = z.infer<typeof executiveRoleSchema>;
export type KpiPeriod = z.infer<typeof kpiPeriodSchema>;
export type KpiComparison = z.infer<typeof kpiComparisonSchema>;
export type KpiDepartment = z.infer<typeof kpiDepartmentSchema>;

export type ExecutiveQueryParams = z.infer<typeof executiveQueryParamsSchema>;
export type PulseQueryParams = z.infer<typeof pulseQueryParamsSchema>;
export type OverviewQueryParams = z.infer<typeof overviewQueryParamsSchema>;

export type AlertThreshold = z.infer<typeof alertThresholdSchema>;
export type KpiTarget = z.infer<typeof kpiTargetSchema>;
export type ExecutiveAlert = z.infer<typeof executiveAlertSchema>;

export type ExecutiveMeResponse = z.infer<typeof executiveMeResponseSchema>;
export type PulseResponse = z.infer<typeof pulseResponseSchema>;
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
export type DepartmentQueryParams = z.infer<typeof departmentQueryParamsSchema>;
export type DepartmentDashboardResponse = z.infer<
  typeof departmentDashboardResponseSchema
>;
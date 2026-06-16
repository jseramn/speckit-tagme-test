import type {
  DepartmentDashboardResponse,
  ExecutiveScope,
} from "@/types/executive";
import { getTopAlerts } from "./alerts/queries";
import { getBaselineStatus } from "./baseline";
import { compareTargets } from "./kpis";
import { enrichKpiWithNarrative, DEPARTMENT_LABELS } from "./narrative";
import type { ExecutivePeriod } from "./period";
import {
  filterTagsByScope,
  filterZonesByScope,
  type ExecutiveScopeContext,
} from "./scope";
import { SCOPE_ZONES } from "./scope";
import {
  getAtypicalRooms,
  getAvexEffectiveness,
  getByTag,
  getByZone,
  getChannelBreakdown,
  getContentImpact,
  getFnbAvexTopics,
  getPeakHoursByZones,
  getScopedMetrics,
  getTopDerivationTopics,
} from "./queries";

const SCOPE_KPI_KEYS: Record<ExecutiveScope, string[]> = {
  operations: ["nfc_direct_rate", "abandonment_rate"],
  fnb: ["menu_visit_pct"],
  experience: ["destinations_per_touch"],
  front_office: ["avex_derivation_rate", "avex_sessions_per_day"],
};

export interface DepartmentDashboardFilters {
  period?: ExecutivePeriod;
  from?: string;
  to?: string;
  zone?: string;
  tagId?: string;
}

export async function getDepartmentDashboard(
  venueId: string,
  scope: ExecutiveScope,
  ctx: ExecutiveScopeContext,
  filters: DepartmentDashboardFilters = {},
): Promise<DepartmentDashboardResponse> {
  const period = filters.period ?? "7d";
  const fetchedAt = new Date().toISOString();

  const scopeZones = [...SCOPE_ZONES[scope]];
  const effectiveZones =
    filters.zone && scopeZones.includes(filters.zone)
      ? [filters.zone]
      : scopeZones;

  const [
    baselineStatus,
    allKpis,
    zoneHeatmapRaw,
    tagRankingRaw,
    atypicalRooms,
    channels,
    avexEffectiveness,
    topDerivationTopics,
    topAlerts,
    fnbPeakHours,
    fnbAvexTopics,
    scopedMetrics,
    contentImpact,
  ] = await Promise.all([
    getBaselineStatus(venueId),
    compareTargets(venueId, period, filters.from, filters.to, SCOPE_KPI_KEYS[scope]),
    getByZone(venueId, period, filters.from, filters.to),
    getByTag(venueId, period, filters.from, filters.to),
    scope === "operations" ? getAtypicalRooms(venueId, period, filters.from, filters.to) : Promise.resolve([]),
    scope === "operations" ? getChannelBreakdown(venueId, period) : Promise.resolve([]),
    scope === "front_office"
      ? getAvexEffectiveness(venueId, period, filters.from, filters.to)
      : Promise.resolve([]),
    scope === "front_office"
      ? getTopDerivationTopics(venueId, period, filters.from, filters.to, 3)
      : Promise.resolve([]),
    getTopAlerts(venueId, 10),
    scope === "fnb"
      ? getPeakHoursByZones(venueId, effectiveZones, period, filters.from, filters.to, filters.tagId)
      : Promise.resolve([]),
    scope === "fnb"
      ? getFnbAvexTopics(venueId, period, filters.from, filters.to, 3)
      : Promise.resolve([]),
    scope === "experience" || scope === "fnb"
      ? getScopedMetrics(venueId, effectiveZones, period, filters.from, filters.to, filters.tagId)
      : Promise.resolve({
          peakHours: [],
          destinationBreakdown: [],
          deviceBreakdown: [],
          countryBreakdown: [],
        }),
    scope === "experience" ? getContentImpact(venueId) : Promise.resolve(null),
  ]);

  const allowedZones = new Set(
    filterZonesByScope(
      [...new Set(zoneHeatmapRaw.map((z) => z.zone))],
      ctx,
    ),
  );

  let zoneHeatmap = zoneHeatmapRaw.filter((z) => allowedZones.has(z.zone));
  if (filters.zone && allowedZones.has(filters.zone)) {
    zoneHeatmap = zoneHeatmap.filter((z) => z.zone === filters.zone);
  }

  let tagRanking = filterTagsByScope(
    tagRankingRaw.map((t) => ({
      tagId: t.tagId,
      slug: t.slug,
      label: t.label,
      zone: t.zone,
      roomNumber: t.roomNumber,
      touches: t.touches,
    })),
    ctx,
  ).sort((a, b) => b.touches - a.touches);

  if (filters.zone) {
    tagRanking = tagRanking.filter((t) => t.zone === filters.zone);
  }
  if (filters.tagId) {
    tagRanking = tagRanking.filter((t) => t.tagId === filters.tagId);
  }

  const scopedAlerts = topAlerts.filter(
    (a) => a.department === null || a.department === scope,
  );

  const peakHours =
    scope === "fnb" ? fnbPeakHours : scopedMetrics.peakHours;

  return {
    scope,
    label: DEPARTMENT_LABELS[scope] ?? scope,
    period,
    fetchedAt,
    baselineStatus,
    kpis: allKpis.map((k) => enrichKpiWithNarrative(k)),
    zoneHeatmap,
    tagRanking,
    atypicalRooms,
    nfcFriction: channels,
    avexEffectiveness,
    topDerivationTopics,
    topAlerts: scopedAlerts,
    peakHours,
    destinationBreakdown: scopedMetrics.destinationBreakdown,
    deviceBreakdown: scopedMetrics.deviceBreakdown,
    countryBreakdown: scopedMetrics.countryBreakdown,
    contentImpact,
    fnbAvexTopics,
  };
}
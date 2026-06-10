import type { DepartmentSummary, OverviewResponse } from "@/types/executive";
import { countAlertsByDepartment, getTopAlerts } from "./alerts/queries";
import { getBaselineStatus } from "./baseline";
import { compareTargets } from "./kpis";
import {
  DEPARTMENT_LABELS,
  enrichKpiWithNarrative,
} from "./narrative";
import { calculateRoi } from "./roi";
import { getTrends } from "./queries";
import type { ExecutivePeriod } from "./period";

const OVERVIEW_KPI_KEYS = [
  "total_interactions",
  "avex_resolution_rate",
  "avex_derivation_rate",
];

const DEPARTMENT_PRIMARY_KPI: Record<string, string> = {
  operations: "nfc_direct_rate",
  fnb: "menu_visit_pct",
  experience: "destinations_per_touch",
  front_office: "avex_derivation_rate",
};

export async function getExecutiveOverview(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<OverviewResponse> {
  const fetchedAt = new Date().toISOString();

  const [baselineStatus, trends, roi, allKpis, topAlerts, alertCounts] =
    await Promise.all([
      getBaselineStatus(venueId),
      getTrends(venueId, period, from, to),
      calculateRoi(venueId, period, from, to),
      compareTargets(venueId, period, from, to),
      getTopAlerts(venueId, 5),
      countAlertsByDepartment(venueId),
    ]);

  const overviewKpis = allKpis
    .filter((k) => OVERVIEW_KPI_KEYS.includes(k.key))
    .map((k) => enrichKpiWithNarrative(k));

  const departmentSummaries: DepartmentSummary[] = Object.entries(
    DEPARTMENT_PRIMARY_KPI,
  ).map(([scope, kpiKey]) => {
    const raw =
      allKpis.find((k) => k.key === kpiKey && k.department === scope) ??
      allKpis.find((k) => k.key === kpiKey);

    const primaryKpi = enrichKpiWithNarrative(
      raw ?? {
        key: kpiKey,
        label: kpiKey,
        definition: "",
        layer: "performance",
        department: scope as DepartmentSummary["scope"],
        value: 0,
        target: null,
        comparison: null,
        deltaPct: null,
        onTarget: null,
        suggestedAction: null,
      },
    );

    return {
      scope: scope as DepartmentSummary["scope"],
      label: DEPARTMENT_LABELS[scope] ?? scope,
      primaryKpi,
      alertCount: alertCounts[scope as DepartmentSummary["scope"]] ?? 0,
    };
  });

  return {
    venueId,
    period,
    fetchedAt,
    baselineStatus,
    kpis: overviewKpis,
    trend: trends.trend,
    roi,
    departmentSummaries,
    topAlerts,
  };
}
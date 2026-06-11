import { aggregateRatings } from "@/lib/scorecards/aggregate-ratings";
import { getNpsThreshold } from "@/lib/scorecards/get-nps-threshold";
import type { ParsedPeriod } from "@/lib/scorecards/parse-period";
import {
  queryFeedbackBase,
  ratingsFromRows,
} from "@/lib/scorecards/query-feedback-base";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface DepartmentRollupEntry {
  departmentId: string;
  departmentName: string;
  feedbackCount: number;
  npsInternal: number | null;
  insufficientData: boolean;
}

export interface HotelScorecardResult {
  venueId: string;
  venueName: string;
  period: ParsedPeriod;
  metrics: ReturnType<typeof aggregateRatings> & {
    openIncidents: number;
    incidentRatePer100Stays: number;
    captureCoveragePct: number;
    departments: DepartmentRollupEntry[];
  };
}

export async function queryHotelScorecard(
  venueId: string,
  period: ParsedPeriod,
): Promise<HotelScorecardResult | null> {
  const insforge = createInsforgeServerClient();

  const { data: venue, error: venueError } = await insforge.database
    .from("venues")
    .select("id, name")
    .eq("id", venueId)
    .maybeSingle();

  if (venueError || !venue) return null;

  const threshold = await getNpsThreshold(venueId);

  const rows = await queryFeedbackBase({ venueId, period });
  const metrics = aggregateRatings(ratingsFromRows(rows), threshold);

  const { count: openIncidents } = await insforge.database
    .from("incident_reports")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .in("status", ["abierta", "en_progreso"]);

  const { count: activeStays } = await insforge.database
    .from("guest_stays")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("status", "active");

  const { count: periodIncidents } = await insforge.database
    .from("incident_reports")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .gte("created_at", period.from.toISOString())
    .lte("created_at", period.to.toISOString());

  const stays = activeStays ?? 0;
  const incidentRatePer100Stays =
    stays > 0
      ? Math.round(((periodIncidents ?? 0) / stays) * 100 * 10) / 10
      : 0;

  const uniqueStays = new Set(rows.map((row) => row.guest_stay_id)).size;
  const captureCoveragePct =
    stays > 0 ? Math.round((uniqueStays / stays) * 100 * 10) / 10 : 0;

  const departments = await buildDepartmentRollup(venueId, rows, threshold);

  return {
    venueId,
    venueName: venue.name as string,
    period,
    metrics: {
      ...metrics,
      openIncidents: openIncidents ?? 0,
      incidentRatePer100Stays,
      captureCoveragePct,
      departments,
    },
  };
}

async function buildDepartmentRollup(
  venueId: string,
  rows: Awaited<ReturnType<typeof queryFeedbackBase>>,
  threshold: number,
): Promise<DepartmentRollupEntry[]> {
  const insforge = createInsforgeServerClient();

  const { data: deptList } = await insforge.database
    .from("departments")
    .select("id, name")
    .eq("venue_id", venueId)
    .eq("is_active", true);

  if (!deptList?.length) return [];

  const byDept = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.department_id) continue;
    const list = byDept.get(row.department_id) ?? [];
    list.push(row.rating);
    byDept.set(row.department_id, list);
  }

  return deptList
    .map((dept) => {
      const ratings = byDept.get(dept.id as string) ?? [];
      const agg = aggregateRatings(ratings, threshold);
      return {
        departmentId: dept.id as string,
        departmentName: dept.name as string,
        feedbackCount: agg.feedbackCount,
        npsInternal: agg.npsInternal,
        insufficientData: agg.insufficientData,
      };
    })
    .sort((a, b) => b.feedbackCount - a.feedbackCount);
}
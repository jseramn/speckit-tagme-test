import { aggregateRatings } from "@/lib/scorecards/aggregate-ratings";
import { getNpsThreshold } from "@/lib/scorecards/get-nps-threshold";
import type { ParsedPeriod } from "@/lib/scorecards/parse-period";
import {
  queryFeedbackBase,
  ratingsFromRows,
  trend7dPeriod,
} from "@/lib/scorecards/query-feedback-base";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface EmployeeScorecardResult {
  staffMemberId: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  venueId: string;
  period: ParsedPeriod;
  metrics: ReturnType<typeof aggregateRatings> & {
    incidentCountLinked: number;
    trend7d: ReturnType<typeof aggregateRatings>;
    message?: string;
  };
}

export async function queryEmployeeScorecard(
  staffMemberId: string,
  period: ParsedPeriod,
): Promise<EmployeeScorecardResult | null> {
  const insforge = createInsforgeServerClient();

  const { data: staff, error: staffError } = await insforge.database
    .from("staff_members")
    .select(
      `
      id,
      venue_id,
      display_name,
      department_id,
      departments ( name )
    `,
    )
    .eq("id", staffMemberId)
    .eq("is_active", true)
    .maybeSingle();

  if (staffError || !staff) return null;

  const venueId = staff.venue_id as string;
  const threshold = await getNpsThreshold(venueId);

  const rows = await queryFeedbackBase({
    venueId,
    period,
    staffMemberId,
    staffOriginOnly: true,
  });

  const metrics = aggregateRatings(ratingsFromRows(rows), threshold);

  const trendRows = await queryFeedbackBase({
    venueId,
    period: trend7dPeriod(period),
    staffMemberId,
    staffOriginOnly: true,
  });
  const trend7d = aggregateRatings(ratingsFromRows(trendRows), threshold);

  const { count: incidentCount } = await insforge.database
    .from("incident_reports")
    .select("id", { count: "exact", head: true })
    .eq("staff_member_id", staffMemberId)
    .gte("created_at", period.from.toISOString())
    .lte("created_at", period.to.toISOString());

  const dept = staff.departments as { name: string } | { name: string }[] | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;

  const result: EmployeeScorecardResult = {
    staffMemberId,
    displayName: staff.display_name as string,
    departmentId: staff.department_id as string,
    departmentName: departmentName ?? "—",
    venueId,
    period,
    metrics: {
      ...metrics,
      incidentCountLinked: incidentCount ?? 0,
      trend7d,
    },
  };

  if (metrics.insufficientData) {
    result.metrics.message = `Datos insuficientes (n=${metrics.feedbackCount}). Se requieren al menos ${threshold} opiniones.`;
  }

  return result;
}
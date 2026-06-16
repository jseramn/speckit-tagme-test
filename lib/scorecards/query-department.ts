import { aggregateRatings } from "@/lib/scorecards/aggregate-ratings";
import { getNpsThreshold } from "@/lib/scorecards/get-nps-threshold";
import type { ParsedPeriod } from "@/lib/scorecards/parse-period";
import {
  queryFeedbackBase,
  ratingsFromRows,
  type FeedbackBaseRow,
} from "@/lib/scorecards/query-feedback-base";
import { isEmployeeScorecardFeedback } from "@/lib/scorecards/origin-filters";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface EmployeeRankingEntry {
  staffMemberId: string;
  displayName: string;
  feedbackCount: number;
  npsInternal: number | null;
  insufficientData: boolean;
}

export interface ShiftScorecardEntry {
  shiftId: string;
  shiftName: string;
  feedbackCount: number;
  npsInternal: number | null;
  insufficientData: boolean;
  unassignedCount: number;
}

export interface DepartmentScorecardResult {
  departmentId: string;
  departmentName: string;
  venueId: string;
  period: ParsedPeriod;
  metrics: ReturnType<typeof aggregateRatings> & {
    openIncidents: number;
    closedIncidents: number;
    employeeRanking: EmployeeRankingEntry[];
  };
  shifts: ShiftScorecardEntry[];
  comments?: { rating: number; comment: string; createdAt: string }[];
}

export async function queryDepartmentScorecard(
  departmentId: string,
  period: ParsedPeriod,
  options?: { includeComments?: boolean },
): Promise<DepartmentScorecardResult | null> {
  const insforge = createInsforgeServerClient();

  const { data: department, error: deptError } = await insforge.database
    .from("departments")
    .select("id, name, venue_id")
    .eq("id", departmentId)
    .eq("is_active", true)
    .maybeSingle();

  if (deptError || !department) return null;

  const venueId = department.venue_id as string;
  const threshold = await getNpsThreshold(venueId);

  const rows = await queryFeedbackBase({
    venueId,
    period,
    departmentId,
  });

  const metrics = aggregateRatings(ratingsFromRows(rows), threshold);

  const { count: openIncidents } = await insforge.database
    .from("incident_reports")
    .select("id", { count: "exact", head: true })
    .eq("department_id", departmentId)
    .in("status", ["abierta", "en_progreso"]);

  const { count: closedIncidents } = await insforge.database
    .from("incident_reports")
    .select("id", { count: "exact", head: true })
    .eq("department_id", departmentId)
    .in("status", ["resuelta", "cerrada"])
    .gte("created_at", period.from.toISOString())
    .lte("created_at", period.to.toISOString());

  const employeeRanking = await buildEmployeeRanking(
    departmentId,
    rows,
    threshold,
  );

  const shifts = await buildShiftBreakdown(
    departmentId,
    rows,
    threshold,
  );

  const result: DepartmentScorecardResult = {
    departmentId,
    departmentName: department.name as string,
    venueId,
    period,
    metrics: {
      ...metrics,
      openIncidents: openIncidents ?? 0,
      closedIncidents: closedIncidents ?? 0,
      employeeRanking,
    },
    shifts,
  };

  if (options?.includeComments) {
    result.comments = rows
      .filter((row) => row.comment?.trim())
      .map((row) => ({
        rating: row.rating,
        comment: row.comment!.trim(),
        createdAt: row.created_at,
      }))
      .slice(0, 50);
  }

  return result;
}

async function buildEmployeeRanking(
  departmentId: string,
  rows: FeedbackBaseRow[],
  threshold: number,
): Promise<EmployeeRankingEntry[]> {
  const insforge = createInsforgeServerClient();

  const { data: staffList } = await insforge.database
    .from("staff_members")
    .select("id, display_name")
    .eq("department_id", departmentId)
    .eq("is_active", true);

  if (!staffList?.length) return [];

  const byStaff = new Map<string, number[]>();

  for (const row of rows) {
    if (!isEmployeeScorecardFeedback(row.origin_type, row.staff_member_id)) {
      continue;
    }
    const id = row.staff_member_id!;
    const list = byStaff.get(id) ?? [];
    list.push(row.rating);
    byStaff.set(id, list);
  }

  return staffList
    .map((staff) => {
      const ratings = byStaff.get(staff.id as string) ?? [];
      const agg = aggregateRatings(ratings, threshold);
      return {
        staffMemberId: staff.id as string,
        displayName: staff.display_name as string,
        feedbackCount: agg.feedbackCount,
        npsInternal: agg.npsInternal,
        insufficientData: agg.insufficientData,
      };
    })
    .sort((a, b) => b.feedbackCount - a.feedbackCount);
}

async function buildShiftBreakdown(
  departmentId: string,
  rows: FeedbackBaseRow[],
  threshold: number,
): Promise<ShiftScorecardEntry[]> {
  const insforge = createInsforgeServerClient();

  const { data: shiftList } = await insforge.database
    .from("shifts")
    .select("id, name")
    .eq("department_id", departmentId)
    .eq("is_active", true);

  const staffRows = rows.filter((row) =>
    isEmployeeScorecardFeedback(row.origin_type, row.staff_member_id),
  );

  const unassignedCount = staffRows.filter((row) => !row.shift_id).length;

  const entries: ShiftScorecardEntry[] = (shiftList ?? []).map((shift) => {
    const shiftRows = staffRows.filter(
      (row) => row.shift_id === (shift.id as string),
    );
    const agg = aggregateRatings(ratingsFromRows(shiftRows), threshold);
    return {
      shiftId: shift.id as string,
      shiftName: shift.name as string,
      feedbackCount: agg.feedbackCount,
      npsInternal: agg.npsInternal,
      insufficientData: agg.insufficientData,
      unassignedCount: 0,
    };
  });

  if (unassignedCount > 0) {
    entries.push({
      shiftId: "unassigned",
      shiftName: "Sin turno asignado",
      feedbackCount: unassignedCount,
      npsInternal: null,
      insufficientData: true,
      unassignedCount,
    });
  }

  return entries.sort((a, b) => b.feedbackCount - a.feedbackCount);
}
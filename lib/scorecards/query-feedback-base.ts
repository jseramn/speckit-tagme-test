import { format, startOfDay, subDays } from "date-fns";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { ParsedPeriod } from "@/lib/scorecards/parse-period";
import { isEmployeeScorecardFeedback } from "@/lib/scorecards/origin-filters";

export interface FeedbackBaseRow {
  id: string;
  venue_id: string;
  guest_stay_id: string;
  staff_member_id: string | null;
  rating: number;
  comment: string | null;
  origin_type: string;
  shift_id: string | null;
  department_id: string | null;
  local_day: string;
  created_at: string;
}

export interface FeedbackQueryFilters {
  venueId: string;
  period: ParsedPeriod;
  staffMemberId?: string;
  departmentId?: string;
  /** When true, excludes room_nfc (employee/shift level). */
  staffOriginOnly?: boolean;
  shiftId?: string;
  requireShiftId?: boolean;
}

export async function queryFeedbackBase(
  filters: FeedbackQueryFilters,
): Promise<FeedbackBaseRow[]> {
  const insforge = createInsforgeServerClient();

  let query = insforge.database
    .from("v_feedback_base")
    .select(
      "id, venue_id, guest_stay_id, staff_member_id, rating, comment, origin_type, shift_id, department_id, local_day, created_at",
    )
    .eq("venue_id", filters.venueId)
    .gte("local_day", filters.period.fromIso)
    .lte("local_day", filters.period.toIso);

  if (filters.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }

  if (filters.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }

  if (filters.shiftId) {
    query = query.eq("shift_id", filters.shiftId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? "Error al consultar feedback base");
  }

  let rows = (data ?? []) as FeedbackBaseRow[];

  if (filters.staffOriginOnly) {
    rows = rows.filter((row) =>
      isEmployeeScorecardFeedback(row.origin_type, row.staff_member_id),
    );
  }

  if (filters.requireShiftId) {
    rows = rows.filter((row) => row.shift_id !== null);
  }

  return rows;
}

export function ratingsFromRows(rows: FeedbackBaseRow[]): number[] {
  return rows.map((row) => row.rating);
}

export function trend7dPeriod(period: ParsedPeriod): ParsedPeriod {
  const to = period.to;
  const from = startOfDay(subDays(to, 6));
  return {
    preset: "7d",
    from,
    to,
    fromIso: format(from, "yyyy-MM-dd"),
    toIso: format(to, "yyyy-MM-dd"),
  };
}
import { format } from "date-fns";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface ResolvedShift {
  shiftId: string;
  shiftName: string;
}

interface ShiftRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface AssignmentRow {
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  shifts: ShiftRow | ShiftRow[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Resolves the active shift assignment for a staff member (Q1=B: explicit only).
 * effective_from <= today AND (effective_to IS NULL OR effective_to >= today).
 */
export async function resolveActiveShift(
  staffMemberId: string,
): Promise<ResolvedShift | null> {
  const insforge = createInsforgeServerClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, error } = await insforge.database
    .from("staff_shift_assignments")
    .select(
      `
      shift_id,
      effective_from,
      effective_to,
      shifts!inner (
        id,
        name,
        is_active
      )
    `,
    )
    .eq("staff_member_id", staffMemberId)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as AssignmentRow;
  const shift = firstRelation(row.shifts);

  if (!shift?.is_active) {
    return null;
  }

  return {
    shiftId: shift.id,
    shiftName: shift.name,
  };
}
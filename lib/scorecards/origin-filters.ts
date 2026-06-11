import type { CaptureOriginType } from "@/types/staff";

/** Employee/shift scorecards: only staff-initiated feedback (Principio VII). */
export const EMPLOYEE_SCORECARD_ORIGIN: CaptureOriginType = "staff_nfc";

export function isEmployeeScorecardFeedback(
  originType: string,
  staffMemberId: string | null,
): boolean {
  return originType === EMPLOYEE_SCORECARD_ORIGIN && staffMemberId !== null;
}
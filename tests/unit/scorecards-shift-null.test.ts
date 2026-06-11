import { describe, expect, it } from "vitest";
import { aggregateRatings } from "@/lib/scorecards/aggregate-ratings";
import { isEmployeeScorecardFeedback } from "@/lib/scorecards/origin-filters";

describe("scorecards shift null + origin (T099)", () => {
  const staffRows = [
    { origin_type: "staff_nfc", staff_member_id: "emp-1", shift_id: "shift-1", rating: 5 },
    { origin_type: "staff_nfc", staff_member_id: "emp-1", shift_id: null, rating: 4 },
    { origin_type: "room_nfc", staff_member_id: null, shift_id: null, rating: 5 },
  ] as const;

  it("employee aggregation includes staff_nfc with shift_id null", () => {
    const employeeRatings = staffRows
      .filter((row) =>
        isEmployeeScorecardFeedback(row.origin_type, row.staff_member_id),
      )
      .map((row) => row.rating);

    const agg = aggregateRatings([...employeeRatings], 6);
    expect(agg.feedbackCount).toBe(2);
  });

  it("employee aggregation excludes room_nfc", () => {
    const employeeRows = staffRows.filter((row) =>
      isEmployeeScorecardFeedback(row.origin_type, row.staff_member_id),
    );

    expect(employeeRows).toHaveLength(2);
    expect(employeeRows.every((row) => row.origin_type === "staff_nfc")).toBe(
      true,
    );
    expect(staffRows.some((row) => row.origin_type === "room_nfc")).toBe(true);
  });

  it("shift roll-up excludes shift_id null and room_nfc", () => {
    const shiftRatings = staffRows
      .filter(
        (row) =>
          isEmployeeScorecardFeedback(row.origin_type, row.staff_member_id) &&
          row.shift_id !== null,
      )
      .map((row) => row.rating);

    expect(shiftRatings).toEqual([5]);
  });

  it("department roll-up includes staff_nfc without shift", () => {
    const deptRatings = staffRows
      .filter((row) => row.origin_type === "staff_nfc" || row.origin_type === "room_nfc")
      .map((row) => row.rating);

    expect(deptRatings.length).toBe(3);
  });
});
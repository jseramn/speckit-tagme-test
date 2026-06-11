import { describe, expect, it } from "vitest";
import {
  hasRlsTestEnv,
  skipIfNoRole,
} from "../helpers/jwt-mock";

const describeRls = hasRlsTestEnv() ? describe : describe.skip;

describeRls("staff role RLS matrix (T025)", () => {
  it("staff can SELECT own feedback via staff_member_id_for_user scope", async () => {
    const staff = skipIfNoRole("staff");
    if (!staff) return;

    const { error } = await staff.database
      .from("feedback_entries")
      .select("id, staff_member_id, rating")
      .limit(10);

    expect(error).toBeNull();
  });

  it("staff cannot SELECT incident_reports (no staff policies)", async () => {
    const staff = skipIfNoRole("staff");
    if (!staff) return;

    const { data, error } = await staff.database
      .from("incident_reports")
      .select("id")
      .limit(1);

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  it("staff cannot INSERT feedback_entries directly (service role only)", async () => {
    const staff = skipIfNoRole("staff");
    if (!staff) return;

    const { data, error } = await staff.database
      .from("feedback_entries")
      .insert([
        {
          venue_id: "00000000-0000-0000-0000-000000000001",
          guest_stay_id: "00000000-0000-0000-0000-000000000002",
          origin_type: "staff_nfc",
          origin_id: "00000000-0000-0000-0000-000000000003",
          staff_member_id: "00000000-0000-0000-0000-000000000004",
          rating: 5,
          context_snapshot: {},
        },
      ])
      .select("id");

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  it("supervisor can SELECT departments in assigned scope", async () => {
    const supervisor = skipIfNoRole("supervisor");
    if (!supervisor) return;

    const { error } = await supervisor.database
      .from("departments")
      .select("id, code, name")
      .eq("is_active", true);

    expect(error).toBeNull();
  });
});
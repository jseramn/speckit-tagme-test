import { describe, expect, it } from "vitest";
import {
  expectRlsSelectDenied,
  getRoleAuthUserId,
  getServiceClient,
  hasRlsTestEnv,
  skipIfNoRole,
} from "../helpers/jwt-mock";

describe.skipIf(!hasRlsTestEnv())("supervisor role incident RLS (T066)", () => {
  it("supervisor can SELECT incidents in assigned department scope", async () => {
    const supervisor = skipIfNoRole("supervisor");
    if (!supervisor) return;

    const { error } = await supervisor.database
      .from("incident_reports")
      .select("id, status, department_id")
      .limit(10);

    expect(error).toBeNull();
  });

  it("supervisor cannot SELECT incidents outside assigned departments", async () => {
    const supervisor = skipIfNoRole("supervisor");
    const service = getServiceClient();
    if (!supervisor) return;

    const { data: mantDept } = await service.database
      .from("departments")
      .select("id")
      .eq("code", "MANT")
      .maybeSingle();

    if (!mantDept?.id) return;

    const { data, error } = await supervisor.database
      .from("incident_reports")
      .select("id")
      .eq("department_id", mantDept.id)
      .limit(1);

    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0);
  });

  it("supervisor can UPDATE incident in assigned scope and insert history", async () => {
    const supervisor = skipIfNoRole("supervisor");
    const service = getServiceClient();
    if (!supervisor) return;

    const authUserId = getRoleAuthUserId("supervisor");
    if (!authUserId) return;

    const { data: profile } = await service.database
      .from("user_profiles")
      .select("id, venue_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!profile?.id) return;

    const { data: assignment } = await service.database
      .from("supervisor_department_assignments")
      .select("department_id")
      .eq("user_profile_id", profile.id)
      .limit(1)
      .maybeSingle();

    if (!assignment?.department_id) return;

    const { data: stay } = await service.database
      .from("guest_stays")
      .select("id")
      .eq("venue_id", profile.venue_id)
      .limit(1)
      .maybeSingle();

    if (!stay?.id) return;

    const { data: staffMember } = await service.database
      .from("staff_members")
      .select("id")
      .eq("department_id", assignment.department_id)
      .limit(1)
      .maybeSingle();

    if (!staffMember?.id) return;

    const { data: tag } = await service.database
      .from("staff_nfc_tags")
      .select("id")
      .eq("staff_member_id", staffMember.id)
      .limit(1)
      .maybeSingle();

    if (!tag?.id) return;

    const { data: incident, error: insertError } = await service.database
      .from("incident_reports")
      .insert([
        {
          venue_id: profile.venue_id,
          guest_stay_id: stay.id,
          staff_member_id: staffMember.id,
          department_id: assignment.department_id,
          origin_type: "staff_nfc",
          origin_id: tag.id,
          category: "limpieza",
          priority: "media",
          status: "abierta",
          description: "RLS test incident",
          context_snapshot: {},
        },
      ])
      .select("id")
      .single();

    expect(insertError).toBeNull();
    expect(incident?.id).toBeTruthy();

    const { error: updateError } = await supervisor.database
      .from("incident_reports")
      .update({ status: "en_progreso" })
      .eq("id", incident!.id);

    expect(updateError).toBeNull();

    const { error: historyError } = await supervisor.database
      .from("incident_status_history")
      .insert([
        {
          incident_id: incident!.id,
          changed_by: profile.id,
          from_status: "abierta",
          to_status: "en_progreso",
          note: "RLS supervisor test",
        },
      ]);

    expect(historyError).toBeNull();

    await service.database
      .from("incident_status_history")
      .delete()
      .eq("incident_id", incident!.id);
    await service.database
      .from("incident_reports")
      .delete()
      .eq("id", incident!.id);
  });

  it("staff cannot SELECT incident_reports", async () => {
    const staff = skipIfNoRole("staff");
    if (!staff) return;

    const { data, error } = await staff.database
      .from("incident_reports")
      .select("id")
      .limit(1);

    expectRlsSelectDenied({ data, error });
  });
});
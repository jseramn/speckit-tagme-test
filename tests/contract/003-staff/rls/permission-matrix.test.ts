import { describe, expect, it } from "vitest";
import {
  expectRlsSelectDenied,
  getServiceClient,
  hasRlsTestEnv,
  skipIfNoRole,
} from "../helpers/jwt-mock";

describe.skipIf(!hasRlsTestEnv())("permission matrix regression TR-02 (T077)", () => {
  it("staff can SELECT own feedback but not incidents", async () => {
    const staff = skipIfNoRole("staff");
    if (!staff) return;

    const feedback = await staff.database
      .from("feedback_entries")
      .select("id")
      .limit(1);
    expect(feedback.error).toBeNull();

    const incidents = await staff.database
      .from("incident_reports")
      .select("id")
      .limit(1);
    expectRlsSelectDenied(incidents);
  });

  it("supervisor can SELECT incidents and venue_incident_categories", async () => {
    const supervisor = skipIfNoRole("supervisor");
    if (!supervisor) return;

    const incidents = await supervisor.database
      .from("incident_reports")
      .select("id")
      .limit(1);
    expect(incidents.error).toBeNull();

    const categories = await supervisor.database
      .from("venue_incident_categories")
      .select("code, label")
      .limit(5);
    expect(categories.error).toBeNull();
  });

  it("manager can SELECT feedback comments scope and all venue incidents", async () => {
    const manager = skipIfNoRole("manager");
    if (!manager) return;

    const feedback = await manager.database
      .from("feedback_entries")
      .select("id, comment")
      .limit(5);
    expect(feedback.error).toBeNull();

    const incidents = await manager.database
      .from("incident_reports")
      .select("id, status")
      .limit(5);
    expect(incidents.error).toBeNull();
  });

  it("staff cannot INSERT capture sessions", async () => {
    const staff = skipIfNoRole("staff");
    const service = getServiceClient();
    if (!staff) return;

    const { data: venue } = await service.database
      .from("venues")
      .select("id")
      .eq("slug", "hotel-caribe")
      .maybeSingle();

    if (!venue?.id) return;

    const { data, error } = await staff.database
      .from("staff_capture_sessions")
      .insert([
        {
          session_token: "00000000-0000-4000-8000-000000000099",
          staff_member_id: "00000000-0000-4000-8000-000000000001",
          staff_nfc_tag_id: "00000000-0000-4000-8000-000000000002",
          venue_id: venue.id,
          status: "active",
          expires_at: new Date(Date.now() + 300_000).toISOString(),
          context_snapshot: {},
        },
      ])
      .select("id");

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
});
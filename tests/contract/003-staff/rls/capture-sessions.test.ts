import { describe, expect, it } from "vitest";
import {
  expectRlsSelectDenied,
  expectRlsWriteNoEffect,
  getServiceClient,
  hasRlsTestEnv,
  skipIfNoRole,
} from "../helpers/jwt-mock";

describe.skipIf(!hasRlsTestEnv())("staff_capture_sessions RLS (T117)", () => {
  it("service role can INSERT and SELECT sessions", async () => {
    const service = getServiceClient();

    const { data: venue } = await service.database
      .from("venues")
      .select("id")
      .eq("slug", "hotel-caribe")
      .maybeSingle();

    expect(venue?.id).toBeTruthy();

    const { data: tag } = await service.database
      .from("staff_nfc_tags")
      .select("id, staff_member_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    expect(tag?.id).toBeTruthy();

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await service.database
      .from("staff_capture_sessions")
      .insert([
        {
          session_token: sessionToken,
          staff_member_id: tag!.staff_member_id,
          staff_nfc_tag_id: tag!.id,
          venue_id: venue!.id,
          status: "active",
          expires_at: expiresAt,
          context_snapshot: { display_name: "RLS Test" },
        },
      ])
      .select("id, session_token")
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.session_token).toBe(sessionToken);

    const { data: selected, error: selectError } = await service.database
      .from("staff_capture_sessions")
      .select("id")
      .eq("session_token", sessionToken)
      .maybeSingle();

    expect(selectError).toBeNull();
    expect(selected?.id).toBe(inserted?.id);

    await service.database
      .from("staff_capture_sessions")
      .delete()
      .eq("id", inserted!.id);
  });

  it("authenticated staff cannot SELECT capture sessions", async () => {
    const staff = skipIfNoRole("staff");
    if (!staff) return;

    const { data, error } = await staff.database
      .from("staff_capture_sessions")
      .select("id")
      .limit(1);

    expectRlsSelectDenied({ data, error });
  });

  it("authenticated supervisor cannot INSERT capture sessions", async () => {
    const supervisor = skipIfNoRole("supervisor");
    if (!supervisor) return;

    const { data, error } = await supervisor.database
      .from("staff_capture_sessions")
      .insert([
        {
          session_token: crypto.randomUUID(),
          staff_member_id: "00000000-0000-0000-0000-000000000001",
          staff_nfc_tag_id: "00000000-0000-0000-0000-000000000002",
          venue_id: "00000000-0000-0000-0000-000000000003",
          status: "active",
          expires_at: new Date().toISOString(),
          context_snapshot: {},
        },
      ])
      .select("id");

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  it("authenticated supervisor cannot UPDATE capture sessions", async () => {
    const supervisor = skipIfNoRole("supervisor");
    if (!supervisor) return;

    const { data, error } = await supervisor.database
      .from("staff_capture_sessions")
      .update({ status: "expired" })
      .eq("status", "active")
      .select("id");

    expectRlsWriteNoEffect({ data, error });
  });

  it("admin can SELECT capture sessions at pilot venue", async () => {
    const admin = skipIfNoRole("admin");
    if (!admin) return;

    const { error } = await admin.database
      .from("staff_capture_sessions")
      .select("id")
      .limit(1);

    expect(error).toBeNull();
  });
});
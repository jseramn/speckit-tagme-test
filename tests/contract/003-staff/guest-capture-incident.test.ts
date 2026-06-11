import { describe, expect, it } from "vitest";
import { CaptureError } from "@/lib/capture/errors";
import { submitIncidentRequestSchema } from "@/lib/validators/incident";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe("guest capture incident contract (T064)", () => {
  it("incident schema rejects rating field (Principio IV)", () => {
    const result = submitIncidentRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      category: "mantenimiento",
      description: "AC roto",
      rating: 1,
    });
    expect(result.success).toBe(false);
  });

  it("incident schema accepts category + description without rating", () => {
    const result = submitIncidentRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      category: "mantenimiento",
      description: "El aire acondicionado no enfría",
      priority: "urgente",
    });
    expect(result.success).toBe(true);
  });

  it("incident schema rejects feedback-only fields", () => {
    const result = submitIncidentRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      category: "limpieza",
      description: "Habitación sucia",
      comment: "Muy mal",
      rating: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe.skipIf(!hasInsforge)("guest capture incident integration (T064, T068)", () => {
  it(
    "submits incident on active session with history and department routing",
    async () => {
      const { openCaptureSession } = await import(
        "@/lib/staff/open-capture-session"
      );
      const { submitIncident } = await import("@/lib/capture/submit-incident");
      const { validateSession } = await import(
        "@/lib/staff/validate-session"
      );
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );

      const fingerprint = `test-${Date.now()}-incident`;
      const opened = await openCaptureSession({
        staffTagSlug: "caribe-staff-maria-g",
        clientFingerprint: fingerprint,
      });
      expect(opened).not.toBeNull();

      const result = await submitIncident({
        sessionToken: opened!.sessionToken,
        category: "mantenimiento",
        description: "El aire acondicionado no enfría",
        stayTokenFromCookie: null,
      });

      expect(result.id).toBeTruthy();
      expect(result.status).toBe("abierta");
      expect(result.category).toBe("mantenimiento");
      expect(result.priority).toBeTruthy();
      expect(result.stay.id).toBeTruthy();

      const after = await validateSession(opened!.sessionToken);
      expect(after.status).toBe("expired");

      const insforge = createInsforgeServerClient();
      const { data: incident } = await insforge.database
        .from("incident_reports")
        .select(
          "id, origin_type, staff_member_id, guest_stay_id, department_id, status",
        )
        .eq("id", result.id)
        .maybeSingle();

      expect(incident?.origin_type).toBe("staff_nfc");
      expect(incident?.staff_member_id).toBeTruthy();
      expect(incident?.guest_stay_id).toBe(result.stay.id);
      expect(incident?.department_id).toBeTruthy();
      expect(incident?.status).toBe("abierta");

      const { data: history } = await insforge.database
        .from("incident_status_history")
        .select("from_status, to_status")
        .eq("incident_id", result.id);

      expect(history?.length).toBeGreaterThanOrEqual(1);
      expect(history?.[0]?.from_status).toBeNull();
      expect(history?.[0]?.to_status).toBe("abierta");

      const { data: sessionRow } = await insforge.database
        .from("staff_capture_sessions")
        .select("id")
        .eq("session_token", opened!.sessionToken)
        .maybeSingle();

      const { data: feedbackOverlap } = await insforge.database
        .from("feedback_entries")
        .select("id")
        .eq("staff_capture_session_id", sessionRow?.id ?? "")
        .limit(1);

      expect(feedbackOverlap?.length ?? 0).toBe(0);
    },
    20_000,
  );

  it("returns SESSION_EXPIRED (410) for expired session", async () => {
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );
    const { submitIncident } = await import("@/lib/capture/submit-incident");
    const { randomUUID } = await import("node:crypto");

    const insforge = createInsforgeServerClient();
    const { data: tag } = await insforge.database
      .from("staff_nfc_tags")
      .select("id, staff_member_id, staff_members!inner(venue_id)")
      .eq("tag_slug", "caribe-staff-maria-g")
      .eq("is_active", true)
      .maybeSingle();

    expect(tag?.id).toBeTruthy();

    const staffMembers = tag!.staff_members as
      | { venue_id: string }
      | { venue_id: string }[];
    const venueId = Array.isArray(staffMembers)
      ? staffMembers[0]?.venue_id
      : staffMembers.venue_id;

    const sessionToken = randomUUID();
    const past = new Date(Date.now() - 60_000).toISOString();

    const { data: inserted } = await insforge.database
      .from("staff_capture_sessions")
      .insert([
        {
          session_token: sessionToken,
          staff_member_id: tag!.staff_member_id,
          staff_nfc_tag_id: tag!.id,
          venue_id: venueId,
          status: "active",
          expires_at: past,
          context_snapshot: { display_name: "Test" },
        },
      ])
      .select("id")
      .single();

    expect(inserted?.id).toBeTruthy();

    await expect(
      submitIncident({
        sessionToken,
        category: "mantenimiento",
        description: "AC no enfría",
        stayTokenFromCookie: null,
      }),
    ).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
      statusCode: 410,
    } satisfies Partial<CaptureError>);

    await insforge.database
      .from("staff_capture_sessions")
      .delete()
      .eq("id", inserted!.id);
  });
});
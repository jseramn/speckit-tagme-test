import { describe, expect, it } from "vitest";
import { CaptureError } from "@/lib/capture/errors";
import { submitFeedbackRequestSchema } from "@/lib/validators/feedback";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe("guest capture feedback contract (T027)", () => {
  it("feedback schema rejects incident-only fields", () => {
    const result = submitFeedbackRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      rating: 5,
      category: "mantenimiento",
      description: "AC roto",
      priority: "urgente",
    });
    expect(result.success).toBe(false);
  });

  it("feedback schema accepts rating + optional comment only", () => {
    const result = submitFeedbackRequestSchema.safeParse({
      sessionToken: "550e8400-e29b-41d4-a716-446655440000",
      rating: 4,
      comment: null,
    });
    expect(result.success).toBe(true);
  });
});

describe.skipIf(!hasInsforge)("guest capture feedback integration (T027, T048)", () => {
  it(
    "submits feedback on active session and completes session",
    async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );
    const { submitFeedback } = await import("@/lib/capture/submit-feedback");
    const { validateSession } = await import(
      "@/lib/staff/validate-session"
    );
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );

    const fingerprint = `test-${Date.now()}-feedback`;
    const opened = await openCaptureSession({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: fingerprint,
    });
    expect(opened).not.toBeNull();

    const result = await submitFeedback({
      sessionToken: opened!.sessionToken,
      rating: 5,
      comment: "Excelente atención",
      stayTokenFromCookie: null,
    });

    expect(result.id).toBeTruthy();
    expect(result.message).toBe("¡Gracias por tu opinión!");
    expect(result.stay.id).toBeTruthy();
    expect(result.stayCreated).toBe(true);

    const after = await validateSession(opened!.sessionToken);
    expect(after.status).toBe("expired");

    const insforge = createInsforgeServerClient();
    const { data: sessionRow } = await insforge.database
      .from("staff_capture_sessions")
      .select("status, guest_stay_id")
      .eq("session_token", opened!.sessionToken)
      .maybeSingle();

    expect(sessionRow?.status).toBe("completed");
    expect(sessionRow?.guest_stay_id).toBe(result.stay.id);
    },
    20_000,
  );

  it("returns SESSION_EXPIRED (410) for expired session", async () => {
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );
    const { submitFeedback } = await import("@/lib/capture/submit-feedback");
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
      submitFeedback({
        sessionToken,
        rating: 3,
        comment: null,
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

  it("auto-creates ephemeral stay when guest has no cookie", async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );
    const { submitFeedback } = await import("@/lib/capture/submit-feedback");
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );

    const fingerprint = `test-${Date.now()}-ephemeral`;
    const opened = await openCaptureSession({
      staffTagSlug: "caribe-staff-carlos-p",
      clientFingerprint: fingerprint,
    });
    expect(opened).not.toBeNull();

    const result = await submitFeedback({
      sessionToken: opened!.sessionToken,
      rating: 4,
      comment: null,
      stayTokenFromCookie: null,
    });

    expect(result.stayCreated).toBe(true);

    const insforge = createInsforgeServerClient();
    const { data: stay } = await insforge.database
      .from("guest_stays")
      .select("stay_type, status")
      .eq("id", result.stay.id)
      .maybeSingle();

    expect(stay?.stay_type).toBe("ephemeral");
    expect(stay?.status).toBe("active");
  }, 30_000);
});
import { describe, expect, it } from "vitest";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe.skipIf(!hasInsforge)("feedback traceability (T047)", () => {
  it(
    "persists full origin traceability for staff_nfc feedback",
    async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );
    const { submitFeedback } = await import("@/lib/capture/submit-feedback");
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );

    const fingerprint = `test-${Date.now()}-trace`;
    const opened = await openCaptureSession({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: fingerprint,
    });
    expect(opened).not.toBeNull();

    const submitted = await submitFeedback({
      sessionToken: opened!.sessionToken,
      rating: 5,
      comment: "Trazabilidad test",
      stayTokenFromCookie: null,
    });

    const insforge = createInsforgeServerClient();
    const { data: feedback } = await insforge.database
      .from("feedback_entries")
      .select(
        "origin_type, origin_id, guest_stay_id, staff_member_id, staff_capture_session_id, context_snapshot",
      )
      .eq("id", submitted.id)
      .maybeSingle();

    expect(feedback).toBeTruthy();
    expect(feedback!.origin_type).toBe("staff_nfc");
    expect(feedback!.origin_id).toBeTruthy();
    expect(feedback!.guest_stay_id).toBeTruthy();
    expect(feedback!.staff_member_id).toBeTruthy();
    expect(feedback!.staff_capture_session_id).toBeTruthy();

    const snapshot = feedback!.context_snapshot as Record<string, unknown>;
    expect(snapshot.staff_nfc_tag_id).toBeTruthy();
    expect(snapshot.department_id).toBeTruthy();
    expect(snapshot.display_name).toBeTruthy();
    },
    20_000,
  );
});
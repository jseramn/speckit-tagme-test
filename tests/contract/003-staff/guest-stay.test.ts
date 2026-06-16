import { describe, expect, it } from "vitest";
import {
  closeStayResponseSchema,
  consolidateStayResponseSchema,
  createFormalStayRequestSchema,
  createFormalStayResponseSchema,
  stayLookupResponseSchema,
} from "@/lib/validators/guest-stay";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";
import {
  INTEGRATION_TIMEOUT,
  STAFF_SLUG,
  getPilotVenueId,
  openTestSession,
} from "../../helpers/integration";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe("guest stay contract validators (T051)", () => {
  it("accepts formal stay create request", () => {
    const result = createFormalStayRequestSchema.safeParse({
      venueId: "550e8400-e29b-41d4-a716-446655440000",
      ttlDays: 7,
    });
    expect(result.success).toBe(true);
  });

  it("matches formal stay response shape", () => {
    const result = createFormalStayResponseSchema.safeParse({
      stayId: "550e8400-e29b-41d4-a716-446655440001",
      stayToken: "opaque-token-32chars-minimum-ok",
      stayType: "formal",
      expiresAt: "2026-06-17T10:00:00.000Z",
      cookieSet: true,
    });
    expect(result.success).toBe(true);
  });

  it("matches lookup response shape", () => {
    const result = stayLookupResponseSchema.safeParse({
      stayId: "550e8400-e29b-41d4-a716-446655440001",
      stayType: "ephemeral",
      status: "active",
      startedAt: "2026-06-10T10:00:00.000Z",
      expiresAt: "2026-06-12T10:00:00.000Z",
      recordCounts: { feedbacks: 2, incidents: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("matches close response shape", () => {
    const result = closeStayResponseSchema.safeParse({
      stayId: "550e8400-e29b-41d4-a716-446655440001",
      status: "closed",
      closedAt: "2026-06-10T11:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("matches consolidate response shape", () => {
    const result = consolidateStayResponseSchema.safeParse({
      formalStayId: "550e8400-e29b-41d4-a716-446655440002",
      consolidatedRecords: { feedbacks: 2, incidents: 1 },
      ephemeralStatus: "consolidated",
    });
    expect(result.success).toBe(true);
  });
});

describe.sequential.skipIf(!hasInsforge)("guest stay integration (T051, T061, T062)", () => {
  it(
    "creates formal stay, reuses cookie, closes stay, and requires new stay after close",
    async () => {
      const { createFormalStay } = await import(
        "@/lib/stays/create-formal-stay"
      );
      const { resolveGuestStayForCapture } = await import(
        "@/lib/stays/resolve-guest-stay-for-capture"
      );
      const { closeGuestStay } = await import(
        "@/lib/stays/close-guest-stay"
      );
      const { resolveStayByToken } = await import(
        "@/lib/stays/resolve-stay-by-token"
      );

      const venueId = await getPilotVenueId();

      const formal = await createFormalStay({
        venueId,
        createdByProfileId: null,
        ttlDays: 7,
      });

      expect(formal.stay_type).toBe("formal");
      expect(formal.status).toBe("active");

      const reused = await resolveGuestStayForCapture(
        venueId,
        formal.stay_token,
      );
      expect(reused.created).toBe(false);
      expect(reused.stay.id).toBe(formal.id);

      const closed = await closeGuestStay(formal.id, venueId);
      expect(closed.status).toBe("closed");

      const afterClose = await resolveStayByToken(formal.stay_token);
      expect(afterClose).toBeNull();

      const newEphemeral = await resolveGuestStayForCapture(
        venueId,
        formal.stay_token,
      );
      expect(newEphemeral.created).toBe(true);
      expect(newEphemeral.stay.stay_type).toBe("ephemeral");
    },
    INTEGRATION_TIMEOUT.stayFlow,
  );

  it(
    "consolidates ephemeral into formal with traceability (idempotent)",
    async () => {
      const { submitFeedback } = await import("@/lib/capture/submit-feedback");
      const { consolidateStays } = await import(
        "@/lib/stays/consolidate-stays"
      );
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );

      const venueId = await getPilotVenueId();
      const opened = await openTestSession({ label: "consolidate" });

      const feedback = await submitFeedback({
        sessionToken: opened.sessionToken,
        rating: 4,
        comment: "Walk-in previo",
        stayTokenFromCookie: null,
      });

      expect(feedback.stay.stay_type).toBe("ephemeral");

      const first = await consolidateStays({
        ephemeralStayToken: feedback.stay.stay_token,
        venueId,
        createdByProfileId: null,
      });

      expect(first.ephemeralStatus).toBe("consolidated");
      expect(first.consolidatedRecords.feedbacks).toBeGreaterThanOrEqual(1);

      const second = await consolidateStays({
        ephemeralStayToken: feedback.stay.stay_token,
        venueId,
        createdByProfileId: null,
      });

      expect(second.formalStayId).toBe(first.formalStayId);

      const insforge = createInsforgeServerClient();
      const { data: ephemeral } = await insforge.database
        .from("guest_stays")
        .select("status, consolidated_into, stay_type")
        .eq("id", feedback.stay.id)
        .maybeSingle();

      expect(ephemeral?.status).toBe("consolidated");
      expect(ephemeral?.consolidated_into).toBe(first.formalStayId);
      expect(ephemeral?.stay_type).toBe("ephemeral");

      const { data: movedFeedback } = await insforge.database
        .from("feedback_entries")
        .select("guest_stay_id")
        .eq("id", feedback.id)
        .maybeSingle();

      expect(movedFeedback?.guest_stay_id).toBe(first.formalStayId);
    },
    INTEGRATION_TIMEOUT.stayFlow,
  );

  it(
    "formal cookie prevails over prior ephemeral stay (T062)",
    async () => {
      const { createFormalStay } = await import(
        "@/lib/stays/create-formal-stay"
      );
      const { submitFeedback } = await import("@/lib/capture/submit-feedback");

      const venueId = await getPilotVenueId();

      const opened = await openTestSession({ label: "formal-prevails-walkin" });
      const walkIn = await submitFeedback({
        sessionToken: opened.sessionToken,
        rating: 3,
        comment: "Walk-in sin check-in",
        stayTokenFromCookie: null,
      });

      expect(walkIn.stay.stay_type).toBe("ephemeral");

      const formal = await createFormalStay({
        venueId,
        createdByProfileId: null,
      });

      const opened2 = await openTestSession({
        slug: STAFF_SLUG.secondary,
        label: "formal-prevails-formal",
      });

      const withFormalCookie = await submitFeedback({
        sessionToken: opened2.sessionToken,
        rating: 5,
        comment: null,
        stayTokenFromCookie: formal.stay_token,
      });

      expect(withFormalCookie.stay.id).toBe(formal.id);
      expect(withFormalCookie.stay.stay_type).toBe("formal");
      expect(withFormalCookie.stay.id).not.toBe(walkIn.stay.id);
    },
    INTEGRATION_TIMEOUT.stayFlow,
  );

  it(
    "consolidated ephemeral token does not accept new records (T062)",
    async () => {
      const { submitFeedback } = await import("@/lib/capture/submit-feedback");
      const { consolidateStays } = await import(
        "@/lib/stays/consolidate-stays"
      );

      const venueId = await getPilotVenueId();

      const opened = await openTestSession({ label: "consolidated-reject" });
      const walkIn = await submitFeedback({
        sessionToken: opened.sessionToken,
        rating: 4,
        comment: null,
        stayTokenFromCookie: null,
      });

      await consolidateStays({
        ephemeralStayToken: walkIn.stay.stay_token,
        venueId,
        createdByProfileId: null,
      });

      const opened2 = await openTestSession({
        slug: STAFF_SLUG.secondary,
        label: "consolidated-reject-after",
      });

      const afterConsolidation = await submitFeedback({
        sessionToken: opened2.sessionToken,
        rating: 5,
        comment: null,
        stayTokenFromCookie: walkIn.stay.stay_token,
      });

      expect(afterConsolidation.stayCreated).toBe(true);
      expect(afterConsolidation.stay.stay_type).toBe("ephemeral");
      expect(afterConsolidation.stay.id).not.toBe(walkIn.stay.id);
    },
    INTEGRATION_TIMEOUT.stayFlow,
  );

  it(
    "SC-010 partial: feedback entries always have guest_stay_id after formal + walk-in",
    async () => {
      const { createFormalStay } = await import(
        "@/lib/stays/create-formal-stay"
      );
      const { submitFeedback } = await import("@/lib/capture/submit-feedback");
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );

      const venueId = await getPilotVenueId();
      const formal = await createFormalStay({
        venueId,
        createdByProfileId: null,
      });

      const opened1 = await openTestSession({ label: "sc010-formal" });
      const formalFeedback = await submitFeedback({
        sessionToken: opened1.sessionToken,
        rating: 5,
        comment: null,
        stayTokenFromCookie: formal.stay_token,
      });

      const opened2 = await openTestSession({
        slug: STAFF_SLUG.secondary,
        label: "sc010-walkin",
      });
      const walkInFeedback = await submitFeedback({
        sessionToken: opened2.sessionToken,
        rating: 4,
        comment: null,
        stayTokenFromCookie: null,
      });

      expect(formalFeedback.stay.id).toBe(formal.id);
      expect(walkInFeedback.stay.stay_type).toBe("ephemeral");

      const insforge = createInsforgeServerClient();
      const ids = [formalFeedback.id, walkInFeedback.id];

      for (const id of ids) {
        const { data } = await insforge.database
          .from("feedback_entries")
          .select("guest_stay_id")
          .eq("id", id)
          .maybeSingle();
        expect(data?.guest_stay_id).toBeTruthy();
      }
    },
    INTEGRATION_TIMEOUT.stayFlow,
  );
});
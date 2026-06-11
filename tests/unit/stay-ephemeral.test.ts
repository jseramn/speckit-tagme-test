import { describe, expect, it } from "vitest";
import { STAY_COOKIE_NAME } from "@/lib/stays/cookie";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "../contract/003-staff/helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe("stay cookie contract (T052)", () => {
  it("exports tagme_stay cookie name", () => {
    expect(STAY_COOKIE_NAME).toBe("tagme_stay");
  });
});

describe.skipIf(!hasInsforge)("stay ephemeral behavior (T052)", () => {
  async function getPilotVenueId() {
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );
    const insforge = createInsforgeServerClient();
    const { data } = await insforge.database
      .from("venues")
      .select("id")
      .eq("slug", "hotel-caribe")
      .maybeSingle();
    return data?.id as string;
  }

  it("reuses active stay from cookie instead of creating duplicate", async () => {
    const { createEphemeralStay } = await import(
      "@/lib/stays/create-ephemeral-stay"
    );
    const { resolveGuestStayForCapture } = await import(
      "@/lib/stays/resolve-guest-stay-for-capture"
    );

    const venueId = await getPilotVenueId();
    const first = await createEphemeralStay(venueId);

    const reused = await resolveGuestStayForCapture(venueId, first.stay_token);
    expect(reused.created).toBe(false);
    expect(reused.stay.id).toBe(first.id);
  }, 30_000);

  it("lazy-expires past-TTL stay and creates a new ephemeral", async () => {
    const { createInsforgeServerClient } = await import(
      "@/lib/insforge-server"
    );
    const { resolveStayByToken } = await import(
      "@/lib/stays/resolve-stay-by-token"
    );
    const { resolveGuestStayForCapture } = await import(
      "@/lib/stays/resolve-guest-stay-for-capture"
    );
    const { generateStayToken } = await import(
      "@/lib/stays/generate-stay-token"
    );

    const venueId = await getPilotVenueId();
    const insforge = createInsforgeServerClient();
    const stayToken = generateStayToken();
    const past = new Date(Date.now() - 60_000).toISOString();

    const { data: inserted } = await insforge.database
      .from("guest_stays")
      .insert([
        {
          venue_id: venueId,
          stay_token: stayToken,
          stay_type: "ephemeral",
          status: "active",
          expires_at: past,
        },
      ])
      .select("id")
      .single();

    expect(inserted?.id).toBeTruthy();

    const resolved = await resolveStayByToken(stayToken);
    expect(resolved).toBeNull();

    const fresh = await resolveGuestStayForCapture(venueId, stayToken);
    expect(fresh.created).toBe(true);
    expect(fresh.stay.id).not.toBe(inserted!.id);

    await insforge.database.from("guest_stays").delete().eq("id", inserted!.id);
  });

  it("multiple feedbacks share the same guest_stay_id (G3)", async () => {
    const { openCaptureSession } = await import(
      "@/lib/staff/open-capture-session"
    );
    const { submitFeedback } = await import("@/lib/capture/submit-feedback");
    const { createEphemeralStay } = await import(
      "@/lib/stays/create-ephemeral-stay"
    );

    const venueId = await getPilotVenueId();
    const stay = await createEphemeralStay(venueId);

    const fp1 = `test-${Date.now()}-multi-1`;
    const opened1 = await openCaptureSession({
      staffTagSlug: "caribe-staff-maria-g",
      clientFingerprint: fp1,
    });

    const first = await submitFeedback({
      sessionToken: opened1!.sessionToken,
      rating: 5,
      comment: null,
      stayTokenFromCookie: stay.stay_token,
    });

    const fp2 = `test-${Date.now()}-multi-2`;
    const opened2 = await openCaptureSession({
      staffTagSlug: "caribe-staff-carlos-p",
      clientFingerprint: fp2,
    });

    const second = await submitFeedback({
      sessionToken: opened2!.sessionToken,
      rating: 4,
      comment: null,
      stayTokenFromCookie: stay.stay_token,
    });

    expect(first.stay.id).toBe(stay.id);
    expect(second.stay.id).toBe(stay.id);
    expect(first.id).not.toBe(second.id);
  }, 30_000);
});
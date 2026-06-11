import { describe, expect, it } from "vitest";
import { assertValidTransition } from "@/lib/supervisor/incident-transitions";
import {
  listIncidentsQuerySchema,
  patchIncidentRequestSchema,
} from "@/lib/validators/supervisor-incident";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe("supervisor incidents contract (T065)", () => {
  it("list query accepts status=open filter", () => {
    const result = listIncidentsQuerySchema.safeParse({ status: "open" });
    expect(result.success).toBe(true);
  });

  it("patch schema requires status or assignment", () => {
    const empty = patchIncidentRequestSchema.safeParse({});
    expect(empty.success).toBe(false);

    const statusOnly = patchIncidentRequestSchema.safeParse({
      status: "en_progreso",
    });
    expect(statusOnly.success).toBe(true);
  });

  it("valid transitions follow abierta → en_progreso → resuelta → cerrada", () => {
    expect(() => assertValidTransition("abierta", "en_progreso")).not.toThrow();
    expect(() => assertValidTransition("en_progreso", "resuelta")).not.toThrow();
    expect(() => assertValidTransition("resuelta", "cerrada")).not.toThrow();
    expect(() => assertValidTransition("abierta", "cerrada")).toThrow();
    expect(() => assertValidTransition("cerrada", "abierta")).toThrow();
  });
});

describe.skipIf(!hasInsforge)("supervisor incidents integration (T065, T074)", () => {
  it(
    "manager can list and advance incident through full workflow",
    async () => {
      const { openCaptureSession } = await import(
        "@/lib/staff/open-capture-session"
      );
      const { submitIncident } = await import("@/lib/capture/submit-incident");
      const { listIncidents } = await import(
        "@/lib/supervisor/list-incidents"
      );
      const { updateIncident } = await import(
        "@/lib/supervisor/update-incident"
      );
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );

      const opened = await openCaptureSession({
        staffTagSlug: "caribe-staff-roberto-h",
        clientFingerprint: `test-${Date.now()}-supervisor-flow`,
      });
      expect(opened).not.toBeNull();

      const created = await submitIncident({
        sessionToken: opened!.sessionToken,
        category: "mantenimiento",
        description: "Fuga de agua en baño",
        stayTokenFromCookie: null,
      });

      const insforge = createInsforgeServerClient();
      const { data: managerProfile } = await insforge.database
        .from("user_profiles")
        .select("id, venue_id, role, display_name")
        .eq("role", "manager")
        .limit(1)
        .maybeSingle();

      expect(managerProfile?.id).toBeTruthy();

      const managerSession = {
        userId: "test-manager",
        profileId: managerProfile!.id as string,
        role: "manager" as const,
        venueId: managerProfile!.venue_id as string,
        venueName: "Hotel Caribe",
        venueSlug: "hotel-caribe",
        displayName: managerProfile!.display_name as string,
        staffMemberId: null,
      };

      const listed = await listIncidents(managerSession, { status: "abierta" });
      const found = listed.items.find((item) => item.id === created.id);
      expect(found).toBeTruthy();
      expect(found?.originLabel).toContain("NFC Staff");

      await updateIncident(managerSession, created.id, {
        status: "en_progreso",
        note: "Técnico asignado",
      });
      await updateIncident(managerSession, created.id, {
        status: "resuelta",
      });
      await updateIncident(managerSession, created.id, {
        status: "cerrada",
      });

      const { data: history } = await insforge.database
        .from("incident_status_history")
        .select("from_status, to_status")
        .eq("incident_id", created.id)
        .order("changed_at", { ascending: true });

      expect(history?.length).toBeGreaterThanOrEqual(4);
    },
    30_000,
  );
});
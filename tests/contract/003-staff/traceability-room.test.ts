import { describe, expect, it } from "vitest";
import {
  hasInsforgeIntegrationEnv,
  loadTestEnv,
} from "./helpers/load-env";

loadTestEnv();

const hasInsforge = hasInsforgeIntegrationEnv();

describe.skipIf(!hasInsforge)("room NFC traceability (T087)", () => {
  it(
    "persists feedback with origin_type=room_nfc, null staff_member_id, room_number snapshot",
    async () => {
      const { submitFeedback } = await import("@/lib/capture/submit-feedback");
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );

      const submitted = await submitFeedback({
        roomTagSlug: "caribe-room-412",
        rating: 4,
        comment: "Muy cómoda la habitación",
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
      expect(feedback!.origin_type).toBe("room_nfc");
      expect(feedback!.origin_id).toBeTruthy();
      expect(feedback!.guest_stay_id).toBeTruthy();
      expect(feedback!.staff_member_id).toBeNull();
      expect(feedback!.staff_capture_session_id).toBeNull();

      const snapshot = feedback!.context_snapshot as Record<string, unknown>;
      expect(snapshot.origin_type).toBe("room_nfc");
      expect(snapshot.nfc_tag_id).toBeTruthy();
      expect(snapshot.room_number).toBe("412");
      expect(snapshot.zone).toBe("room");
      expect(snapshot.staff_member_id).toBeUndefined();
    },
    20_000,
  );

  it(
    "persists room incident with same workflow as staff-led (history + routing)",
    async () => {
      const { submitIncident } = await import("@/lib/capture/submit-incident");
      const { createInsforgeServerClient } = await import(
        "@/lib/insforge-server"
      );

      const submitted = await submitIncident({
        roomTagSlug: "caribe-room-412",
        category: "mantenimiento",
        description: "El aire acondicionado no enfría la habitación",
        stayTokenFromCookie: null,
      });

      expect(submitted.status).toBe("abierta");
      expect(submitted.category).toBe("mantenimiento");

      const insforge = createInsforgeServerClient();
      const { data: incident } = await insforge.database
        .from("incident_reports")
        .select(
          "origin_type, staff_member_id, guest_stay_id, department_id, status, context_snapshot",
        )
        .eq("id", submitted.id)
        .maybeSingle();

      expect(incident?.origin_type).toBe("room_nfc");
      expect(incident?.staff_member_id).toBeNull();
      expect(incident?.guest_stay_id).toBeTruthy();
      expect(incident?.department_id).toBeTruthy();
      expect(incident?.status).toBe("abierta");

      const snapshot = incident!.context_snapshot as Record<string, unknown>;
      expect(snapshot.room_number).toBe("412");

      const { data: history } = await insforge.database
        .from("incident_status_history")
        .select("from_status, to_status, note")
        .eq("incident_id", submitted.id);

      expect(history?.length).toBeGreaterThanOrEqual(1);
      expect(history?.[0]?.to_status).toBe("abierta");
      expect(history?.[0]?.from_status).toBeNull();
    },
    20_000,
  );
});
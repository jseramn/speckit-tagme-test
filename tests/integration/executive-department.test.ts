import { describe, expect, it } from "vitest";
import { departmentDashboardResponseSchema } from "@/lib/validators/executive";

describe("executive-department integration (M4)", () => {
  it("operations dashboard schema accepts M4 payload", () => {
    const payload = departmentDashboardResponseSchema.parse({
      scope: "operations",
      label: "Operaciones",
      period: "7d",
      fetchedAt: new Date().toISOString(),
      baselineStatus: {
        ready: false,
        day: 3,
        totalTouches: 42,
        firstTouchAt: "2026-06-01T14:30:00.000Z",
      },
      kpis: [],
      zoneHeatmap: [{ zone: "room", hour: 20, touches: 5 }],
      tagRanking: [
        {
          tagId: "11111111-1111-4111-a111-111111111111",
          slug: "caribe-room-412",
          label: "Habitación 412",
          zone: "room",
          roomNumber: "412",
          touches: 18,
        },
      ],
      atypicalRooms: [
        {
          roomNumber: "412",
          label: "Habitación 412",
          sessionCount: 12,
          venueAvg: 3.3,
          multiplier: 3.6,
          tagId: "11111111-1111-4111-a111-111111111111",
        },
      ],
      nfcFriction: [{ channel: "nfc", count: 80, pct: 68 }],
      avexEffectiveness: [],
      topDerivationTopics: [],
      topAlerts: [],
    });

    expect(payload.scope).toBe("operations");
    expect(payload.atypicalRooms[0]?.roomNumber).toBe("412");
  });

  it("front_office dashboard schema includes AVEX topics (SC-G009)", () => {
    const payload = departmentDashboardResponseSchema.parse({
      scope: "front_office",
      label: "Recepción",
      period: "7d",
      fetchedAt: new Date().toISOString(),
      baselineStatus: {
        ready: true,
        day: 14,
        totalTouches: 200,
        firstTouchAt: "2026-05-20T10:00:00.000Z",
      },
      kpis: [],
      zoneHeatmap: [],
      tagRanking: [],
      atypicalRooms: [],
      nfcFriction: [],
      avexEffectiveness: [
        {
          day: "2026-06-09",
          sessions: 50,
          resolved: 35,
          escalated: 15,
          derivation_pct: 30,
        },
      ],
      topDerivationTopics: [
        "horarios restaurante",
        "room service",
        "wifi / conexión",
      ],
      topAlerts: [],
    });

    expect(payload.topDerivationTopics).toHaveLength(3);
    expect(payload.avexEffectiveness[0]?.derivation_pct).toBe(30);
  });
});
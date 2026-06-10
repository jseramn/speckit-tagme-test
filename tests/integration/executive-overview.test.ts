import { describe, expect, it } from "vitest";
import { enrichKpiWithNarrative } from "@/lib/executive/narrative";
import { computeRoiFromCounts } from "@/lib/executive/roi";
import {
  kpiCardSchema,
  overviewResponseSchema,
  roiSummarySchema,
} from "@/lib/validators/executive";

describe("executive-overview integration", () => {
  it("overview response schema accepts M2 payload shape", () => {
    const payload = overviewResponseSchema.parse({
      venueId: "22222222-2222-4222-a222-222222222222",
      period: "7d",
      fetchedAt: new Date().toISOString(),
      baselineStatus: {
        ready: false,
        day: 3,
        totalTouches: 42,
        firstTouchAt: "2026-06-01T14:30:00.000Z",
      },
      kpis: [
        enrichKpiWithNarrative({
          key: "total_interactions",
          layer: "performance",
          department: "executive",
          value: 128,
          target: 150,
          comparison: "gte",
          deltaPct: 8.2,
          onTarget: null,
        }),
      ],
      trend: [{ day: "2026-06-03", touches: 18 }],
      roi: roiSummarySchema.parse({
        staffMinutesSaved: 24.5,
        selfServiceMinutes: 8,
        totalMinutes: 32.5,
        deltaPct: 5.1,
        label: "Estimado operativo",
      }),
      departmentSummaries: [
        {
          scope: "operations",
          label: "Operaciones",
          primaryKpi: kpiCardSchema.parse({
            key: "nfc_direct_rate",
            label: "Acceso NFC directo",
            definition: "% toques NFC",
            layer: "performance",
            department: "operations",
            value: 68,
            target: 70,
            comparison: "gte",
            deltaPct: -2,
            onTarget: null,
            suggestedAction: null,
          }),
          alertCount: 0,
        },
      ],
      topAlerts: [],
    });

    expect(payload.kpis[0]?.label).toBe("Interacciones totales");
    expect(payload.roi.totalMinutes).toBe(32.5);
  });

  it("ROI headline matches CL-07 fixture (7 resolved × 3.5)", () => {
    const roi = computeRoiFromCounts({
      resolvedSessions: 7,
      selfServiceTouches: 0,
    });
    expect(roi.staffMinutesSaved).toBe(24.5);
  });
});
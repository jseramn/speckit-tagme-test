import { describe, expect, it } from "vitest";
import { weeklyReportToCsv } from "@/lib/executive/reports/weekly-summary";
import { weeklyReportSummarySchema } from "@/lib/validators/executive";

describe("executive-reports (M5)", () => {
  const sampleReport = weeklyReportSummarySchema.parse({
    venueId: "11111111-1111-4111-a111-111111111111",
    venueName: "Hotel Caribe",
    period: "7d",
    from: "2026-06-01",
    to: "2026-06-08",
    generatedAt: new Date().toISOString(),
    hasData: true,
    baselineStatus: {
      ready: true,
      day: 14,
      totalTouches: 200,
      firstTouchAt: "2026-05-20T10:00:00.000Z",
    },
    totalTouches: 128,
    previousTotalTouches: 110,
    touchesDeltaPct: 16.4,
    touchesDaily: [
      { day: "2026-06-07", touches: 22 },
      { day: "2026-06-08", touches: 18 },
    ],
    topZones: [
      { zone: "lobby", touches: 45 },
      { zone: "restaurant", touches: 30 },
    ],
    destinationBreakdown: [
      { type: "menu", count: 40, percentage: 50 },
      { type: "avex", count: 20, percentage: 25 },
    ],
    avex: {
      sessions: 50,
      resolved: 35,
      escalated: 15,
      derivationPct: 30,
    },
    alerts: {
      total: 4,
      critical: 1,
      attention: 3,
      acknowledged: 2,
    },
    kpis: [],
    roi: {
      staffMinutesSaved: 24.5,
      selfServiceMinutes: 8,
      totalMinutes: 32.5,
      deltaPct: 5.1,
      label: "Estimado operativo",
    },
  });

  it("CSV includes required M5 dimensions", () => {
    const csv = weeklyReportToCsv(sampleReport);
    expect(csv).toContain("INTERACCIONES POR DÍA");
    expect(csv).toContain("TOP ZONAS");
    expect(csv).toContain("DESTINOS");
    expect(csv).toContain("ALERTAS");
    expect(csv).toContain("lobby,45");
    expect(csv).toContain("menu,40,50");
  });

  it("CSV handles empty period explicitly", () => {
    const empty = { ...sampleReport, hasData: false, totalTouches: 0 };
    const csv = weeklyReportToCsv(empty);
    expect(csv).toContain("Sin actividad");
  });
});
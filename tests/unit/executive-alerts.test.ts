import { describe, expect, it } from "vitest";
import {
  computeWindowStart,
  shouldEscalate,
  apiSeverityToDb,
  dbSeverityToApi,
} from "@/lib/executive/alerts/dedup";
import { isWithinOperatingHours } from "@/lib/executive/alerts/operating-hours";
import {
  buildBaselineMap,
  evaluateActivityDrop,
} from "@/lib/executive/alerts/rules/activity-drop";
import { evaluateAvexDerivation } from "@/lib/executive/alerts/rules/avex-derivation";
import { evaluateTagInactive } from "@/lib/executive/alerts/rules/tag-inactive";

const BOGOTA_HOURS = {
  start: "06:00",
  end: "23:00",
  timezone: "America/Bogota",
};

describe("executive-alerts dedup (CL-02)", () => {
  it("truncates timestamps to 4h buckets", () => {
    const now = new Date("2026-06-09T14:30:00.000Z");
    const bucket = computeWindowStart(now, 4);
    expect(bucket.toISOString()).toBe("2026-06-09T12:00:00.000Z");
  });

  it("allows severity escalation within same window", () => {
    expect(shouldEscalate("warning", "critical")).toBe(true);
    expect(shouldEscalate("critical", "attention")).toBe(false);
    expect(shouldEscalate("warning", "attention")).toBe(false);
  });

  it("maps API severity to DB values", () => {
    expect(apiSeverityToDb("attention")).toBe("warning");
    expect(apiSeverityToDb("critical")).toBe("critical");
    expect(dbSeverityToApi("warning")).toBe("attention");
    expect(dbSeverityToApi("critical")).toBe("critical");
  });
});

describe("executive-alerts tag-inactive (CL-03/10)", () => {
  const now = new Date("2026-06-09T18:00:00.000Z");

  it("creates critical alert for disabled tag without baseline", () => {
    const alerts = evaluateTagInactive({
      tags: [
        {
          id: "tag-1",
          slug: "lobby-main",
          label: "Lobby",
          zone: "lobby",
          is_active: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      lastTouchByTag: new Map(),
      venueTouchesToday: 10,
      config: {
        inactive_hours: 24,
        min_venue_touches_per_day: 5,
        grace_hours: 72,
        operating_hours: BOGOTA_HOURS,
      },
      now,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("critical");
    expect(alerts[0]?.dbAlertType).toBe("tag_disabled");
    expect(alerts[0]?.requiresBaseline).toBe(false);
  });

  it("skips inactive alert during grace period", () => {
    const alerts = evaluateTagInactive({
      tags: [
        {
          id: "tag-2",
          slug: "room-101",
          label: "Hab 101",
          zone: "room",
          is_active: true,
          created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      lastTouchByTag: new Map(),
      venueTouchesToday: 10,
      config: {
        inactive_hours: 24,
        min_venue_touches_per_day: 5,
        grace_hours: 72,
        operating_hours: BOGOTA_HOURS,
      },
      now,
    });

    expect(alerts).toHaveLength(0);
  });
});

describe("executive-alerts activity-drop (CL-02)", () => {
  const now = new Date("2026-06-09T18:00:00.000Z");

  it("skips when drop is below attention threshold", () => {
    const baseline = buildBaselineMap([
      { zone: "lobby", dow: 1, hour: 13, median_touches: 10 },
    ]);

    const alerts = evaluateActivityDrop({
      zones: ["lobby"],
      currentTouchesByZone: new Map([["lobby", 8]]),
      baselineByZoneHour: baseline,
      config: {
        attention_drop_pct: 40,
        critical_drop_pct: 60,
        min_delta_touches_attention: 3,
        min_delta_touches_critical: 5,
        evaluation_window_min: 60,
        dedup_window_hours: 4,
        operating_hours: BOGOTA_HOURS,
      },
      now,
      dow: 1,
      hour: 13,
    });

    expect(alerts).toHaveLength(0);
  });

  it("creates attention alert at 40% drop with min delta", () => {
    const baseline = buildBaselineMap([
      { zone: "lobby", dow: 1, hour: 13, median_touches: 10 },
    ]);

    const alerts = evaluateActivityDrop({
      zones: ["lobby"],
      currentTouchesByZone: new Map([["lobby", 5]]),
      baselineByZoneHour: baseline,
      config: {
        attention_drop_pct: 40,
        critical_drop_pct: 60,
        min_delta_touches_attention: 3,
        min_delta_touches_critical: 5,
        evaluation_window_min: 60,
        dedup_window_hours: 4,
        operating_hours: BOGOTA_HOURS,
      },
      now,
      dow: 1,
      hour: 13,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("attention");
    expect(alerts[0]?.requiresBaseline).toBe(true);
  });

  it("creates critical alert at 60% drop", () => {
    const baseline = buildBaselineMap([
      { zone: "lobby", dow: 1, hour: 13, median_touches: 10 },
    ]);

    const alerts = evaluateActivityDrop({
      zones: ["lobby"],
      currentTouchesByZone: new Map([["lobby", 3]]),
      baselineByZoneHour: baseline,
      config: {
        attention_drop_pct: 40,
        critical_drop_pct: 60,
        min_delta_touches_attention: 3,
        min_delta_touches_critical: 5,
        evaluation_window_min: 60,
        dedup_window_hours: 4,
        operating_hours: BOGOTA_HOURS,
      },
      now,
      dow: 1,
      hour: 13,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("critical");
  });
});

describe("executive-alerts avex-derivation (CL-04)", () => {
  it("requires minimum sessions before alerting", () => {
    const alerts = evaluateAvexDerivation({
      sessionCount: 2,
      escalatedCount: 2,
      config: {
        attention_pct: 25,
        critical_pct: 40,
        window_hours: 1,
        min_sessions_attention: 4,
        min_sessions_critical: 6,
        dedup_window_hours: 4,
      },
    });
    expect(alerts).toHaveLength(0);
  });

  it("creates attention alert at 25% with 4 sessions", () => {
    const alerts = evaluateAvexDerivation({
      sessionCount: 4,
      escalatedCount: 1,
      config: {
        attention_pct: 25,
        critical_pct: 40,
        window_hours: 1,
        min_sessions_attention: 4,
        min_sessions_critical: 6,
        dedup_window_hours: 4,
      },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("attention");
  });

  it("creates critical alert at 40% with 6 sessions", () => {
    const alerts = evaluateAvexDerivation({
      sessionCount: 6,
      escalatedCount: 3,
      config: {
        attention_pct: 25,
        critical_pct: 40,
        window_hours: 1,
        min_sessions_attention: 4,
        min_sessions_critical: 6,
        dedup_window_hours: 4,
      },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe("critical");
  });
});

describe("executive-alerts operating hours", () => {
  it("detects within Bogota operating hours", () => {
    const midday = new Date("2026-06-09T18:00:00.000Z");
    expect(isWithinOperatingHours(midday, BOGOTA_HOURS)).toBe(true);
  });

  it("detects outside operating hours", () => {
    const night = new Date("2026-06-10T05:00:00.000Z");
    expect(isWithinOperatingHours(night, BOGOTA_HOURS)).toBe(false);
  });
});
import { subMinutes } from "date-fns";
import type { ActivityDropThresholdConfig } from "@/types/executive";
import { isWithinOperatingHours } from "../operating-hours";
import type { AlertCandidate } from "../types";
import { departmentForZone } from "./zone-department";

export interface ZoneBaselineRow {
  zone: string;
  dow: number;
  hour: number;
  median_touches: number;
}

export interface ActivityDropInput {
  zones: string[];
  currentTouchesByZone: Map<string, number>;
  baselineByZoneHour: Map<string, number>;
  config: ActivityDropThresholdConfig;
  now: Date;
  dow: number;
  hour: number;
}

function baselineKey(zone: string, dow: number, hour: number): string {
  return `${zone}:${dow}:${hour}`;
}

export function buildBaselineMap(
  rows: ZoneBaselineRow[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(
      baselineKey(row.zone, row.dow, row.hour),
      Number(row.median_touches),
    );
  }
  return map;
}

/**
 * CL-02: zone activity drop vs 28-day hourly median baseline.
 */
export function evaluateActivityDrop(
  input: ActivityDropInput,
): AlertCandidate[] {
  const {
    zones,
    currentTouchesByZone,
    baselineByZoneHour,
    config,
    now,
    dow,
    hour,
  } = input;

  if (
    !isWithinOperatingHours(now, config.operating_hours)
  ) {
    return [];
  }

  const results: AlertCandidate[] = [];

  for (const zone of zones) {
    const current = currentTouchesByZone.get(zone) ?? 0;
    const baseline =
      baselineByZoneHour.get(baselineKey(zone, dow, hour)) ?? 0;

    if (baseline <= 0) continue;

    const dropPct = ((baseline - current) / baseline) * 100;
    if (dropPct < config.attention_drop_pct) continue;

    const delta = baseline - current;
    let severity: "attention" | "critical" = "attention";

    if (
      dropPct >= config.critical_drop_pct &&
      delta >= config.min_delta_touches_critical
    ) {
      severity = "critical";
    } else if (delta < config.min_delta_touches_attention) {
      continue;
    }

    results.push({
      dbAlertType: "activity_drop",
      apiAlertType: "activity_drop",
      severity,
      department: departmentForZone(zone),
      entityRef: zone,
      message: `Caída de actividad en ${zone}: ${Math.round(dropPct)}% bajo la mediana (${current} vs ${Math.round(baseline)} toques)`,
      suggestedAction:
        severity === "critical"
          ? "Desplegar supervisión en zona y verificar tags y conectividad."
          : "Monitorear la zona y confirmar staffing o señalización.",
      requiresBaseline: true,
    });
  }

  return results;
}

export function countTouchesInWindow(
  touches: Array<{ zone: string; created_at: string }>,
  windowMin: number,
  now: Date,
): Map<string, number> {
  const since = subMinutes(now, windowMin);
  const counts = new Map<string, number>();

  for (const touch of touches) {
    const at = new Date(touch.created_at);
    if (at < since || at > now) continue;
    counts.set(touch.zone, (counts.get(touch.zone) ?? 0) + 1);
  }

  return counts;
}
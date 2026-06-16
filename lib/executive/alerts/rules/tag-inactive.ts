import { subHours } from "date-fns";
import type { TagInactiveThresholdConfig } from "@/types/executive";
import { isWithinOperatingHours } from "../operating-hours";
import type { AlertCandidate, TagRow } from "../types";
import { departmentForZone } from "./zone-department";

export interface TagInactiveInput {
  tags: TagRow[];
  lastTouchByTag: Map<string, string>;
  venueTouchesToday: number;
  config: TagInactiveThresholdConfig;
  now: Date;
}

/**
 * CL-03/10: disabled tag → critical immediately; active tag with no touches
 * in 24 h during operating hours when venue is active → attention.
 */
export function evaluateTagInactive(
  input: TagInactiveInput,
): AlertCandidate[] {
  const { tags, lastTouchByTag, venueTouchesToday, config, now } = input;
  const results: AlertCandidate[] = [];
  const graceCutoff = subHours(now, config.grace_hours);
  const inactiveCutoff = subHours(now, config.inactive_hours);
  const inOperatingHours = isWithinOperatingHours(
    now,
    config.operating_hours,
  );

  for (const tag of tags) {
    if (!tag.is_active) {
      results.push({
        dbAlertType: "tag_disabled",
        apiAlertType: "tag_inactive",
        severity: "critical",
        department: departmentForZone(tag.zone),
        entityRef: tag.id,
        message: `Tag desactivado: ${tag.label} (${tag.slug})`,
        suggestedAction:
          "Verificar estado del tag en admin y reactivar o reemplazar el punto NFC.",
        requiresBaseline: false,
      });
      continue;
    }

    const tagCreated = new Date(tag.created_at);
    if (tagCreated > graceCutoff) continue;

    const lastTouchIso = lastTouchByTag.get(tag.id);
    if (lastTouchIso && new Date(lastTouchIso) > inactiveCutoff) continue;

    if (!inOperatingHours) continue;
    if (venueTouchesToday < config.min_venue_touches_per_day) continue;

    results.push({
      dbAlertType: "tag_inactive",
      apiAlertType: "tag_inactive",
      severity: "attention",
      department: departmentForZone(tag.zone),
      entityRef: tag.id,
      message: `Sin actividad en ${config.inactive_hours} h: ${tag.label} (${tag.zone})`,
      suggestedAction:
        "Revisar señalización NFC y estado físico del tag con el equipo de operaciones.",
      requiresBaseline: false,
    });
  }

  return results;
}
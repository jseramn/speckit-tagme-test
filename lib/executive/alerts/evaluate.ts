import { startOfDay, subHours, subMinutes } from "date-fns";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  activityDropThresholdConfigSchema,
  avexDerivationThresholdConfigSchema,
  tagInactiveThresholdConfigSchema,
} from "@/lib/validators/executive";
import { getBaselineStatus, isBaselineReady } from "../baseline";
import {
  apiSeverityToDb,
  buildDedupKey,
  computeWindowStart,
  shouldEscalate,
} from "./dedup";
import {
  buildBaselineMap,
  countTouchesInWindow,
  evaluateActivityDrop,
  type ZoneBaselineRow,
} from "./rules/activity-drop";
import { evaluateAvexDerivation } from "./rules/avex-derivation";
import { evaluateTagInactive } from "./rules/tag-inactive";
import type {
  AlertCandidate,
  PersistedAlertRow,
  TagRow,
  ThresholdBundle,
} from "./types";

export interface EvaluateResult {
  venueId: string;
  evaluated: number;
  created: number;
  updated: number;
  skipped: number;
}

const DEFAULT_DEDUP_HOURS = 4;

async function loadThresholds(venueId: string): Promise<ThresholdBundle> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("alert_thresholds")
    .select("alert_type, department, config, is_active")
    .eq("venue_id", venueId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const bundle: ThresholdBundle = {
    activityDrop: null,
    tagInactive: null,
    avexDerivation: null,
  };

  for (const row of data ?? []) {
    const alertType = row.alert_type as string;
    const config = row.config as Record<string, unknown>;

    if (alertType === "activity_drop") {
      const parsed = activityDropThresholdConfigSchema.safeParse(config);
      if (parsed.success) bundle.activityDrop = parsed.data;
    } else if (alertType === "tag_inactive") {
      const parsed = tagInactiveThresholdConfigSchema.safeParse(config);
      if (parsed.success) bundle.tagInactive = parsed.data;
    } else if (alertType === "avex_derivation") {
      const parsed = avexDerivationThresholdConfigSchema.safeParse(config);
      if (parsed.success) bundle.avexDerivation = parsed.data;
    }
  }

  return bundle;
}

function venueLocalDowHour(
  at: Date,
  timezone: string,
): { dow: number; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(at);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");

  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return { dow: dowMap[weekday] ?? 0, hour };
}

async function collectCandidates(
  venueId: string,
  thresholds: ThresholdBundle,
  baselineReady: boolean,
  now: Date,
): Promise<AlertCandidate[]> {
  const insforge = createInsforgeServerClient();
  const candidates: AlertCandidate[] = [];

  const { data: venue } = await insforge.database
    .from("venues")
    .select("timezone")
    .eq("id", venueId)
    .maybeSingle();

  const timezone = (venue?.timezone as string) ?? "America/Bogota";
  const { dow, hour } = venueLocalDowHour(now, timezone);

  const { data: tags, error: tagsError } = await insforge.database
    .from("nfc_tags")
    .select("id, slug, label, zone, is_active, created_at")
    .eq("venue_id", venueId);

  if (tagsError) throw new Error(tagsError.message);
  const tagRows = (tags ?? []) as TagRow[];

  if (thresholds.tagInactive) {
    const dayStart = startOfDay(now).toISOString();
    const { data: todayTouches } = await insforge.database
      .from("touch_events")
      .select("id")
      .eq("venue_id", venueId)
      .eq("deduplicated", false)
      .gte("created_at", dayStart);

    const { data: tagTouches } = await insforge.database
      .from("touch_events")
      .select("tag_id, created_at")
      .eq("venue_id", venueId)
      .eq("deduplicated", false)
      .order("created_at", { ascending: false });

    const lastTouchByTag = new Map<string, string>();
    for (const row of tagTouches ?? []) {
      const tagId = row.tag_id as string;
      if (!lastTouchByTag.has(tagId)) {
        lastTouchByTag.set(tagId, row.created_at as string);
      }
    }

    candidates.push(
      ...evaluateTagInactive({
        tags: tagRows,
        lastTouchByTag,
        venueTouchesToday: (todayTouches ?? []).length,
        config: thresholds.tagInactive,
        now,
      }),
    );
  }

  if (baselineReady && thresholds.activityDrop) {
    const windowMin = thresholds.activityDrop.evaluation_window_min;
    const since = subMinutes(now, windowMin).toISOString();

    const { data: recentTouches } = await insforge.database
      .from("touch_events")
      .select("created_at, nfc_tags ( zone )")
      .eq("venue_id", venueId)
      .eq("deduplicated", false)
      .gte("created_at", since);

    type TouchRow = {
      created_at: string;
      nfc_tags: { zone: string } | { zone: string }[] | null;
    };

    const touchRows = (recentTouches ?? []) as TouchRow[];
    const flattened = touchRows
      .map((t) => {
        const tag = Array.isArray(t.nfc_tags) ? t.nfc_tags[0] : t.nfc_tags;
        return tag ? { zone: tag.zone, created_at: t.created_at } : null;
      })
      .filter((t): t is { zone: string; created_at: string } => t !== null);

    const zones = [...new Set(tagRows.map((t) => t.zone))];
    const currentByZone = countTouchesInWindow(
      flattened,
      windowMin,
      now,
    );

    const { data: baselineRows } = await insforge.database
      .from("v_hourly_baseline_median")
      .select("zone, dow, hour, median_touches")
      .eq("venue_id", venueId);

    candidates.push(
      ...evaluateActivityDrop({
        zones,
        currentTouchesByZone: currentByZone,
        baselineByZoneHour: buildBaselineMap(
          (baselineRows ?? []) as ZoneBaselineRow[],
        ),
        config: thresholds.activityDrop,
        now,
        dow,
        hour,
      }),
    );
  }

  if (thresholds.avexDerivation) {
    const since = subHours(
      now,
      thresholds.avexDerivation.window_hours,
    ).toISOString();

    const { data: sessions } = await insforge.database
      .from("avex_sessions")
      .select("id")
      .eq("venue_id", venueId)
      .gte("created_at", since);

    const sessionIds = (sessions ?? []).map((s) => s.id as string);
    let escalatedCount = 0;

    if (sessionIds.length > 0) {
      const { data: escalated } = await insforge.database
        .from("avex_messages")
        .select("session_id")
        .in("session_id", sessionIds)
        .eq("escalated", true);

      escalatedCount = new Set(
        (escalated ?? []).map((m) => m.session_id as string),
      ).size;
    }

    candidates.push(
      ...evaluateAvexDerivation({
        sessionCount: sessionIds.length,
        escalatedCount,
        config: thresholds.avexDerivation,
      }),
    );
  }

  return candidates;
}

function dedupHoursFor(candidate: AlertCandidate, thresholds: ThresholdBundle): number {
  if (candidate.dbAlertType === "activity_drop") {
    return thresholds.activityDrop?.dedup_window_hours ?? DEFAULT_DEDUP_HOURS;
  }
  if (candidate.dbAlertType === "avex_derivation") {
    return thresholds.avexDerivation?.dedup_window_hours ?? DEFAULT_DEDUP_HOURS;
  }
  return DEFAULT_DEDUP_HOURS;
}

async function persistCandidate(
  venueId: string,
  candidate: AlertCandidate,
  thresholds: ThresholdBundle,
  now: Date,
): Promise<"created" | "updated" | "skipped"> {
  const insforge = createInsforgeServerClient();
  const dedupHours = dedupHoursFor(candidate, thresholds);
  const windowStart = computeWindowStart(now, dedupHours);
  const dedupKey = buildDedupKey(
    venueId,
    candidate.dbAlertType,
    candidate.entityRef,
    windowStart,
  );

  let existingQuery = insforge.database
    .from("executive_alerts")
    .select("id, severity, status")
    .eq("venue_id", venueId)
    .eq("alert_type", candidate.dbAlertType)
    .eq("window_start", windowStart.toISOString());

  existingQuery = candidate.entityRef
    ? existingQuery.eq("entity_ref", candidate.entityRef)
    : existingQuery.is("entity_ref", null);

  const { data: existing } = await existingQuery.maybeSingle();

  const dbSeverity = apiSeverityToDb(candidate.severity);

  if (existing) {
    const row = existing as PersistedAlertRow & { status: string };
    if (row.status !== "active") return "skipped";
    if (!shouldEscalate(row.severity, candidate.severity)) return "skipped";

    const { error } = await insforge.database
      .from("executive_alerts")
      .update({
        severity: dbSeverity,
        message: candidate.message,
        suggested_action: candidate.suggestedAction,
        updated_at: now.toISOString(),
      })
      .eq("id", row.id);

    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await insforge.database.from("executive_alerts").insert([
    {
      venue_id: venueId,
      alert_type: candidate.dbAlertType,
      severity: dbSeverity,
      status: "active",
      department: candidate.department,
      entity_ref: candidate.entityRef,
      message: candidate.message,
      suggested_action: candidate.suggestedAction,
      dedup_key: dedupKey,
      window_start: windowStart.toISOString(),
    },
  ]);

  if (error) throw new Error(error.message);
  return "created";
}

export async function evaluateAlertsForVenue(
  venueId: string,
  now = new Date(),
): Promise<EvaluateResult> {
  const [thresholds, baseline] = await Promise.all([
    loadThresholds(venueId),
    getBaselineStatus(venueId),
  ]);

  const baselineReady = isBaselineReady(baseline);
  const candidates = await collectCandidates(
    venueId,
    thresholds,
    baselineReady,
    now,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (candidate.requiresBaseline && !baselineReady) {
      skipped += 1;
      continue;
    }

    const outcome = await persistCandidate(
      venueId,
      candidate,
      thresholds,
      now,
    );
    if (outcome === "created") created += 1;
    else if (outcome === "updated") updated += 1;
    else skipped += 1;
  }

  return {
    venueId,
    evaluated: candidates.length,
    created,
    updated,
    skipped,
  };
}

export async function evaluateAllPilotVenues(
  now = new Date(),
): Promise<EvaluateResult[]> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("venues")
    .select("id")
    .eq("is_pilot", true);

  if (error) throw new Error(error.message);

  const results: EvaluateResult[] = [];
  for (const venue of data ?? []) {
    results.push(
      await evaluateAlertsForVenue(venue.id as string, now),
    );
  }
  return results;
}
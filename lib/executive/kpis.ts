import { createInsforgeServerClient } from "@/lib/insforge-server";
import type {
  KpiCard,
  KpiComparison,
  KpiDepartment,
  KpiPeriod,
  KpiTarget,
} from "@/types/executive";
import { isBaselineReady, getBaselineStatus } from "./baseline";
import {
  getAbandonment,
  getAvexEffectiveness,
  getChannelBreakdown,
  getTrends,
} from "./queries";
import { deltaPct, resolveExecutivePeriod, type ExecutivePeriod } from "./period";

interface KpiTargetRow {
  id: string;
  venue_id: string;
  department: string;
  kpi_key: string;
  period: string;
  target_value: number;
  comparison: string;
}

export async function loadTargets(venueId: string): Promise<KpiTarget[]> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("kpi_targets")
    .select("*")
    .eq("venue_id", venueId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as KpiTargetRow[]).map((row) => ({
    id: row.id,
    venueId: row.venue_id,
    department: row.department as KpiDepartment,
    kpiKey: row.kpi_key,
    period: row.period as KpiPeriod,
    targetValue: Number(row.target_value),
    comparison: row.comparison as KpiComparison,
  }));
}

async function countTouches(
  venueId: string,
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const insforge = createInsforgeServerClient();
  const { count, error } = await insforge.database
    .from("touch_events")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countMenuVisits(
  venueId: string,
  fromDate: Date,
  toDate: Date,
): Promise<{ menu: number; total: number }> {
  const insforge = createInsforgeServerClient();

  const { data: tags, error: tagError } = await insforge.database
    .from("nfc_tags")
    .select("id")
    .eq("venue_id", venueId)
    .in("zone", ["restaurant", "bar"]);

  if (tagError) throw new Error(tagError.message);
  const tagIds = (tags ?? []).map((t) => t.id as string);
  if (tagIds.length === 0) return { menu: 0, total: 0 };

  const { data: touches, error: touchError } = await insforge.database
    .from("touch_events")
    .select("id")
    .eq("venue_id", venueId)
    .in("tag_id", tagIds)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (touchError) throw new Error(touchError.message);
  const touchIds = (touches ?? []).map((t) => t.id as string);
  if (touchIds.length === 0) return { menu: 0, total: 0 };

  const { data: visits, error: visitError } = await insforge.database
    .from("destination_visits")
    .select("destination_type")
    .in("touch_event_id", touchIds);

  if (visitError) throw new Error(visitError.message);
  const rows = visits ?? [];
  const menu = rows.filter((v) => v.destination_type === "menu").length;
  return { menu, total: rows.length };
}

async function destinationsPerTouch(
  venueId: string,
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const touches = await countTouches(venueId, fromDate, toDate);
  if (touches === 0) return 0;

  const insforge = createInsforgeServerClient();

  const { data: touchRows, error } = await insforge.database
    .from("touch_events")
    .select("id")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (error) throw new Error(error.message);
  const touchIds = (touchRows ?? []).map((t) => t.id as string);
  if (touchIds.length === 0) return 0;

  const { count, error: visitError } = await insforge.database
    .from("destination_visits")
    .select("id", { count: "exact", head: true })
    .in("touch_event_id", touchIds);

  if (visitError) throw new Error(visitError.message);
  return Math.round(((count ?? 0) / touches) * 100) / 100;
}

function evaluateOnTarget(
  value: number,
  target: number,
  comparison: KpiComparison,
  baselineReady: boolean,
): boolean | null {
  if (!baselineReady) return null;
  return comparison === "gte" ? value >= target : value <= target;
}

async function computeKpiValue(
  venueId: string,
  kpiKey: string,
  period: ResolvedKpiPeriod,
): Promise<{ value: number; deltaPct: number | null }> {
  const { fromDate, toDate, prevFromDate, prevToDate, days } = period;

  switch (kpiKey) {
    case "total_interactions": {
      const current = await countTouches(venueId, fromDate, toDate);
      const previous = await countTouches(venueId, prevFromDate, prevToDate);
      return { value: current, deltaPct: deltaPct(current, previous) };
    }
    case "avex_resolution_rate":
    case "avex_derivation_rate": {
      const avex = await getAvexEffectiveness(venueId, period.executivePeriod);
      const sessions = avex.reduce((s, r) => s + r.sessions, 0);
      const escalated = avex.reduce((s, r) => s + r.escalated, 0);
      const resolved = sessions - escalated;
      const value =
        kpiKey === "avex_resolution_rate"
          ? sessions > 0
            ? Math.round((resolved / sessions) * 1000) / 10
            : 0
          : sessions > 0
            ? Math.round((escalated / sessions) * 1000) / 10
            : 0;
      return { value, deltaPct: null };
    }
    case "avex_sessions_per_day": {
      const avex = await getAvexEffectiveness(venueId, period.executivePeriod);
      const sessions = avex.reduce((s, r) => s + r.sessions, 0);
      const value = Math.round((sessions / days) * 10) / 10;
      return { value, deltaPct: null };
    }
    case "nfc_direct_rate": {
      const channels = await getChannelBreakdown(venueId, period.executivePeriod);
      const nfc = channels.find((c) => c.channel === "nfc");
      return { value: nfc?.pct ?? 0, deltaPct: null };
    }
    case "abandonment_rate": {
      const abandonment = await getAbandonment(venueId, period.executivePeriod);
      const totalTouches = abandonment.reduce((s, r) => s + r.touches, 0);
      const abandoned = abandonment.reduce(
        (s, r) => s + (r.touches - r.withDestination),
        0,
      );
      const value =
        totalTouches > 0
          ? Math.round((abandoned / totalTouches) * 1000) / 10
          : 0;
      return { value, deltaPct: null };
    }
    case "menu_visit_pct": {
      const { menu, total } = await countMenuVisits(venueId, fromDate, toDate);
      const value = total > 0 ? Math.round((menu / total) * 1000) / 10 : 0;
      return { value, deltaPct: null };
    }
    case "destinations_per_touch": {
      const value = await destinationsPerTouch(venueId, fromDate, toDate);
      return { value, deltaPct: null };
    }
    case "alert_action_rate":
      return { value: 0, deltaPct: null };
    default:
      return { value: 0, deltaPct: null };
  }
}

interface ResolvedKpiPeriod {
  executivePeriod: ExecutivePeriod;
  fromDate: Date;
  toDate: Date;
  prevFromDate: Date;
  prevToDate: Date;
  days: number;
}

function toKpiPeriod(executivePeriod: ExecutivePeriod): KpiPeriod {
  return executivePeriod === "30d" ? "monthly" : "weekly";
}

function layerForKpi(kpiKey: string): KpiCard["layer"] {
  if (kpiKey.includes("abandonment") || kpiKey.includes("destinations")) {
    return "experience";
  }
  if (kpiKey === "alert_action_rate") return "roi";
  return "performance";
}

export async function compareTargets(
  venueId: string,
  executivePeriod: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
  filterKeys?: string[],
): Promise<KpiCard[]> {
  const resolved = resolveExecutivePeriod(executivePeriod, from, to);
  const kpiPeriod = toKpiPeriod(executivePeriod);
  const [targets, baseline, trends] = await Promise.all([
    loadTargets(venueId),
    getBaselineStatus(venueId),
    getTrends(venueId, executivePeriod, from, to),
  ]);

  const baselineReady = isBaselineReady(baseline);
  const filtered = targets.filter((t) => t.period === kpiPeriod);
  const keys = filterKeys
    ? filtered.filter((t) => filterKeys.includes(t.kpiKey))
    : filtered;

  const cards: KpiCard[] = [];

  for (const target of keys) {
    const { value, deltaPct: kpiDelta } = await computeKpiValue(
      venueId,
      target.kpiKey,
      {
        executivePeriod,
        fromDate: resolved.fromDate,
        toDate: resolved.toDate,
        prevFromDate: resolved.prevFromDate,
        prevToDate: resolved.prevToDate,
        days: resolved.days,
      },
    );

    const trendDelta =
      target.kpiKey === "total_interactions" ? trends.deltaPct : kpiDelta;

    cards.push({
      key: target.kpiKey,
      label: target.kpiKey,
      definition: "",
      layer: layerForKpi(target.kpiKey),
      department: target.department,
      value,
      target: target.targetValue,
      comparison: target.comparison,
      deltaPct: trendDelta,
      onTarget: evaluateOnTarget(
        value,
        target.targetValue,
        target.comparison,
        baselineReady,
      ),
      suggestedAction: null,
    });
  }

  return cards;
}
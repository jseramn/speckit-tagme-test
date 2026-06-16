import { format, parseISO, startOfDay, subDays } from "date-fns";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { MetricsSummary } from "@/lib/validators/events";

export interface MetricsQueryParams {
  venueId: string;
  from?: string;
  to?: string;
  tagId?: string;
}

interface TouchRow {
  created_at: string;
  device_type: string;
  country_code: string | null;
}

interface VisitRow {
  destination_type: string;
}

function defaultPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = subDays(to, 7);
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
  };
}

function parsePeriod(
  from?: string,
  to?: string,
): { fromDate: Date; toDate: Date; from: string; to: string } {
  const defaults = defaultPeriod();
  const fromStr = from ?? defaults.from;
  const toStr = to ?? defaults.to;

  const fromDate = startOfDay(parseISO(fromStr));
  const toDate = startOfDay(parseISO(toStr));
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate, from: fromStr, to: toStr };
}

function buildPercentageMap(
  items: { key: string; count: number }[],
): { key: string; count: number; percentage: number }[] {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return [];

  return items.map((item) => ({
    key: item.key,
    count: item.count,
    percentage: Math.round((item.count / total) * 1000) / 10,
  }));
}

async function fetchTouchEvents(
  venueId: string,
  fromDate: Date,
  toDate: Date,
  tagId?: string,
): Promise<TouchRow[]> {
  const insforge = createInsforgeServerClient();

  let query = insforge.database
    .from("touch_events")
    .select("created_at, device_type, country_code")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (tagId) {
    query = query.eq("tag_id", tagId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TouchRow[];
}

async function fetchDestinationVisits(
  venueId: string,
  fromDate: Date,
  toDate: Date,
  tagId?: string,
): Promise<VisitRow[]> {
  const insforge = createInsforgeServerClient();

  let query = insforge.database
    .from("destination_visits")
    .select("destination_type, touch_events!inner(venue_id, deduplicated, tag_id)")
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString())
    .eq("touch_events.venue_id", venueId)
    .eq("touch_events.deduplicated", false);

  if (tagId) {
    query = query.eq("touch_events.tag_id", tagId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as VisitRow[];
}

async function fetchVenueTimezone(venueId: string): Promise<string> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("venues")
    .select("timezone")
    .eq("id", venueId)
    .maybeSingle();

  if (error || !data) return "America/Bogota";
  return (data.timezone as string) || "America/Bogota";
}

function aggregateTouchesDaily(touches: TouchRow[]): MetricsSummary["touchesDaily"] {
  const counts = new Map<string, number>();

  for (const touch of touches) {
    const day = format(parseISO(touch.created_at), "yyyy-MM-dd");
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function aggregatePeakHours(
  touches: TouchRow[],
  timezone: string,
): MetricsSummary["peakHours"] {
  const counts = new Map<number, number>();

  for (const touch of touches) {
    const hour = getHourInTimezone(touch.created_at, timezone);
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, count]) => ({ hour, count }));
}

function getHourInTimezone(isoDate: string, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(parseISO(isoDate));
  const hourPart = parts.find((p) => p.type === "hour");
  return Number(hourPart?.value ?? 0);
}

function aggregateDestinationBreakdown(
  visits: VisitRow[],
): MetricsSummary["destinationBreakdown"] {
  const counts = new Map<string, number>();

  for (const visit of visits) {
    counts.set(
      visit.destination_type,
      (counts.get(visit.destination_type) ?? 0) + 1,
    );
  }

  return buildPercentageMap(
    [...counts.entries()].map(([key, count]) => ({ key, count })),
  ).map(({ key, count, percentage }) => ({
    type: key,
    count,
    percentage,
  }));
}

function aggregateDeviceBreakdown(
  touches: TouchRow[],
): MetricsSummary["deviceBreakdown"] {
  const counts = new Map<string, number>();

  for (const touch of touches) {
    const device = touch.device_type || "other";
    counts.set(device, (counts.get(device) ?? 0) + 1);
  }

  return buildPercentageMap(
    [...counts.entries()].map(([key, count]) => ({ key, count })),
  ).map(({ key, count, percentage }) => ({
    type: key,
    count,
    percentage,
  }));
}

function aggregateCountryBreakdown(
  touches: TouchRow[],
): MetricsSummary["countryBreakdown"] {
  const counts = new Map<string, number>();

  for (const touch of touches) {
    const code = touch.country_code?.trim().toUpperCase();
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([countryCode, count]) => ({ countryCode, count }));
}

/**
 * Aggregates TagMétricas for a venue within a date range.
 * Uses touch_events and destination_visits (aligned to SQL views).
 */
export async function getMetricsSummary(
  params: MetricsQueryParams,
): Promise<MetricsSummary> {
  const { fromDate, toDate, from, to } = parsePeriod(params.from, params.to);
  const timezone = await fetchVenueTimezone(params.venueId);

  const [touches, visits] = await Promise.all([
    fetchTouchEvents(params.venueId, fromDate, toDate, params.tagId),
    fetchDestinationVisits(params.venueId, fromDate, toDate, params.tagId),
  ]);

  return {
    venueId: params.venueId,
    period: { from, to },
    touchesDaily: aggregateTouchesDaily(touches),
    peakHours: aggregatePeakHours(touches, timezone),
    destinationBreakdown: aggregateDestinationBreakdown(visits),
    deviceBreakdown: aggregateDeviceBreakdown(touches),
    countryBreakdown: aggregateCountryBreakdown(touches),
  };
}

/** Resolves pilot venue id by slug (M2 dashboard convenience). */
export async function resolveVenueIdBySlug(slug: string): Promise<string | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("venues")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
}
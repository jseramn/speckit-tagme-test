import { addDays, format, parseISO, subDays, subMinutes } from "date-fns";
import { getMetricsSummary } from "@/lib/analytics/metrics";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import type {
  PulseAvexSummary,
  PulseResponse,
  PulseTagActivity,
  PulseZoneActivity,
  TrendPoint,
} from "@/types/executive";
import { getAlertsSummary } from "./alerts/queries";
import { deltaPct, resolveExecutivePeriod, type ExecutivePeriod } from "./period";

export interface ZoneHourlyRow {
  zone: string;
  hour: number;
  touches: number;
}

export interface TagDailyRow {
  tag_id: string;
  day: string;
  touches: number;
}

export interface AvexEffectivenessRow {
  day: string;
  sessions: number;
  resolved: number;
  escalated: number;
  derivation_pct: number;
}

export interface ChannelRow {
  channel: string;
  count: number;
  pct: number;
}

export interface AbandonmentRow {
  zone: string;
  day: string;
  touches: number;
  withDestination: number;
  abandonmentPct: number;
}

export interface LatencyRow {
  tagId: string;
  medianSeconds: number;
  p95Seconds: number;
}

export interface TrendsResult {
  trend: TrendPoint[];
  totalTouches: number;
  previousTotal: number;
  deltaPct: number | null;
}

const TOPIC_KEYWORDS: Array<{ topic: string; patterns: RegExp[] }> = [
  {
    topic: "horarios restaurante",
    patterns: [/restaurante/i, /horario/i, /cena/i, /desayuno/i],
  },
  {
    topic: "room service",
    patterns: [/room service/i, /habitaci[oó]n/i, /servicio a la habitaci/i],
  },
  {
    topic: "wifi / conexión",
    patterns: [/wifi/i, /internet/i, /conexi[oó]n/i],
  },
  {
    topic: "check-out",
    patterns: [/check.?out/i, /salida/i],
  },
  {
    topic: "reservas",
    patterns: [/reserva/i, /booking/i],
  },
];

function extractTopics(messages: string[]): string[] {
  const counts = new Map<string, number>();

  for (const content of messages) {
    for (const { topic, patterns } of TOPIC_KEYWORDS) {
      if (patterns.some((p) => p.test(content))) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);
}

export async function getPulse(
  venueId: string,
  windowMin = 30,
): Promise<Omit<PulseResponse, "avex" | "alertsSummary">> {
  const insforge = createInsforgeServerClient();
  const fetchedAt = new Date();
  const since = subMinutes(fetchedAt, windowMin);
  const prevSince = subMinutes(since, windowMin);

  const { data: touches, error } = await insforge.database
    .from("touch_events")
    .select("id, tag_id, created_at, nfc_tags ( id, slug, label, zone )")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .gte("created_at", since.toISOString())
    .lte("created_at", fetchedAt.toISOString());

  if (error) throw new Error(error.message);

  const { data: prevTouches, error: prevError } = await insforge.database
    .from("touch_events")
    .select("id, nfc_tags ( zone )")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .gte("created_at", prevSince.toISOString())
    .lt("created_at", since.toISOString());

  if (prevError) throw new Error(prevError.message);

  type TouchWithTag = {
    id: string;
    tag_id: string;
    nfc_tags:
      | { id: string; slug: string; label: string; zone: string }
      | { id: string; slug: string; label: string; zone: string }[]
      | null;
  };

  const currentRows = (touches ?? []) as TouchWithTag[];
  const prevRows = (prevTouches ?? []) as TouchWithTag[];

  const zoneCounts = new Map<string, number>();
  const prevZoneCounts = new Map<string, number>();
  const tagCounts = new Map<
    string,
    { tagId: string; slug: string; label: string; zone: string; touches: number }
  >();

  for (const touch of currentRows) {
    const tag = Array.isArray(touch.nfc_tags)
      ? touch.nfc_tags[0]
      : touch.nfc_tags;
    if (!tag) continue;

    zoneCounts.set(tag.zone, (zoneCounts.get(tag.zone) ?? 0) + 1);

    const existing = tagCounts.get(touch.tag_id);
    if (existing) {
      existing.touches += 1;
    } else {
      tagCounts.set(touch.tag_id, {
        tagId: tag.id,
        slug: tag.slug,
        label: tag.label,
        zone: tag.zone,
        touches: 1,
      });
    }
  }

  for (const touch of prevRows) {
    const tag = Array.isArray(touch.nfc_tags)
      ? touch.nfc_tags[0]
      : touch.nfc_tags;
    if (!tag) continue;
    prevZoneCounts.set(tag.zone, (prevZoneCounts.get(tag.zone) ?? 0) + 1);
  }

  const zones: PulseZoneActivity[] = [...zoneCounts.entries()]
    .map(([zone, count]) => ({
      zone,
      touches: count,
      deltaPct: deltaPct(count, prevZoneCounts.get(zone) ?? 0),
    }))
    .sort((a, b) => b.touches - a.touches);

  const tags: PulseTagActivity[] = [...tagCounts.values()]
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 10);

  return {
    venueId,
    windowMin,
    fetchedAt: fetchedAt.toISOString(),
    layer: "pulse",
    zones,
    tags,
  };
}

export async function getAvexPulse(
  venueId: string,
  windowMin = 60,
): Promise<PulseAvexSummary> {
  const insforge = createInsforgeServerClient();
  const since = subMinutes(new Date(), windowMin);

  const { data: sessions, error } = await insforge.database
    .from("avex_sessions")
    .select("id")
    .eq("venue_id", venueId)
    .gte("created_at", since.toISOString());

  if (error) throw new Error(error.message);

  const sessionRows = sessions ?? [];
  const sessionIds = sessionRows.map((s) => s.id as string);
  const recentSessions = sessionIds.length;

  if (recentSessions === 0) {
    return { recentSessions: 0, derivationPct: 0, topTopics: [] };
  }

  const { data: escalated, error: escError } = await insforge.database
    .from("avex_messages")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("escalated", true);

  if (escError) throw new Error(escError.message);

  const escalatedIds = new Set(
    (escalated ?? []).map((m) => m.session_id as string),
  );
  const derivationPct =
    recentSessions > 0
      ? Math.round((escalatedIds.size / recentSessions) * 1000) / 10
      : 0;

  const { data: userMessages, error: msgError } = await insforge.database
    .from("avex_messages")
    .select("content")
    .in("session_id", sessionIds)
    .eq("role", "user")
    .limit(50);

  if (msgError) throw new Error(msgError.message);

  const topTopics = extractTopics(
    (userMessages ?? []).map((m) => m.content as string),
  );

  return { recentSessions, derivationPct, topTopics };
}

export async function getTrends(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<TrendsResult> {
  const resolved = resolveExecutivePeriod(period, from, to);

  const [current, previous] = await Promise.all([
    getMetricsSummary({
      venueId,
      from: resolved.from,
      to: resolved.to,
    }),
    getMetricsSummary({
      venueId,
      from: format(resolved.prevFromDate, "yyyy-MM-dd"),
      to: format(resolved.prevToDate, "yyyy-MM-dd"),
    }),
  ]);

  const trend: TrendPoint[] = current.touchesDaily.map((d) => ({
    day: d.date,
    touches: d.count,
  }));

  const totalTouches = trend.reduce((s, p) => s + p.touches, 0);
  const previousTotal = previous.touchesDaily.reduce((s, p) => s + p.count, 0);

  return {
    trend,
    totalTouches,
    previousTotal,
    deltaPct: deltaPct(totalTouches, previousTotal),
  };
}

export async function getByZone(
  venueId: string,
  _period: ExecutivePeriod = "7d",
  _from?: string,
  _to?: string,
): Promise<ZoneHourlyRow[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("v_touches_by_zone_hourly")
    .select("zone, hour, touches")
    .eq("venue_id", venueId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as { zone: string; hour: number; touches: number }[]).map(
    (row) => ({
      zone: row.zone,
      hour: row.hour,
      touches: Number(row.touches),
    }),
  );
}

export async function getByTag(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<
  Array<{
    tagId: string;
    slug: string;
    label: string;
    roomNumber: string | null;
    zone: string;
    touches: number;
  }>
> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("v_touches_by_tag_daily")
    .select("tag_id, day, touches")
    .eq("venue_id", venueId)
    .gte("day", resolved.fromDate.toISOString())
    .lte("day", resolved.toDate.toISOString());

  if (error) throw new Error(error.message);

  const tagTotals = new Map<string, number>();
  for (const row of (data ?? []) as TagDailyRow[]) {
    tagTotals.set(
      row.tag_id,
      (tagTotals.get(row.tag_id) ?? 0) + Number(row.touches),
    );
  }

  const tagIds = [...tagTotals.keys()];
  if (tagIds.length === 0) return [];

  const { data: tags, error: tagError } = await insforge.database
    .from("nfc_tags")
    .select("id, slug, label, room_number, zone")
    .in("id", tagIds);

  if (tagError) throw new Error(tagError.message);

  return (tags ?? []).map((tag) => ({
    tagId: tag.id as string,
    slug: tag.slug as string,
    label: tag.label as string,
    roomNumber: (tag.room_number as string | null) ?? null,
    zone: tag.zone as string,
    touches: tagTotals.get(tag.id as string) ?? 0,
  }));
}

export async function getAvexEffectiveness(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<AvexEffectivenessRow[]> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("v_avex_effectiveness")
    .select("day, sessions, resolved, escalated, derivation_pct")
    .eq("venue_id", venueId)
    .gte("day", resolved.fromDate.toISOString())
    .lte("day", resolved.toDate.toISOString())
    .order("day", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as AvexEffectivenessRow[]).map((row) => ({
    day: format(parseISO(row.day as unknown as string), "yyyy-MM-dd"),
    sessions: Number(row.sessions),
    resolved: Number(row.resolved),
    escalated: Number(row.escalated),
    derivation_pct: Number(row.derivation_pct),
  }));
}

export async function getChannelBreakdown(
  venueId: string,
  _period: ExecutivePeriod = "7d",
): Promise<ChannelRow[]> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("v_channel_breakdown")
    .select("channel, count, pct")
    .eq("venue_id", venueId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as ChannelRow[]).map((row) => ({
    channel: row.channel,
    count: Number(row.count),
    pct: Number(row.pct),
  }));
}

export async function getAbandonment(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<AbandonmentRow[]> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("v_touch_abandonment")
    .select("zone, day, touches, with_destination, abandonment_pct")
    .eq("venue_id", venueId)
    .gte("day", resolved.fromDate.toISOString())
    .lte("day", resolved.toDate.toISOString());

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as Array<{
      zone: string;
      day: string;
      touches: number;
      with_destination: number;
      abandonment_pct: number;
    }>
  ).map((row) => ({
    zone: row.zone,
    day: format(parseISO(row.day), "yyyy-MM-dd"),
    touches: Number(row.touches),
    withDestination: Number(row.with_destination),
    abandonmentPct: Number(row.abandonment_pct),
  }));
}

export async function getLatency(
  venueId: string,
): Promise<LatencyRow[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("v_latency_to_destination")
    .select("tag_id, median_seconds, p95_seconds")
    .eq("venue_id", venueId);

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as Array<{
      tag_id: string;
      median_seconds: number;
      p95_seconds: number;
    }>
  ).map((row) => ({
    tagId: row.tag_id,
    medianSeconds: Number(row.median_seconds),
    p95Seconds: Number(row.p95_seconds),
  }));
}

export async function getFullPulse(
  venueId: string,
  windowMin = 30,
): Promise<PulseResponse> {
  const [pulse, avex, alertsSummary] = await Promise.all([
    getPulse(venueId, windowMin),
    getAvexPulse(venueId, 60),
    getAlertsSummary(venueId),
  ]);

  return {
    ...pulse,
    avex,
    alertsSummary,
  };
}

export interface RoomAvexCount {
  roomNumber: string;
  sessionCount: number;
  tagId: string | null;
}

export interface AtypicalRoomResult {
  roomNumber: string;
  label: string;
  sessionCount: number;
  venueAvg: number;
  multiplier: number;
  tagId: string | null;
}

/**
 * Detects rooms with AVEX session count > multiplierThreshold × venue average.
 * Uses room_number only — no guest PII (CL-13 / SC-G009).
 */
export function detectAtypicalRooms(
  rooms: RoomAvexCount[],
  multiplierThreshold = 3,
): AtypicalRoomResult[] {
  if (rooms.length === 0) return [];

  const total = rooms.reduce((s, r) => s + r.sessionCount, 0);
  const venueAvg = total / rooms.length;

  if (venueAvg <= 0) return [];

  return rooms
    .map((room) => {
      const multiplier = room.sessionCount / venueAvg;
      return {
        roomNumber: room.roomNumber,
        label: `Habitación ${room.roomNumber}`,
        sessionCount: room.sessionCount,
        venueAvg: Math.round(venueAvg * 10) / 10,
        multiplier: Math.round(multiplier * 10) / 10,
        tagId: room.tagId,
      };
    })
    .filter((r) => r.multiplier > multiplierThreshold)
    .sort((a, b) => b.multiplier - a.multiplier);
}

export async function getAtypicalRooms(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<AtypicalRoomResult[]> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("avex_sessions")
    .select("room_number, tag_id")
    .eq("venue_id", venueId)
    .not("room_number", "is", null)
    .gte("created_at", resolved.fromDate.toISOString())
    .lte("created_at", resolved.toDate.toISOString());

  if (error) throw new Error(error.message);

  const counts = new Map<string, { sessionCount: number; tagId: string | null }>();

  for (const row of (data ?? []) as Array<{
    room_number: string;
    tag_id: string | null;
  }>) {
    const key = row.room_number;
    const existing = counts.get(key);
    if (existing) {
      existing.sessionCount += 1;
      if (!existing.tagId && row.tag_id) existing.tagId = row.tag_id;
    } else {
      counts.set(key, {
        sessionCount: 1,
        tagId: row.tag_id,
      });
    }
  }

  const rooms: RoomAvexCount[] = [...counts.entries()].map(
    ([roomNumber, stats]) => ({
      roomNumber,
      sessionCount: stats.sessionCount,
      tagId: stats.tagId,
    }),
  );

  return detectAtypicalRooms(rooms);
}

export async function getTopDerivationTopics(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
  limit = 3,
): Promise<string[]> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const insforge = createInsforgeServerClient();

  const { data: sessions, error: sessError } = await insforge.database
    .from("avex_sessions")
    .select("id")
    .eq("venue_id", venueId)
    .gte("created_at", resolved.fromDate.toISOString())
    .lte("created_at", resolved.toDate.toISOString());

  if (sessError) throw new Error(sessError.message);

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) return [];

  const { data: escalated, error: escError } = await insforge.database
    .from("avex_messages")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("escalated", true);

  if (escError) throw new Error(escError.message);

  const escalatedIds = new Set(
    (escalated ?? []).map((m) => m.session_id as string),
  );
  if (escalatedIds.size === 0) return [];

  const { data: userMessages, error: msgError } = await insforge.database
    .from("avex_messages")
    .select("content, session_id")
    .in("session_id", [...escalatedIds])
    .eq("role", "user")
    .limit(200);

  if (msgError) throw new Error(msgError.message);

  const messages = (userMessages ?? []).map((m) => m.content as string);
  return extractTopics(messages).slice(0, limit);
}

const FNB_TOPIC_PATTERNS: RegExp[] = [
  /restaurante/i,
  /horario/i,
  /cena/i,
  /desayuno/i,
  /men[uú]/i,
  /bar\b/i,
  /bebida/i,
];

export async function getFnbAvexTopics(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
  limit = 3,
): Promise<string[]> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const insforge = createInsforgeServerClient();

  const { data: sessions, error: sessError } = await insforge.database
    .from("avex_sessions")
    .select("id")
    .eq("venue_id", venueId)
    .gte("created_at", resolved.fromDate.toISOString())
    .lte("created_at", resolved.toDate.toISOString());

  if (sessError) throw new Error(sessError.message);

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) return [];

  const { data: userMessages, error: msgError } = await insforge.database
    .from("avex_messages")
    .select("content")
    .in("session_id", sessionIds)
    .eq("role", "user")
    .limit(200);

  if (msgError) throw new Error(msgError.message);

  const fnbMessages = (userMessages ?? [])
    .map((m) => m.content as string)
    .filter((content) => FNB_TOPIC_PATTERNS.some((p) => p.test(content)));

  return extractTopics(fnbMessages).slice(0, limit);
}

async function resolveTagIdsForZones(
  venueId: string,
  zones: string[],
  tagId?: string,
): Promise<string[]> {
  const insforge = createInsforgeServerClient();

  let query = insforge.database
    .from("nfc_tags")
    .select("id")
    .eq("venue_id", venueId)
    .in("zone", zones);

  if (tagId) {
    query = query.eq("id", tagId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => t.id as string);
}

export async function getPeakHoursByZones(
  venueId: string,
  zones: string[],
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
  tagId?: string,
): Promise<Array<{ hour: number; count: number }>> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const tagIds = await resolveTagIdsForZones(venueId, zones, tagId);
  if (tagIds.length === 0) return [];

  const insforge = createInsforgeServerClient();
  const { data: venue } = await insforge.database
    .from("venues")
    .select("timezone")
    .eq("id", venueId)
    .maybeSingle();
  const timezone = (venue?.timezone as string) || "America/Bogota";

  const { data: touches, error } = await insforge.database
    .from("touch_events")
    .select("created_at")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .in("tag_id", tagIds)
    .gte("created_at", resolved.fromDate.toISOString())
    .lte("created_at", resolved.toDate.toISOString());

  if (error) throw new Error(error.message);

  const counts = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });

  for (const row of touches ?? []) {
    const parts = formatter.formatToParts(parseISO(row.created_at as string));
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, count]) => ({ hour, count }));
}

export interface ScopedMetricsResult {
  peakHours: Array<{ hour: number; count: number }>;
  destinationBreakdown: Array<{ type: string; count: number; percentage: number }>;
  deviceBreakdown: Array<{ type: string; count: number; percentage: number }>;
  countryBreakdown: Array<{ countryCode: string; count: number }>;
}

export async function getScopedMetrics(
  venueId: string,
  zones: string[],
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
  tagId?: string,
): Promise<ScopedMetricsResult> {
  const resolved = resolveExecutivePeriod(period, from, to);
  const tagIds = await resolveTagIdsForZones(venueId, zones, tagId);

  if (tagIds.length === 0) {
    return {
      peakHours: [],
      destinationBreakdown: [],
      deviceBreakdown: [],
      countryBreakdown: [],
    };
  }

  const insforge = createInsforgeServerClient();

  const { data: touches, error: touchError } = await insforge.database
    .from("touch_events")
    .select("id, created_at, device_type, country_code")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .in("tag_id", tagIds)
    .gte("created_at", resolved.fromDate.toISOString())
    .lte("created_at", resolved.toDate.toISOString());

  if (touchError) throw new Error(touchError.message);

  const touchRows = touches ?? [];
  const touchIds = touchRows.map((t) => t.id as string);

  let visits: Array<{ destination_type: string }> = [];
  if (touchIds.length > 0) {
    const { data: visitRows, error: visitError } = await insforge.database
      .from("destination_visits")
      .select("destination_type")
      .in("touch_event_id", touchIds);

    if (visitError) throw new Error(visitError.message);
    visits = visitRows ?? [];
  }

  const { data: venue } = await insforge.database
    .from("venues")
    .select("timezone")
    .eq("id", venueId)
    .maybeSingle();
  const timezone = (venue?.timezone as string) || "America/Bogota";

  const hourCounts = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });

  const deviceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const destCounts = new Map<string, number>();

  for (const touch of touchRows) {
    const parts = formatter.formatToParts(parseISO(touch.created_at as string));
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    const device = (touch.device_type as string) || "other";
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);

    const code = (touch.country_code as string | null)?.trim().toUpperCase();
    if (code) {
      countryCounts.set(code, (countryCounts.get(code) ?? 0) + 1);
    }
  }

  for (const visit of visits) {
    const type = visit.destination_type as string;
    destCounts.set(type, (destCounts.get(type) ?? 0) + 1);
  }

  const buildPct = (items: { key: string; count: number }[]) => {
    const total = items.reduce((s, i) => s + i.count, 0);
    if (total === 0) return [];
    return items.map((item) => ({
      type: item.key,
      count: item.count,
      percentage: Math.round((item.count / total) * 1000) / 10,
    }));
  };

  return {
    peakHours: [...hourCounts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, count]) => ({ hour, count })),
    destinationBreakdown: buildPct(
      [...destCounts.entries()].map(([key, count]) => ({ key, count })),
    ),
    deviceBreakdown: buildPct(
      [...deviceCounts.entries()].map(([key, count]) => ({ key, count })),
    ),
    countryBreakdown: [...countryCounts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([countryCode, count]) => ({ countryCode, count })),
  };
}

export interface ContentImpactResult {
  configTitle: string;
  updatedAt: string;
  postTouches: number;
  priorTouches: number;
  postDestinations: number;
  priorDestinations: number;
  touchesDeltaPct: number | null;
  destinationsDeltaPct: number | null;
  windowDays: number;
}

async function countEngagementForTags(
  venueId: string,
  tagIds: string[],
  fromDate: Date,
  toDate: Date,
): Promise<{ touches: number; destinations: number }> {
  if (tagIds.length === 0) return { touches: 0, destinations: 0 };

  const insforge = createInsforgeServerClient();

  const { data: touches, error: touchError } = await insforge.database
    .from("touch_events")
    .select("id")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .in("tag_id", tagIds)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (touchError) throw new Error(touchError.message);

  const touchIds = (touches ?? []).map((t) => t.id as string);
  if (touchIds.length === 0) return { touches: 0, destinations: 0 };

  const { count, error: visitError } = await insforge.database
    .from("destination_visits")
    .select("id", { count: "exact", head: true })
    .in("touch_event_id", touchIds);

  if (visitError) throw new Error(visitError.message);

  return { touches: touchIds.length, destinations: count ?? 0 };
}

/**
 * Compares engagement 7d post vs. 7d prior to latest `experience_configs.updated_at`.
 */
export async function getContentImpact(
  venueId: string,
  windowDays = 7,
): Promise<ContentImpactResult | null> {
  const insforge = createInsforgeServerClient();

  const { data: config, error: configError } = await insforge.database
    .from("experience_configs")
    .select("id, title, updated_at")
    .eq("venue_id", venueId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (configError) throw new Error(configError.message);
  if (!config) return null;

  const updatedAt = parseISO(config.updated_at as string);
  const now = new Date();

  const postFrom = updatedAt;
  const postTo = addDays(updatedAt, windowDays);
  const priorFrom = subDays(updatedAt, windowDays);
  const priorTo = updatedAt;

  if (postTo > now) {
    return null;
  }

  const { data: tags, error: tagError } = await insforge.database
    .from("nfc_tags")
    .select("id")
    .eq("venue_id", venueId)
    .eq("experience_config_id", config.id as string);

  if (tagError) throw new Error(tagError.message);

  const tagIds = (tags ?? []).map((t) => t.id as string);
  if (tagIds.length === 0) {
    const { data: allTags, error: allError } = await insforge.database
      .from("nfc_tags")
      .select("id")
      .eq("venue_id", venueId);

    if (allError) throw new Error(allError.message);
    tagIds.push(...(allTags ?? []).map((t) => t.id as string));
  }

  const [post, prior] = await Promise.all([
    countEngagementForTags(venueId, tagIds, postFrom, postTo),
    countEngagementForTags(venueId, tagIds, priorFrom, priorTo),
  ]);

  return {
    configTitle: config.title as string,
    updatedAt: config.updated_at as string,
    postTouches: post.touches,
    priorTouches: prior.touches,
    postDestinations: post.destinations,
    priorDestinations: prior.destinations,
    touchesDeltaPct: deltaPct(post.touches, prior.touches),
    destinationsDeltaPct: deltaPct(post.destinations, prior.destinations),
    windowDays,
  };
}

/** Venue-wide metrics for reports (no zone filter). */
export async function getVenueMetrics(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
) {
  const resolved = resolveExecutivePeriod(period, from, to);
  return getMetricsSummary({
    venueId,
    from: resolved.from,
    to: resolved.to,
  });
}
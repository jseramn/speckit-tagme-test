import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { RoiSummary } from "@/types/executive";
import { deltaPct, resolveExecutivePeriod, type ExecutivePeriod } from "./period";

const AVEX_MINUTES_PER_RESOLVED = 3.5;
const SELF_SERVICE_MINUTES_PER_TOUCH = 0.5;
const AVEX_OVERLAP_WINDOW_MS = 30 * 60 * 1000;

export interface RoiInput {
  resolvedSessions: number;
  selfServiceTouches: number;
}

export function computeRoiFromCounts(input: RoiInput): {
  staffMinutesSaved: number;
  selfServiceMinutes: number;
  totalMinutes: number;
} {
  const staffMinutesSaved =
    Math.round(input.resolvedSessions * AVEX_MINUTES_PER_RESOLVED * 10) / 10;
  const selfServiceMinutes =
    Math.round(input.selfServiceTouches * SELF_SERVICE_MINUTES_PER_TOUCH * 10) /
    10;
  return {
    staffMinutesSaved,
    selfServiceMinutes,
    totalMinutes:
      Math.round((staffMinutesSaved + selfServiceMinutes) * 10) / 10,
  };
}

interface AvexSessionRow {
  id: string;
  created_at: string;
  tag_id: string;
}

interface TouchRow {
  id: string;
  tag_id: string;
  created_at: string;
  channel: string;
}

interface EscalationRow {
  session_id: string;
}

interface VisitRow {
  touch_event_id: string;
}

async function fetchAvexSessions(
  venueId: string,
  fromDate: Date,
  toDate: Date,
): Promise<AvexSessionRow[]> {
  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("avex_sessions")
    .select("id, created_at, tag_id")
    .eq("venue_id", venueId)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (error) throw new Error(error.message);
  return (data ?? []) as AvexSessionRow[];
}

async function fetchEscalatedSessionIds(
  sessionIds: string[],
): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();

  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("avex_messages")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("escalated", true);

  if (error) throw new Error(error.message);

  return new Set(
    ((data ?? []) as EscalationRow[]).map((row) => row.session_id),
  );
}

async function fetchNfcTouchesWithDestination(
  venueId: string,
  fromDate: Date,
  toDate: Date,
): Promise<TouchRow[]> {
  const insforge = createInsforgeServerClient();

  const { data: touches, error } = await insforge.database
    .from("touch_events")
    .select("id, tag_id, created_at, channel")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .eq("channel", "nfc")
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  if (error) throw new Error(error.message);
  const rows = (touches ?? []) as TouchRow[];
  if (rows.length === 0) return [];

  const touchIds = rows.map((t) => t.id);
  const { data: visits, error: visitError } = await insforge.database
    .from("destination_visits")
    .select("touch_event_id")
    .in("touch_event_id", touchIds);

  if (visitError) throw new Error(visitError.message);

  const withDestination = new Set(
    ((visits ?? []) as VisitRow[]).map((v) => v.touch_event_id),
  );

  return rows.filter((t) => withDestination.has(t.id));
}

/**
 * Excludes NFC self-service touches that also have an AVEX session on the same tag
 * within 30 minutes (CL-07 double-count prevention).
 */
export function excludeAvexOverlappingTouches(
  touches: TouchRow[],
  sessions: AvexSessionRow[],
): TouchRow[] {
  if (sessions.length === 0) return touches;

  const sessionsByTag = new Map<string, AvexSessionRow[]>();
  for (const session of sessions) {
    const list = sessionsByTag.get(session.tag_id) ?? [];
    list.push(session);
    sessionsByTag.set(session.tag_id, list);
  }

  return touches.filter((touch) => {
    const tagSessions = sessionsByTag.get(touch.tag_id);
    if (!tagSessions) return true;

    const touchTime = new Date(touch.created_at).getTime();
    return !tagSessions.some((session) => {
      const sessionTime = new Date(session.created_at).getTime();
      return Math.abs(sessionTime - touchTime) <= AVEX_OVERLAP_WINDOW_MS;
    });
  });
}

export async function calculateRoi(
  venueId: string,
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): Promise<RoiSummary> {
  const resolved = resolveExecutivePeriod(period, from, to);

  const [sessions, prevSessions, nfcTouches, prevNfcTouches] =
    await Promise.all([
      fetchAvexSessions(venueId, resolved.fromDate, resolved.toDate),
      fetchAvexSessions(
        venueId,
        resolved.prevFromDate,
        resolved.prevToDate,
      ),
      fetchNfcTouchesWithDestination(
        venueId,
        resolved.fromDate,
        resolved.toDate,
      ),
      fetchNfcTouchesWithDestination(
        venueId,
        resolved.prevFromDate,
        resolved.prevToDate,
      ),
    ]);

  const sessionIds = sessions.map((s) => s.id);
  const escalated = await fetchEscalatedSessionIds(sessionIds);
  const resolvedCount = sessions.filter((s) => !escalated.has(s.id)).length;

  const selfServiceTouches = excludeAvexOverlappingTouches(
    nfcTouches,
    sessions,
  ).length;

  const current = computeRoiFromCounts({
    resolvedSessions: resolvedCount,
    selfServiceTouches,
  });

  const prevSessionIds = prevSessions.map((s) => s.id);
  const prevEscalated = await fetchEscalatedSessionIds(prevSessionIds);
  const prevResolvedCount = prevSessions.filter(
    (s) => !prevEscalated.has(s.id),
  ).length;
  const prevSelfService = excludeAvexOverlappingTouches(
    prevNfcTouches,
    prevSessions,
  ).length;
  const previous = computeRoiFromCounts({
    resolvedSessions: prevResolvedCount,
    selfServiceTouches: prevSelfService,
  });

  return {
    staffMinutesSaved: current.staffMinutesSaved,
    selfServiceMinutes: current.selfServiceMinutes,
    totalMinutes: current.totalMinutes,
    deltaPct: deltaPct(current.totalMinutes, previous.totalMinutes),
    label: "Estimado operativo",
  };
}
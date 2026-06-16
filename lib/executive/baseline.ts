import { createInsforgeServerClient } from "@/lib/insforge-server";

const BASELINE_MIN_DAYS = 14;
const BASELINE_MIN_TOUCHES = 100;

export interface VenueBaselineStatus {
  ready: boolean;
  day: number;
  totalTouches: number;
  firstTouchAt: string | null;
}

interface VenueBaselineRow {
  first_touch_at: string | null;
  total_touches: number;
  baseline_ready: boolean;
}

function daysSince(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function computeBaselineStatus(
  firstTouchAt: string | null,
  totalTouches: number,
): VenueBaselineStatus {
  if (!firstTouchAt) {
    return {
      ready: false,
      day: 0,
      totalTouches,
      firstTouchAt: null,
    };
  }

  const day = Math.min(daysSince(firstTouchAt), BASELINE_MIN_DAYS);
  const ready =
    day >= BASELINE_MIN_DAYS && totalTouches >= BASELINE_MIN_TOUCHES;

  return {
    ready,
    day,
    totalTouches,
    firstTouchAt,
  };
}

async function refreshBaselineCache(venueId: string): Promise<VenueBaselineStatus> {
  const insforge = createInsforgeServerClient();

  const { data: stats, error: statsError } = await insforge.database
    .from("touch_events")
    .select("created_at")
    .eq("venue_id", venueId)
    .eq("deduplicated", false)
    .order("created_at", { ascending: true });

  if (statsError) throw new Error(statsError.message);

  const rows = (stats ?? []) as { created_at: string }[];
  const totalTouches = rows.length;
  const firstTouchAt = rows[0]?.created_at ?? null;
  const computed = computeBaselineStatus(firstTouchAt, totalTouches);

  await insforge.database.from("venue_baseline").upsert([
    {
      venue_id: venueId,
      first_touch_at: firstTouchAt,
      total_touches: totalTouches,
      baseline_ready: computed.ready,
    },
  ]);

  return computed;
}

/**
 * Loads venue baseline gate (CL-11); refreshes cache from touch_events on read.
 */
export async function getBaselineStatus(
  venueId: string,
): Promise<VenueBaselineStatus> {
  try {
    return await refreshBaselineCache(venueId);
  } catch {
    const insforge = createInsforgeServerClient();
    const { data, error } = await insforge.database
      .from("venue_baseline")
      .select("first_touch_at, total_touches, baseline_ready")
      .eq("venue_id", venueId)
      .maybeSingle();

    if (error || !data) {
      return computeBaselineStatus(null, 0);
    }

    const row = data as VenueBaselineRow;
    const computed = computeBaselineStatus(
      row.first_touch_at,
      row.total_touches ?? 0,
    );

    return {
      ...computed,
      ready: row.baseline_ready && computed.ready,
    };
  }
}

export function isBaselineReady(status: VenueBaselineStatus): boolean {
  return status.ready;
}
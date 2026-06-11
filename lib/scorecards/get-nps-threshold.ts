import { createInsforgeServerClient } from "@/lib/insforge-server";

const DEFAULT_THRESHOLD = 6;

export async function getNpsThreshold(venueId: string): Promise<number> {
  const insforge = createInsforgeServerClient();

  const { data } = await insforge.database
    .from("venue_staff_settings")
    .select("min_feedbacks_for_nps")
    .eq("venue_id", venueId)
    .maybeSingle();

  const threshold = data?.min_feedbacks_for_nps as number | undefined;
  return threshold && threshold > 0 ? threshold : DEFAULT_THRESHOLD;
}
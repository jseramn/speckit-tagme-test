import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface VenueTagOption {
  id: string;
  slug: string;
  label: string;
}

export async function fetchVenueTags(
  venueId: string,
): Promise<VenueTagOption[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("nfc_tags")
    .select("id, slug, label")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("slug");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    label: row.label as string,
  }));
}
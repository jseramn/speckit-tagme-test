import { createInsforgeServerClient } from "@/lib/insforge-server";

export interface VenueAdminContext {
  venueId: string;
  venueName: string;
  venueSlug: string;
  experienceConfigId: string;
}

export async function getVenueAdminContext(
  venueId: string,
): Promise<VenueAdminContext | null> {
  const insforge = createInsforgeServerClient();

  const { data: venue, error: venueError } = await insforge.database
    .from("venues")
    .select("id, name, slug")
    .eq("id", venueId)
    .maybeSingle();

  if (venueError || !venue) return null;

  const { data: configs, error: configError } = await insforge.database
    .from("experience_configs")
    .select("id, title")
    .eq("venue_id", venueId)
    .order("title");

  if (configError || !configs?.length) return null;

  const config =
    configs.find((c) =>
      (c.title as string).includes("Hotel Caribe by Faranda Grand"),
    ) ?? configs[0];

  return {
    venueId: venue.id as string,
    venueName: venue.name as string,
    venueSlug: venue.slug as string,
    experienceConfigId: config.id as string,
  };
}
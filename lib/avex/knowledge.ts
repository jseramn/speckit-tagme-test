import { createInsforgeServerClient } from "@/lib/insforge-server";
import type { KnowledgeEntry } from "@/lib/avex/types";

export async function fetchKnowledgeForVenue(
  venueId: string,
): Promise<KnowledgeEntry[]> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("knowledge_entries")
    .select("id, category, title, content")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("category")
    .order("title");

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    category: row.category as KnowledgeEntry["category"],
    title: row.title as string,
    content: row.content as string,
  }));
}
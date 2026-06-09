import type { RoomContextPayload, TagSummary, VenueContact, VenueSummary } from "@/types";

export type KnowledgeCategory =
  | "hours"
  | "amenities"
  | "policies"
  | "room_service"
  | "faq";

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
}

export interface AvexTagContext extends TagSummary {
  venueId: string;
}

export interface AvexPromptContext {
  venue: VenueSummary;
  tag: AvexTagContext;
  contact: VenueContact;
  roomContext: RoomContextPayload;
  knowledge: KnowledgeEntry[];
  reservationUrl: string | null;
}

export type GuardrailAction =
  | { kind: "allow" }
  | { kind: "redirect"; reason: string; url: string }
  | { kind: "escalate"; reason: string }
  | { kind: "block_sensitive"; message: string };
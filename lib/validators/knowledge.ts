import { z } from "zod";

export const knowledgeCategories = [
  "hours",
  "amenities",
  "policies",
  "room_service",
  "faq",
] as const;

export const knowledgeCreateSchema = z.object({
  venueId: z.string().uuid(),
  category: z.enum(knowledgeCategories),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(4000),
});

export const knowledgeUpdateSchema = z.object({
  category: z.enum(knowledgeCategories).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().min(1).max(4000).optional(),
  isActive: z.boolean().optional(),
});
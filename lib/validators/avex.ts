import { z } from "zod";

export const avexChatRequestSchema = z.object({
  sessionToken: z.string().uuid(),
  tagSlug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  message: z
    .string()
    .trim()
    .min(1, "MESSAGE_REQUIRED")
    .max(500, "MESSAGE_TOO_LONG"),
});

export type AvexChatRequest = z.infer<typeof avexChatRequestSchema>;

export const avexTokenEventSchema = z.object({
  type: z.literal("token"),
  content: z.string(),
});

export const avexEscalationEventSchema = z.object({
  type: z.literal("escalation"),
  reason: z.string(),
  contact: z.object({
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
  }),
});

export const avexRedirectEventSchema = z.object({
  type: z.literal("redirect"),
  destinationType: z.literal("reservation_link"),
  url: z.string().url(),
});

export const avexDoneEventSchema = z.object({
  type: z.literal("done"),
  escalated: z.boolean(),
  sessionId: z.string().uuid(),
});

export const avexErrorEventSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export const avexSseEventSchema = z.discriminatedUnion("type", [
  avexTokenEventSchema,
  avexEscalationEventSchema,
  avexRedirectEventSchema,
  avexDoneEventSchema,
  avexErrorEventSchema,
]);

export type AvexSseEvent = z.infer<typeof avexSseEventSchema>;
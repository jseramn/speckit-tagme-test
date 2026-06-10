import { z } from "zod";

/** POST /api/reception/stays — contracts/guest-stay.md */
export const createFormalStayRequestSchema = z.object({
  venueId: z.string().uuid(),
  ttlDays: z.number().int().min(1).max(90).optional(),
});

export type CreateFormalStayRequest = z.infer<
  typeof createFormalStayRequestSchema
>;

export const createFormalStayResponseSchema = z.object({
  stayId: z.string().uuid(),
  stayToken: z.string().min(16),
  stayType: z.literal("formal"),
  expiresAt: z.string().datetime(),
  cookieSet: z.boolean(),
});

export type CreateFormalStayResponse = z.infer<
  typeof createFormalStayResponseSchema
>;

export const consolidateStayRequestSchema = z
  .object({
    ephemeralStayToken: z.string().min(16),
    formalStayId: z.string().uuid().optional(),
  })
  .refine((data) => data.ephemeralStayToken.length > 0, {
    message: "ephemeralStayToken requerido",
  });

export type ConsolidateStayRequest = z.infer<
  typeof consolidateStayRequestSchema
>;

export const stayLookupResponseSchema = z.object({
  stayId: z.string().uuid(),
  stayType: z.enum(["formal", "ephemeral"]),
  status: z.enum(["active", "expired", "consolidated", "closed"]),
  expiresAt: z.string().datetime(),
  recordCounts: z.object({
    feedbacks: z.number().int().nonnegative(),
    incidents: z.number().int().nonnegative(),
  }),
});

export type StayLookupResponse = z.infer<typeof stayLookupResponseSchema>;
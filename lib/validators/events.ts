import { z } from "zod";

/** POST /api/events/touch — contracts/analytics-events.md */
export const touchEventRequestSchema = z.object({
  tagSlug: z.string().min(1).max(128),
  channel: z.enum(["nfc", "url_direct", "staff_assisted"]),
  clientFingerprint: z.string().max(256).optional(),
});

export type TouchEventRequest = z.infer<typeof touchEventRequestSchema>;

export const touchEventResponseSchema = z.object({
  touchEventId: z.string().uuid(),
  deduplicated: z.boolean(),
});

export type TouchEventResponse = z.infer<typeof touchEventResponseSchema>;

/** POST /api/events/destination — contracts/analytics-events.md */
export const destinationVisitRequestSchema = z
  .object({
    touchEventId: z.string().uuid(),
    destinationType: z.enum([
      "menu",
      "external",
      "reservation_link",
      "info",
      "social",
      "avex",
    ]),
    destinationUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.destinationType !== "avex" && !data.destinationUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "destinationUrl requerido cuando destinationType no es avex",
        path: ["destinationUrl"],
      });
    }
  });

export type DestinationVisitRequest = z.infer<
  typeof destinationVisitRequestSchema
>;

export const destinationVisitResponseSchema = z.object({
  destinationVisitId: z.string().uuid(),
});

export type DestinationVisitResponse = z.infer<
  typeof destinationVisitResponseSchema
>;

/** GET /api/metrics/summary — contracts/analytics-events.md */
export const metricsSummarySchema = z.object({
  venueId: z.string().uuid(),
  period: z.object({
    from: z.string(),
    to: z.string(),
  }),
  touchesDaily: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    }),
  ),
  peakHours: z.array(
    z.object({
      hour: z.number().int().min(0).max(23),
      count: z.number(),
    }),
  ),
  destinationBreakdown: z.array(
    z.object({
      type: z.string(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  deviceBreakdown: z.array(
    z.object({
      type: z.string(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  countryBreakdown: z.array(
    z.object({
      countryCode: z.string(),
      count: z.number(),
    }),
  ),
});

export type MetricsSummary = z.infer<typeof metricsSummarySchema>;
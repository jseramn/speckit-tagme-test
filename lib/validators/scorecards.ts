import { z } from "zod";

export const scorecardPeriodSchema = z.enum(["7d", "30d", "90d", "custom"]);

export const scorecardQuerySchema = z
  .object({
    period: scorecardPeriodSchema.default("30d"),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    includeComments: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  })
  .refine(
    (data) =>
      data.period !== "custom" || (Boolean(data.from) && Boolean(data.to)),
    { message: "Periodo custom requiere from y to", path: ["from"] },
  );

export type ScorecardQuery = z.infer<typeof scorecardQuerySchema>;

export const feedbackSummaryQuerySchema = z.object({
  period: scorecardPeriodSchema.default("7d"),
  venueId: z.string().uuid().optional(),
});

export type FeedbackSummaryQuery = z.infer<typeof feedbackSummaryQuerySchema>;

export const employeeScorecardResponseSchema = z.object({
  level: z.literal("employee"),
  staffMemberId: z.string().uuid(),
  displayName: z.string(),
  departmentName: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  metrics: z.object({
    feedbackCount: z.number(),
    avgRating: z.number().nullable(),
    npsInternal: z.number().nullable(),
    insufficientData: z.boolean(),
    pctPromoters: z.number().optional(),
    pctDetractors: z.number().optional(),
    message: z.string().optional(),
    incidentCountLinked: z.number().optional(),
    trend7d: z
      .object({
        npsInternal: z.number().nullable(),
        feedbackCount: z.number(),
      })
      .optional(),
  }),
});
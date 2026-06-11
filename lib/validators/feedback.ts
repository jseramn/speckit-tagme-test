import { z } from "zod";

/**
 * POST /api/capture/feedback — contracts/guest-capture.md
 * Sin campos de incidencia (Principio IV).
 */
export const submitFeedbackRequestSchema = z
  .object({
    sessionToken: z.string().uuid().optional(),
    roomTagSlug: z.string().min(1).max(128).optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasSession = Boolean(data.sessionToken);
    const hasRoom = Boolean(data.roomTagSlug);
    if (hasSession === hasRoom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactamente uno de sessionToken o roomTagSlug es requerido",
        path: ["sessionToken"],
      });
    }
  });

export type SubmitFeedbackRequest = z.infer<typeof submitFeedbackRequestSchema>;

export const submitFeedbackResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  message: z.string(),
});

export type SubmitFeedbackResponse = z.infer<
  typeof submitFeedbackResponseSchema
>;
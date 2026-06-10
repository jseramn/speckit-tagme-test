import { z } from "zod";

/**
 * POST /api/capture/incident — contracts/guest-capture.md
 * Sin campo rating (Principio IV).
 */
export const submitIncidentRequestSchema = z
  .object({
    sessionToken: z.string().uuid().optional(),
    roomTagSlug: z.string().min(1).max(128).optional(),
    category: z.string().min(1).max(64),
    description: z.string().min(3).max(4000),
    priority: z.enum(["baja", "media", "alta", "urgente"]).optional(),
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

export type SubmitIncidentRequest = z.infer<typeof submitIncidentRequestSchema>;

export const submitIncidentResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("abierta"),
  category: z.string(),
  priority: z.enum(["baja", "media", "alta", "urgente"]),
  createdAt: z.string().datetime(),
});

export type SubmitIncidentResponse = z.infer<
  typeof submitIncidentResponseSchema
>;
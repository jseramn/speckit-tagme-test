import { z } from "zod";

export const listIncidentsQuerySchema = z.object({
  status: z
    .enum(["abierta", "en_progreso", "resuelta", "cerrada", "open"])
    .optional(),
  departmentId: z.string().uuid().optional(),
  category: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

export const patchIncidentRequestSchema = z
  .object({
    status: z
      .enum(["abierta", "en_progreso", "resuelta", "cerrada"])
      .optional(),
    assignedToStaffMemberId: z.string().uuid().nullable().optional(),
    note: z.string().max(2000).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.status !== undefined ||
      data.assignedToStaffMemberId !== undefined,
    { message: "Se requiere status o assignedToStaffMemberId" },
  );

export type PatchIncidentRequest = z.infer<typeof patchIncidentRequestSchema>;
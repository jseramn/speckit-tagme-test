import { z } from "zod";

export const tagCreateSchema = z.object({
  venueId: z.string().uuid(),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug: solo minúsculas, números y guiones"),
  label: z.string().min(1),
  zone: z.enum(["lobby", "room", "restaurant", "bar", "other"]),
  roomNumber: z.string().nullable().optional(),
  experienceConfigId: z.string().uuid(),
});

export const tagPatchSchema = z
  .object({
    label: z.string().min(1).optional(),
    zone: z.enum(["lobby", "room", "restaurant", "bar", "other"]).optional(),
    roomNumber: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    experienceConfigId: z.string().uuid().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Al menos un campo requerido",
  });
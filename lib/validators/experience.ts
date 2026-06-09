import { z } from "zod";

const destinationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "menu",
    "external",
    "reservation_link",
    "info",
    "social",
  ]),
  label: z.string().min(1),
  url: z.string().url(),
  icon: z.string().min(1),
  is_primary: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
});

export const experienceUpdateSchema = z
  .object({
    title: z.string().min(1),
    welcomeMessage: z.string().nullable().optional(),
    avexEnabled: z.boolean(),
    destinations: z.array(destinationSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const primaryCount = data.destinations.filter(
      (d) => d.is_primary === true || d.isPrimary === true,
    ).length;

    if (primaryCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe haber exactamente un destino principal (isPrimary)",
        path: ["destinations"],
      });
    }
  });

export type ExperienceUpdateInput = z.infer<typeof experienceUpdateSchema>;

export function toDbDestinations(
  destinations: ExperienceUpdateInput["destinations"],
) {
  return destinations.map((d) => ({
    id: d.id,
    type: d.type,
    label: d.label,
    url: d.url,
    icon: d.icon,
    is_primary: d.is_primary ?? d.isPrimary ?? false,
  }));
}
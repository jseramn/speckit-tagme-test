import { z } from "zod";

export const departmentCreateSchema = z.object({
  name: z.string().min(1).max(120),
  code: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9_]+$/, "Código: mayúsculas, números y guión bajo"),
  isActive: z.boolean().optional().default(true),
});

export const departmentUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    code: z
      .string()
      .min(2)
      .max(32)
      .regex(/^[A-Z0-9_]+$/)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Al menos un campo requerido",
  });

export const jobRoleCreateSchema = z.object({
  departmentId: z.string().uuid(),
  title: z.string().min(1).max(120),
  isActive: z.boolean().optional().default(true),
});

export const jobRoleUpdateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Al menos un campo requerido",
  });

export const shiftCreateSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1).max(120),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
    .nullable(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
    .nullable(),
  daysOfWeek: z
    .array(z.number().int().min(1).max(7))
    .min(1)
    .max(7),
  isActive: z.boolean().optional().default(true),
});

export const shiftUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Al menos un campo requerido",
  });

export const staffMemberCreateSchema = z.object({
  departmentId: z.string().uuid(),
  jobRoleId: z.string().uuid(),
  displayName: z.string().min(1).max(120),
  userProfileId: z.string().uuid().nullable().optional(),
  employeeCode: z.string().max(64).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const staffMemberUpdateSchema = z
  .object({
    departmentId: z.string().uuid().optional(),
    jobRoleId: z.string().uuid().optional(),
    displayName: z.string().min(1).max(120).optional(),
    userProfileId: z.string().uuid().nullable().optional(),
    employeeCode: z.string().max(64).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Al menos un campo requerido",
  });

export const nfcTagAssignSchema = z.object({
  tagSlug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug: solo minúsculas, números y guiones"),
});

export const shiftAssignmentSchema = z.object({
  shiftId: z.string().uuid(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const listOrgQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
});

export const venueSettingsUpdateSchema = z
  .object({
    staffFeedbackEnabled: z.boolean().optional(),
    defaultStayTtlDays: z.number().int().min(1).max(365).optional(),
    ephemeralStayTtlHours: z.number().int().min(1).max(168).optional(),
    minFeedbacksForNps: z.number().int().min(1).max(100).optional(),
    sessionDedupSeconds: z.number().int().min(0).max(300).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Al menos un campo requerido",
  });

export const feedbackCommentsQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
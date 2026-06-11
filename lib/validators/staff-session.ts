import { z } from "zod";

/** POST /api/staff/sessions/open — contracts/staff-nfc-session.md */
export const openStaffSessionRequestSchema = z.object({
  staffTagSlug: z.string().min(1).max(128),
  clientFingerprint: z.string().max(256).optional(),
});

export type OpenStaffSessionRequest = z.infer<
  typeof openStaffSessionRequestSchema
>;

export const staffSessionContextSchema = z.object({
  displayName: z.string(),
  departmentName: z.string(),
  jobRoleTitle: z.string(),
});

export const openStaffSessionResponseSchema = z.object({
  sessionToken: z.string().uuid(),
  expiresAt: z.string().datetime(),
  captureUrl: z.string(),
  staff: staffSessionContextSchema,
  deduplicated: z.boolean(),
});

export type OpenStaffSessionResponse = z.infer<
  typeof openStaffSessionResponseSchema
>;

export const staffSessionPollResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("active"),
    expiresAt: z.string().datetime(),
    secondsRemaining: z.number().int().nonnegative(),
    staff: staffSessionContextSchema,
    stayLinked: z.boolean(),
  }),
  z.object({
    status: z.literal("expired"),
    message: z.string(),
  }),
]);

export type StaffSessionPollResponse = z.infer<
  typeof staffSessionPollResponseSchema
>;
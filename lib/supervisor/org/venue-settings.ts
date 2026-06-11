import type { StaffSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertManagerOrAdmin,
  requireVenueId,
} from "@/lib/supervisor/org/helpers";
import type { venueSettingsUpdateSchema } from "@/lib/validators/supervisor-org";
import type { z } from "zod";

export interface VenueSettingsResponse {
  venueId: string;
  staffFeedbackEnabled: boolean;
  defaultStayTtlDays: number;
  ephemeralStayTtlHours: number;
  sessionTtlMinutes: number;
  sessionDedupSeconds: number;
  minFeedbacksForNps: number;
  updatedAt: string | null;
}

export interface IncidentCategoryItem {
  code: string;
  label: string;
  defaultPriority: string;
  departmentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

function mapSettings(row: Record<string, unknown>): VenueSettingsResponse {
  return {
    venueId: row.venue_id as string,
    staffFeedbackEnabled: row.staff_feedback_enabled as boolean,
    defaultStayTtlDays: row.default_stay_ttl_days as number,
    ephemeralStayTtlHours: row.ephemeral_stay_ttl_hours as number,
    sessionTtlMinutes: row.session_ttl_minutes as number,
    sessionDedupSeconds: row.session_dedup_seconds as number,
    minFeedbacksForNps: row.min_feedbacks_for_nps as number,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

export async function getVenueSettings(
  session: StaffSession,
): Promise<VenueSettingsResponse> {
  const venueId = await requireVenueId(session);
  const insforge = createInsforgeServerClient();

  const { data } = await insforge.database
    .from("venue_staff_settings")
    .select(
      "venue_id, staff_feedback_enabled, default_stay_ttl_days, ephemeral_stay_ttl_hours, session_ttl_minutes, session_dedup_seconds, min_feedbacks_for_nps, updated_at",
    )
    .eq("venue_id", venueId)
    .maybeSingle();

  if (!data) {
    return {
      venueId,
      staffFeedbackEnabled: true,
      defaultStayTtlDays: 7,
      ephemeralStayTtlHours: 48,
      sessionTtlMinutes: 5,
      sessionDedupSeconds: 45,
      minFeedbacksForNps: 6,
      updatedAt: null,
    };
  }

  return mapSettings(data);
}

export async function updateVenueSettings(
  session: StaffSession,
  body: z.infer<typeof venueSettingsUpdateSchema>,
): Promise<VenueSettingsResponse> {
  await assertManagerOrAdmin(session);
  const venueId = await requireVenueId(session);
  const insforge = createInsforgeServerClient();

  const patch: Record<string, unknown> = { venue_id: venueId };
  if (body.staffFeedbackEnabled !== undefined) {
    patch.staff_feedback_enabled = body.staffFeedbackEnabled;
  }
  if (body.defaultStayTtlDays !== undefined) {
    patch.default_stay_ttl_days = body.defaultStayTtlDays;
  }
  if (body.ephemeralStayTtlHours !== undefined) {
    patch.ephemeral_stay_ttl_hours = body.ephemeralStayTtlHours;
  }
  if (body.minFeedbacksForNps !== undefined) {
    patch.min_feedbacks_for_nps = body.minFeedbacksForNps;
  }
  if (body.sessionDedupSeconds !== undefined) {
    patch.session_dedup_seconds = body.sessionDedupSeconds;
  }

  const { data, error } = await insforge.database
    .from("venue_staff_settings")
    .upsert([patch], { onConflict: "venue_id" })
    .select(
      "venue_id, staff_feedback_enabled, default_stay_ttl_days, ephemeral_stay_ttl_hours, session_ttl_minutes, session_dedup_seconds, min_feedbacks_for_nps, updated_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return mapSettings(data);
}

export async function listIncidentCategories(
  session: StaffSession,
): Promise<{ items: IncidentCategoryItem[] }> {
  const venueId = await requireVenueId(session);
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("venue_incident_categories")
    .select(
      "code, label, default_priority, department_id, sort_order, is_active",
    )
    .eq("venue_id", venueId)
    .order("sort_order");

  if (error) throw new Error(error.message);

  return {
    items: (data ?? []).map((row) => ({
      code: row.code as string,
      label: row.label as string,
      defaultPriority: row.default_priority as string,
      departmentId: (row.department_id as string | null) ?? null,
      sortOrder: row.sort_order as number,
      isActive: row.is_active as boolean,
    })),
  };
}
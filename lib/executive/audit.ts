import { createInsforgeServerClient } from "@/lib/insforge-server";

/** Dev-only IDs that are not present in auth.users — audit FK would fail. */
const DEV_AUDIT_USER_IDS = new Set([
  "dev-staff",
  "00000000-0000-4000-a000-000000000001",
]);

/**
 * Resolves user_id for executive_audit_log inserts.
 * Returns null for dev bypass sessions so FK to auth.users is not violated.
 */
export function resolveAuditUserId(userId: string): string | null {
  if (DEV_AUDIT_USER_IDS.has(userId)) return null;
  return userId;
}

export interface ContentCorrectionRequest {
  userId: string;
  venueId: string;
  tagId: string;
  tagLabel: string;
  note?: string;
}

/**
 * Records a manual content correction request for staff follow-up (T074).
 * No automated workflow — audit trail only.
 */
export async function logContentCorrectionRequest(
  input: ContentCorrectionRequest,
): Promise<void> {
  const insforge = createInsforgeServerClient();

  const { error } = await insforge.database.from("executive_audit_log").insert([
    {
      user_id: resolveAuditUserId(input.userId),
      venue_id: input.venueId,
      action: "request_content_correction",
      resource_type: "nfc_tag",
      resource_id: input.tagId,
      metadata: {
        tagLabel: input.tagLabel,
        note: input.note?.trim() || null,
        workflow: "manual_staff_followup",
      },
    },
  ]);

  if (error) throw new Error(error.message);
}

export interface ReportExportAuditInput {
  userId: string;
  venueId: string;
  format: "csv" | "print";
  period: "7d" | "30d";
  from: string;
  to: string;
}

export async function logReportExport(
  input: ReportExportAuditInput,
): Promise<void> {
  const insforge = createInsforgeServerClient();

  const { error } = await insforge.database.from("executive_audit_log").insert([
    {
      user_id: resolveAuditUserId(input.userId),
      venue_id: input.venueId,
      action: "export_report",
      resource_type: "executive_report",
      resource_id: null,
      metadata: {
        format: input.format,
        period: input.period,
        from: input.from,
        to: input.to,
      },
    },
  ]);

  if (error) throw new Error(error.message);
}

export interface ConfigChangeAuditInput {
  userId: string;
  venueId: string;
  action: "update_threshold" | "update_kpi_target";
  resourceId: string;
  metadata: Record<string, unknown>;
}

export async function logConfigChange(
  input: ConfigChangeAuditInput,
): Promise<void> {
  const insforge = createInsforgeServerClient();

  const resourceType =
    input.action === "update_threshold" ? "alert_threshold" : "kpi_target";

  const { error } = await insforge.database.from("executive_audit_log").insert([
    {
      user_id: resolveAuditUserId(input.userId),
      venue_id: input.venueId,
      action: input.action,
      resource_type: resourceType,
      resource_id: input.resourceId,
      metadata: input.metadata,
    },
  ]);

  if (error) throw new Error(error.message);
}
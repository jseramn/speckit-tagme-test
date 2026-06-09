import { createInsforgeServerClient } from "@/lib/insforge-server";

type AuditEntity = "experience_config" | "knowledge_entry" | "nfc_tag";
type AuditAction = "create" | "update" | "delete";

interface AuditParams {
  userId: string;
  venueId: string | null;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  diff: Record<string, unknown>;
}

export async function logContentAudit(params: AuditParams): Promise<void> {
  const insforge = createInsforgeServerClient();

  const { error } = await insforge.database.from("content_audit_log").insert([
    {
      user_id: params.userId === "dev-staff" ? null : params.userId,
      venue_id: params.venueId,
      entity: params.entity,
      entity_id: params.entityId,
      action: params.action,
      diff: params.diff,
    },
  ]);

  if (error) {
    console.error("[tagme] content_audit_log insert failed:", error.message);
  }
}
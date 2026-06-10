/**
 * TagMe Fase 3 — Staff & Feedback Operativo types (T001, T020)
 *
 * F1 REUTILIZABLE (sin cambios estructurales en M0):
 * - lib/insforge.ts          — browser client (anon key)
 * - lib/insforge-server.ts   — service role client (bypass RLS; captura APIs)
 * - lib/auth/session.ts       — extendido: supervisor/manager + canManageGuestStays
 * - app/(guest)/layout.tsx    — mobile-first shell captura huésped
 * - app/(admin)/layout.tsx    — patrón visual supervisor (M6)
 * - lib/tags/resolve-tag.ts   — patrón JOIN para resolveStaffTag (M1)
 *
 * GAPS F3 (trabajo nuevo en M0+):
 * - Roles supervisor/manager en DB + RLS helpers SQL
 * - Tablas staff_capture_sessions, guest_stays, feedback_entries, incident_reports
 * - Rutas /s/, /capture/, (staff)/, (supervisor)/
 * - lib/staff/*, lib/stays/*, lib/capture/* — sesión TTL, cookie estadía
 * - Validadores Zod separados feedback vs incidencia (Principio IV)
 * - staff_capture_sessions deny-by-default RLS; escritura solo service role
 * - touch_events.event_type staff_capture_open sin tag_id nullable (M1 resolverá metadata)
 */

export type StaffRole =
  | "staff"
  | "supervisor"
  | "manager"
  | "admin"
  | "ops";

export type CaptureOriginType = "staff_nfc" | "room_nfc";

export type GuestStayType = "formal" | "ephemeral";

export type GuestStayStatus =
  | "active"
  | "expired"
  | "consolidated"
  | "closed";

export type CaptureSessionStatus = "active" | "completed" | "expired";

export type IncidentStatus =
  | "abierta"
  | "en_progreso"
  | "resuelta"
  | "cerrada";

export type IncidentPriority = "baja" | "media" | "alta" | "urgente";

/** Immutable snapshot at session/feedback creation (data-model.md §context_snapshot) */
export interface ContextSnapshot {
  staff_member_id: string;
  display_name: string;
  department_id: string;
  department_name: string;
  job_role_id: string;
  job_role_title: string;
  shift_id: string | null;
  shift_name: string | null;
  staff_nfc_tag_id: string;
  venue_timezone: string;
}

export interface StaffCaptureSession {
  id: string;
  session_token: string;
  staff_member_id: string;
  staff_nfc_tag_id: string;
  guest_stay_id: string | null;
  venue_id: string;
  status: CaptureSessionStatus;
  expires_at: string;
  context_snapshot: ContextSnapshot;
  client_fingerprint: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GuestStay {
  id: string;
  venue_id: string;
  stay_token: string;
  stay_type: GuestStayType;
  status: GuestStayStatus;
  consolidated_into: string | null;
  started_at: string;
  expires_at: string;
  closed_at: string | null;
  created_by: string | null;
}

export interface FeedbackEntry {
  id: string;
  venue_id: string;
  guest_stay_id: string;
  staff_member_id: string | null;
  staff_capture_session_id: string | null;
  origin_type: CaptureOriginType;
  origin_id: string;
  rating: number;
  comment: string | null;
  context_snapshot: ContextSnapshot | Record<string, unknown>;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  venue_id: string;
  guest_stay_id: string;
  staff_member_id: string | null;
  staff_capture_session_id: string | null;
  department_id: string | null;
  origin_type: CaptureOriginType;
  origin_id: string;
  category: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  description: string;
  context_snapshot: ContextSnapshot | Record<string, unknown>;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ScorecardMetrics {
  feedback_count: number;
  avg_rating: number | null;
  nps_internal: number | null;
  promoters: number;
  detractors: number;
  insufficient_data: boolean;
  open_incidents?: number;
  active_stays?: number;
}

export interface Department {
  id: string;
  venue_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface JobRole {
  id: string;
  department_id: string;
  title: string;
  is_active: boolean;
}

export interface StaffMember {
  id: string;
  venue_id: string;
  department_id: string;
  job_role_id: string;
  user_profile_id: string | null;
  display_name: string;
  employee_code: string | null;
  is_active: boolean;
}

export interface StaffNfcTag {
  id: string;
  staff_member_id: string;
  tag_slug: string;
  is_active: boolean;
  assigned_at: string;
  revoked_at: string | null;
}
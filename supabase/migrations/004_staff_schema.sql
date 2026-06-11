-- TagMe Fase 3 — Staff Schema
-- Spec: specs/003-staff/data-model.md
-- Migration: 004_staff_schema.sql
-- Tasks: T004–T008

BEGIN;

-- ---------------------------------------------------------------------------
-- venue_staff_settings (T004)
-- ---------------------------------------------------------------------------
CREATE TABLE public.venue_staff_settings (
  venue_id                  UUID        PRIMARY KEY REFERENCES public.venues (id) ON DELETE CASCADE,
  staff_feedback_enabled    BOOLEAN     NOT NULL DEFAULT true,
  default_stay_ttl_days     INTEGER     NOT NULL DEFAULT 7,
  ephemeral_stay_ttl_hours  INTEGER     NOT NULL DEFAULT 48,
  session_ttl_minutes       INTEGER     NOT NULL DEFAULT 5,
  session_dedup_seconds     INTEGER     NOT NULL DEFAULT 45,
  min_feedbacks_for_nps     INTEGER     NOT NULL DEFAULT 6,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT venue_staff_settings_default_stay_ttl_days_check CHECK (default_stay_ttl_days > 0),
  CONSTRAINT venue_staff_settings_ephemeral_stay_ttl_hours_check CHECK (ephemeral_stay_ttl_hours > 0),
  CONSTRAINT venue_staff_settings_session_ttl_minutes_check CHECK (session_ttl_minutes > 0),
  CONSTRAINT venue_staff_settings_session_dedup_seconds_check CHECK (session_dedup_seconds >= 0),
  CONSTRAINT venue_staff_settings_min_feedbacks_for_nps_check CHECK (min_feedbacks_for_nps > 0)
);

CREATE TRIGGER trg_venue_staff_settings_updated_at
  BEFORE UPDATE ON public.venue_staff_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.venue_staff_settings IS 'Configuración operativa staff por venue (Principio VIII)';

-- ---------------------------------------------------------------------------
-- departments (T004)
-- ---------------------------------------------------------------------------
CREATE TABLE public.departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  code        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT departments_venue_code_unique UNIQUE (venue_id, code)
);

CREATE INDEX idx_departments_venue_active ON public.departments (venue_id, is_active);

COMMENT ON TABLE public.departments IS 'Departamentos operativos configurables por venue';

-- ---------------------------------------------------------------------------
-- job_roles (T004)
-- ---------------------------------------------------------------------------
CREATE TABLE public.job_roles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID        NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_roles_department_id ON public.job_roles (department_id);

COMMENT ON TABLE public.job_roles IS 'Cargos por departamento (ej. Camarista, Mesero)';

-- ---------------------------------------------------------------------------
-- shifts (T004)
-- ---------------------------------------------------------------------------
CREATE TABLE public.shifts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID        NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  start_time      TIME,
  end_time        TIME,
  days_of_week    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_department_id ON public.shifts (department_id);

COMMENT ON TABLE public.shifts IS 'Turnos de referencia operativa; no se infieren por hora al capturar (Q1=B)';

-- ---------------------------------------------------------------------------
-- supervisor_department_assignments (T004)
-- ---------------------------------------------------------------------------
CREATE TABLE public.supervisor_department_assignments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id   UUID        NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  department_id     UUID        NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT supervisor_department_assignments_unique UNIQUE (user_profile_id, department_id)
);

CREATE INDEX idx_supervisor_department_assignments_dept
  ON public.supervisor_department_assignments (department_id);

COMMENT ON TABLE public.supervisor_department_assignments IS 'Scope RLS supervisor por departamento asignado';

-- ---------------------------------------------------------------------------
-- staff_members (T005)
-- ---------------------------------------------------------------------------
CREATE TABLE public.staff_members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  department_id     UUID        NOT NULL REFERENCES public.departments (id) ON DELETE RESTRICT,
  job_role_id       UUID        NOT NULL REFERENCES public.job_roles (id) ON DELETE RESTRICT,
  user_profile_id   UUID        REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  display_name      TEXT        NOT NULL,
  employee_code     TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_members_venue_active ON public.staff_members (venue_id, is_active);
CREATE INDEX idx_staff_members_department_id ON public.staff_members (department_id);
CREATE INDEX idx_staff_members_user_profile_id ON public.staff_members (user_profile_id)
  WHERE user_profile_id IS NOT NULL;

COMMENT ON TABLE public.staff_members IS 'Empleado operativo del venue';

-- ---------------------------------------------------------------------------
-- staff_nfc_tags (T005)
-- ---------------------------------------------------------------------------
CREATE TABLE public.staff_nfc_tags (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id   UUID        NOT NULL REFERENCES public.staff_members (id) ON DELETE CASCADE,
  tag_slug          TEXT        NOT NULL UNIQUE,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_staff_nfc_tags_one_active_per_member
  ON public.staff_nfc_tags (staff_member_id)
  WHERE is_active = true;

CREATE INDEX idx_staff_nfc_slug
  ON public.staff_nfc_tags (tag_slug)
  WHERE is_active = true;

COMMENT ON TABLE public.staff_nfc_tags IS 'Tarjeta NFC personal del empleado — URL /s/{tag_slug}';

-- ---------------------------------------------------------------------------
-- staff_shift_assignments (T005)
-- ---------------------------------------------------------------------------
CREATE TABLE public.staff_shift_assignments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id   UUID        NOT NULL REFERENCES public.staff_members (id) ON DELETE CASCADE,
  shift_id          UUID        NOT NULL REFERENCES public.shifts (id) ON DELETE RESTRICT,
  effective_from    DATE        NOT NULL,
  effective_to      DATE,

  CONSTRAINT staff_shift_assignments_date_range_check CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  )
);

CREATE INDEX idx_staff_shift_assignments_member_dates
  ON public.staff_shift_assignments (staff_member_id, effective_from DESC);

COMMENT ON TABLE public.staff_shift_assignments IS 'Asignación explícita de turno; resolución al capturar sin inferencia horaria';

-- ---------------------------------------------------------------------------
-- guest_stays (T005)
-- ---------------------------------------------------------------------------
CREATE TABLE public.guest_stays (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  stay_token          TEXT        NOT NULL UNIQUE,
  stay_type           TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'active',
  consolidated_into   UUID        REFERENCES public.guest_stays (id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  closed_at           TIMESTAMPTZ,
  created_by          UUID        REFERENCES public.user_profiles (id) ON DELETE SET NULL,

  CONSTRAINT guest_stays_stay_type_check CHECK (stay_type IN ('formal', 'ephemeral')),
  CONSTRAINT guest_stays_status_check CHECK (
    status IN ('active', 'expired', 'consolidated', 'closed')
  )
);

CREATE INDEX idx_guest_stays_token
  ON public.guest_stays (stay_token)
  WHERE status = 'active';

CREATE INDEX idx_guest_stays_venue_status ON public.guest_stays (venue_id, status);

COMMENT ON TABLE public.guest_stays IS 'Identidad anónima de estadía (cookie tagme_stay)';

-- ---------------------------------------------------------------------------
-- staff_capture_sessions (T005)
-- ---------------------------------------------------------------------------
CREATE TABLE public.staff_capture_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token       TEXT        NOT NULL UNIQUE,
  staff_member_id     UUID        NOT NULL REFERENCES public.staff_members (id) ON DELETE RESTRICT,
  staff_nfc_tag_id    UUID        NOT NULL REFERENCES public.staff_nfc_tags (id) ON DELETE RESTRICT,
  guest_stay_id       UUID        REFERENCES public.guest_stays (id) ON DELETE SET NULL,
  venue_id            UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'active',
  expires_at          TIMESTAMPTZ NOT NULL,
  context_snapshot    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  client_fingerprint  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,

  CONSTRAINT staff_capture_sessions_status_check CHECK (
    status IN ('active', 'completed', 'expired')
  )
);

CREATE INDEX idx_sessions_token
  ON public.staff_capture_sessions (session_token)
  WHERE status = 'active';

CREATE INDEX idx_staff_capture_sessions_venue_created
  ON public.staff_capture_sessions (venue_id, created_at DESC);

COMMENT ON TABLE public.staff_capture_sessions IS 'Sesión efímera staff↔huésped (TTL 5 min, Principio V)';

-- ---------------------------------------------------------------------------
-- feedback_entries (T006)
-- ---------------------------------------------------------------------------
CREATE TABLE public.feedback_entries (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id                  UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  guest_stay_id             UUID        NOT NULL REFERENCES public.guest_stays (id) ON DELETE RESTRICT,
  staff_member_id           UUID        REFERENCES public.staff_members (id) ON DELETE SET NULL,
  staff_capture_session_id  UUID        REFERENCES public.staff_capture_sessions (id) ON DELETE SET NULL,
  origin_type               TEXT        NOT NULL,
  origin_id                 UUID        NOT NULL,
  rating                    SMALLINT    NOT NULL,
  comment                   TEXT,
  context_snapshot          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT feedback_entries_origin_type_check CHECK (
    origin_type IN ('staff_nfc', 'room_nfc')
  ),
  CONSTRAINT feedback_entries_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT feedback_entries_origin_staff_check CHECK (
    (origin_type = 'staff_nfc' AND staff_member_id IS NOT NULL)
    OR (origin_type = 'room_nfc')
  )
);

CREATE INDEX idx_feedback_venue_created
  ON public.feedback_entries (venue_id, created_at DESC);

CREATE INDEX idx_feedback_staff_created
  ON public.feedback_entries (staff_member_id, created_at DESC)
  WHERE staff_member_id IS NOT NULL;

COMMENT ON TABLE public.feedback_entries IS 'Opinión/calificación — separado de incidencias (Principio IV)';

-- ---------------------------------------------------------------------------
-- incident_reports (T006)
-- ---------------------------------------------------------------------------
CREATE TABLE public.incident_reports (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id                  UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  guest_stay_id             UUID        NOT NULL REFERENCES public.guest_stays (id) ON DELETE RESTRICT,
  staff_member_id           UUID        REFERENCES public.staff_members (id) ON DELETE SET NULL,
  staff_capture_session_id  UUID        REFERENCES public.staff_capture_sessions (id) ON DELETE SET NULL,
  department_id             UUID        REFERENCES public.departments (id) ON DELETE SET NULL,
  origin_type               TEXT        NOT NULL,
  origin_id                 UUID        NOT NULL,
  category                  TEXT        NOT NULL,
  priority                  TEXT        NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'abierta',
  description               TEXT        NOT NULL,
  context_snapshot          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  assigned_to               UUID        REFERENCES public.staff_members (id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at               TIMESTAMPTZ,

  CONSTRAINT incident_reports_origin_type_check CHECK (
    origin_type IN ('staff_nfc', 'room_nfc')
  ),
  CONSTRAINT incident_reports_priority_check CHECK (
    priority IN ('baja', 'media', 'alta', 'urgente')
  ),
  CONSTRAINT incident_reports_status_check CHECK (
    status IN ('abierta', 'en_progreso', 'resuelta', 'cerrada')
  ),
  CONSTRAINT incident_reports_origin_staff_check CHECK (
    (origin_type = 'staff_nfc' AND staff_member_id IS NOT NULL)
    OR (origin_type = 'room_nfc')
  )
);

CREATE INDEX idx_incidents_venue_status
  ON public.incident_reports (venue_id, status)
  WHERE status IN ('abierta', 'en_progreso');

COMMENT ON TABLE public.incident_reports IS 'Problema operativo con workflow — separado de feedback (Principio IV)';

-- ---------------------------------------------------------------------------
-- incident_status_history (T006)
-- ---------------------------------------------------------------------------
CREATE TABLE public.incident_status_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   UUID        NOT NULL REFERENCES public.incident_reports (id) ON DELETE CASCADE,
  changed_by    UUID        NOT NULL REFERENCES public.user_profiles (id) ON DELETE RESTRICT,
  from_status   TEXT,
  to_status     TEXT        NOT NULL,
  note          TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT incident_status_history_to_status_check CHECK (
    to_status IN ('abierta', 'en_progreso', 'resuelta', 'cerrada')
  )
);

CREATE INDEX idx_incident_status_history_incident
  ON public.incident_status_history (incident_id, changed_at DESC);

COMMENT ON TABLE public.incident_status_history IS 'Auditoría de cambios de estado de incidencias';

-- ---------------------------------------------------------------------------
-- venue_incident_categories (T006)
-- ---------------------------------------------------------------------------
CREATE TABLE public.venue_incident_categories (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id                UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  code                    TEXT        NOT NULL,
  label                   TEXT        NOT NULL,
  default_department_id   UUID        REFERENCES public.departments (id) ON DELETE SET NULL,
  default_priority        TEXT        NOT NULL DEFAULT 'media',
  sort_order              INTEGER     NOT NULL DEFAULT 0,
  is_active               BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT venue_incident_categories_venue_code_unique UNIQUE (venue_id, code),
  CONSTRAINT venue_incident_categories_default_priority_check CHECK (
    default_priority IN ('baja', 'media', 'alta', 'urgente')
  )
);

CREATE INDEX idx_venue_incident_categories_venue
  ON public.venue_incident_categories (venue_id, sort_order);

COMMENT ON TABLE public.venue_incident_categories IS 'Categorías de incidencia configurables por venue';

-- ---------------------------------------------------------------------------
-- Fase 1 extensions (T007)
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (
    role IN ('staff', 'supervisor', 'manager', 'admin', 'ops')
  );

ALTER TABLE public.touch_events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'hub_visit',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.touch_events
  DROP CONSTRAINT IF EXISTS touch_events_event_type_check;

ALTER TABLE public.touch_events
  ADD CONSTRAINT touch_events_event_type_check CHECK (
    event_type IN ('hub_visit', 'staff_capture_open', 'room_capture_open')
  );

COMMENT ON COLUMN public.touch_events.event_type IS
  'Tipo analítico: hub_visit (F1), staff_capture_open, room_capture_open (F3)';

COMMENT ON COLUMN public.touch_events.metadata IS
  'JSON opcional: staff_capture_session_id, stay_id, staff_nfc_tag_id, etc.';

COMMIT;
-- TagMe Fase 3 — Staff RLS Policies & Helpers
-- Spec: specs/003-staff/plan.md (matriz Q2=B), specs/003-staff/data-model.md
-- Migration: 005_staff_rls.sql
-- Depends on: 002_rls_policies.sql (F1 helpers), 004_staff_schema.sql (F3 tables)
--
-- Reuses F1 helpers: current_user_profile(), user_venue_id(), user_role(),
--   is_venue_staff(), is_admin(), can_access_pilot_venue(), can_read_venue_metrics()
-- Service role (API routes) bypasses RLS by default in Supabase/InsForge.

BEGIN;

-- ---------------------------------------------------------------------------
-- F3 helper functions for policy evaluation (T011)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.supervisor_department_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(sda.department_id),
    ARRAY[]::UUID[]
  )
  FROM public.supervisor_department_assignments sda
  JOIN public.user_profiles up ON up.id = sda.user_profile_id
  WHERE up.auth_user_id = auth.uid()
    AND up.role = 'supervisor';
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_member_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.id
  FROM public.staff_members sm
  JOIN public.user_profiles up ON up.id = sm.user_profile_id
  WHERE up.auth_user_id = auth.uid()
    AND sm.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_reception_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members sm
    JOIN public.departments d ON d.id = sm.department_id
    JOIN public.user_profiles up ON up.id = sm.user_profile_id
    WHERE up.auth_user_id = auth.uid()
      AND sm.is_active = true
      AND d.is_active = true
      AND d.code = 'RECEPCION'
      AND sm.venue_id = d.venue_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_guest_stays(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR (
      public.is_manager()
      AND public.user_venue_id() = target_venue_id
    )
    OR (
      public.is_reception_staff()
      AND public.user_venue_id() = target_venue_id
    );
$$;

CREATE OR REPLACE FUNCTION public.department_in_supervisor_scope(department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_role() = 'supervisor'
    AND department_id = ANY(public.supervisor_department_ids());
$$;

CREATE OR REPLACE FUNCTION public.can_manage_venue_staff(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_access_pilot_venue(target_venue_id)
    OR (
      public.is_manager()
      AND public.user_venue_id() = target_venue_id
    )
    OR (
      public.user_role() = 'supervisor'
      AND public.user_venue_id() = target_venue_id
    );
$$;

-- ---------------------------------------------------------------------------
-- Extend F1 helper: manager write access at same venue (T015)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_write_venue_content(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_venue_staff(target_venue_id)
    OR public.can_access_pilot_venue(target_venue_id)
    OR (
      public.is_manager()
      AND public.user_venue_id() = target_venue_id
    );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS + FORCE on all 14 F3 tables (T012)
-- ---------------------------------------------------------------------------
ALTER TABLE public.venue_staff_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_department_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_incident_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.venue_staff_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shifts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_department_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_nfc_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shift_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guest_stays FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_capture_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.incident_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_incident_categories FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- departments (T013 — org)
-- Staff: SELECT venue context | Supervisor: CRUD assigned | Manager: CRUD venue | Admin: ALL pilot
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS departments_staff_select ON public.departments;
CREATE POLICY departments_staff_select
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (public.user_venue_id() = venue_id);

DROP POLICY IF EXISTS departments_supervisor_select ON public.departments;
CREATE POLICY departments_supervisor_select
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (public.department_in_supervisor_scope(id));

DROP POLICY IF EXISTS departments_supervisor_update ON public.departments;
CREATE POLICY departments_supervisor_update
  ON public.departments
  FOR UPDATE
  TO authenticated
  USING (public.department_in_supervisor_scope(id))
  WITH CHECK (public.department_in_supervisor_scope(id));

DROP POLICY IF EXISTS departments_manager_write ON public.departments;
CREATE POLICY departments_manager_write
  ON public.departments
  FOR ALL
  TO authenticated
  USING (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  )
  WITH CHECK (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  );

DROP POLICY IF EXISTS departments_admin_write ON public.departments;
CREATE POLICY departments_admin_write
  ON public.departments
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- job_roles (T013 — org)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS job_roles_staff_select ON public.job_roles;
CREATE POLICY job_roles_staff_select
  ON public.job_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = job_roles.department_id
        AND public.user_venue_id() = d.venue_id
    )
  );

DROP POLICY IF EXISTS job_roles_supervisor_write ON public.job_roles;
CREATE POLICY job_roles_supervisor_write
  ON public.job_roles
  FOR ALL
  TO authenticated
  USING (public.department_in_supervisor_scope(department_id))
  WITH CHECK (public.department_in_supervisor_scope(department_id));

DROP POLICY IF EXISTS job_roles_manager_write ON public.job_roles;
CREATE POLICY job_roles_manager_write
  ON public.job_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = job_roles.department_id
        AND public.is_manager()
        AND d.venue_id = public.user_venue_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = job_roles.department_id
        AND public.is_manager()
        AND d.venue_id = public.user_venue_id()
    )
  );

DROP POLICY IF EXISTS job_roles_admin_write ON public.job_roles;
CREATE POLICY job_roles_admin_write
  ON public.job_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = job_roles.department_id
        AND public.can_access_pilot_venue(d.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = job_roles.department_id
        AND public.can_access_pilot_venue(d.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- shifts (T013 — org)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS shifts_staff_select ON public.shifts;
CREATE POLICY shifts_staff_select
  ON public.shifts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = shifts.department_id
        AND public.user_venue_id() = d.venue_id
    )
  );

DROP POLICY IF EXISTS shifts_supervisor_write ON public.shifts;
CREATE POLICY shifts_supervisor_write
  ON public.shifts
  FOR ALL
  TO authenticated
  USING (public.department_in_supervisor_scope(department_id))
  WITH CHECK (public.department_in_supervisor_scope(department_id));

DROP POLICY IF EXISTS shifts_manager_write ON public.shifts;
CREATE POLICY shifts_manager_write
  ON public.shifts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = shifts.department_id
        AND public.is_manager()
        AND d.venue_id = public.user_venue_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = shifts.department_id
        AND public.is_manager()
        AND d.venue_id = public.user_venue_id()
    )
  );

DROP POLICY IF EXISTS shifts_admin_write ON public.shifts;
CREATE POLICY shifts_admin_write
  ON public.shifts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = shifts.department_id
        AND public.can_access_pilot_venue(d.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = shifts.department_id
        AND public.can_access_pilot_venue(d.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- staff_members (T013 — org)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_members_staff_select ON public.staff_members;
CREATE POLICY staff_members_staff_select
  ON public.staff_members
  FOR SELECT
  TO authenticated
  USING (
    id = public.staff_member_id_for_user()
    OR (
      public.user_role() = 'staff'
      AND public.user_venue_id() = venue_id
    )
  );

DROP POLICY IF EXISTS staff_members_supervisor_write ON public.staff_members;
CREATE POLICY staff_members_supervisor_write
  ON public.staff_members
  FOR ALL
  TO authenticated
  USING (public.department_in_supervisor_scope(department_id))
  WITH CHECK (public.department_in_supervisor_scope(department_id));

DROP POLICY IF EXISTS staff_members_manager_write ON public.staff_members;
CREATE POLICY staff_members_manager_write
  ON public.staff_members
  FOR ALL
  TO authenticated
  USING (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  )
  WITH CHECK (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  );

DROP POLICY IF EXISTS staff_members_admin_write ON public.staff_members;
CREATE POLICY staff_members_admin_write
  ON public.staff_members
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- staff_nfc_tags (T013 — org)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_nfc_tags_staff_select ON public.staff_nfc_tags;
CREATE POLICY staff_nfc_tags_staff_select
  ON public.staff_nfc_tags
  FOR SELECT
  TO authenticated
  USING (staff_member_id = public.staff_member_id_for_user());

DROP POLICY IF EXISTS staff_nfc_tags_supervisor_write ON public.staff_nfc_tags;
CREATE POLICY staff_nfc_tags_supervisor_write
  ON public.staff_nfc_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_nfc_tags.staff_member_id
        AND public.department_in_supervisor_scope(sm.department_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_nfc_tags.staff_member_id
        AND public.department_in_supervisor_scope(sm.department_id)
    )
  );

DROP POLICY IF EXISTS staff_nfc_tags_manager_write ON public.staff_nfc_tags;
CREATE POLICY staff_nfc_tags_manager_write
  ON public.staff_nfc_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_nfc_tags.staff_member_id
        AND public.is_manager()
        AND sm.venue_id = public.user_venue_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_nfc_tags.staff_member_id
        AND public.is_manager()
        AND sm.venue_id = public.user_venue_id()
    )
  );

DROP POLICY IF EXISTS staff_nfc_tags_admin_write ON public.staff_nfc_tags;
CREATE POLICY staff_nfc_tags_admin_write
  ON public.staff_nfc_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_nfc_tags.staff_member_id
        AND public.can_access_pilot_venue(sm.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_nfc_tags.staff_member_id
        AND public.can_access_pilot_venue(sm.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- staff_shift_assignments (T013 — org)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_shift_assignments_staff_select ON public.staff_shift_assignments;
CREATE POLICY staff_shift_assignments_staff_select
  ON public.staff_shift_assignments
  FOR SELECT
  TO authenticated
  USING (staff_member_id = public.staff_member_id_for_user());

DROP POLICY IF EXISTS staff_shift_assignments_supervisor_write ON public.staff_shift_assignments;
CREATE POLICY staff_shift_assignments_supervisor_write
  ON public.staff_shift_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_shift_assignments.staff_member_id
        AND public.department_in_supervisor_scope(sm.department_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_shift_assignments.staff_member_id
        AND public.department_in_supervisor_scope(sm.department_id)
    )
  );

DROP POLICY IF EXISTS staff_shift_assignments_manager_write ON public.staff_shift_assignments;
CREATE POLICY staff_shift_assignments_manager_write
  ON public.staff_shift_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_shift_assignments.staff_member_id
        AND public.is_manager()
        AND sm.venue_id = public.user_venue_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_shift_assignments.staff_member_id
        AND public.is_manager()
        AND sm.venue_id = public.user_venue_id()
    )
  );

DROP POLICY IF EXISTS staff_shift_assignments_admin_write ON public.staff_shift_assignments;
CREATE POLICY staff_shift_assignments_admin_write
  ON public.staff_shift_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_shift_assignments.staff_member_id
        AND public.can_access_pilot_venue(sm.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = staff_shift_assignments.staff_member_id
        AND public.can_access_pilot_venue(sm.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- supervisor_department_assignments (T013 — org)
-- Supervisor: SELECT own | Manager: CRUD venue | Admin: ALL pilot
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS supervisor_department_assignments_supervisor_select ON public.supervisor_department_assignments;
CREATE POLICY supervisor_department_assignments_supervisor_select
  ON public.supervisor_department_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_profile_id = (
      SELECT up.id
      FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS supervisor_department_assignments_manager_write ON public.supervisor_department_assignments;
CREATE POLICY supervisor_department_assignments_manager_write
  ON public.supervisor_department_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = supervisor_department_assignments.department_id
        AND public.is_manager()
        AND d.venue_id = public.user_venue_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = supervisor_department_assignments.department_id
        AND public.is_manager()
        AND d.venue_id = public.user_venue_id()
    )
  );

DROP POLICY IF EXISTS supervisor_department_assignments_admin_write ON public.supervisor_department_assignments;
CREATE POLICY supervisor_department_assignments_admin_write
  ON public.supervisor_department_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = supervisor_department_assignments.department_id
        AND public.can_access_pilot_venue(d.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = supervisor_department_assignments.department_id
        AND public.can_access_pilot_venue(d.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- guest_stays (T014 — operational)
-- SELECT/INSERT formal/UPDATE via can_manage_guest_stays(); ephemeral INSERT service role only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS guest_stays_reception_select ON public.guest_stays;
CREATE POLICY guest_stays_reception_select
  ON public.guest_stays
  FOR SELECT
  TO authenticated
  USING (public.can_manage_guest_stays(venue_id));

DROP POLICY IF EXISTS guest_stays_reception_insert_formal ON public.guest_stays;
CREATE POLICY guest_stays_reception_insert_formal
  ON public.guest_stays
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_guest_stays(venue_id)
    AND stay_type = 'formal'
  );

DROP POLICY IF EXISTS guest_stays_reception_update ON public.guest_stays;
CREATE POLICY guest_stays_reception_update
  ON public.guest_stays
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_guest_stays(venue_id))
  WITH CHECK (public.can_manage_guest_stays(venue_id));

DROP POLICY IF EXISTS guest_stays_admin_write ON public.guest_stays;
CREATE POLICY guest_stays_admin_write
  ON public.guest_stays
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- staff_capture_sessions (T014 — operational)
-- Deny-by-default for authenticated; admin ALL by venue_id; service role writes in APIs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_capture_sessions_admin_write ON public.staff_capture_sessions;
CREATE POLICY staff_capture_sessions_admin_write
  ON public.staff_capture_sessions
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- feedback_entries (T014 — operational)
-- SELECT by role; NO INSERT for authenticated (service role in capture APIs)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS feedback_entries_staff_select ON public.feedback_entries;
CREATE POLICY feedback_entries_staff_select
  ON public.feedback_entries
  FOR SELECT
  TO authenticated
  USING (staff_member_id = public.staff_member_id_for_user());

DROP POLICY IF EXISTS feedback_entries_supervisor_select ON public.feedback_entries;
CREATE POLICY feedback_entries_supervisor_select
  ON public.feedback_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.id = feedback_entries.staff_member_id
        AND public.department_in_supervisor_scope(sm.department_id)
    )
  );

DROP POLICY IF EXISTS feedback_entries_manager_select ON public.feedback_entries;
CREATE POLICY feedback_entries_manager_select
  ON public.feedback_entries
  FOR SELECT
  TO authenticated
  USING (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  );

DROP POLICY IF EXISTS feedback_entries_admin_select ON public.feedback_entries;
CREATE POLICY feedback_entries_admin_select
  ON public.feedback_entries
  FOR SELECT
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- incident_reports (T014 — operational)
-- SELECT/UPDATE supervisor/manager/admin; staff NO access; NO INSERT authenticated
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS incident_reports_supervisor_select ON public.incident_reports;
CREATE POLICY incident_reports_supervisor_select
  ON public.incident_reports
  FOR SELECT
  TO authenticated
  USING (public.department_in_supervisor_scope(department_id));

DROP POLICY IF EXISTS incident_reports_supervisor_update ON public.incident_reports;
CREATE POLICY incident_reports_supervisor_update
  ON public.incident_reports
  FOR UPDATE
  TO authenticated
  USING (public.department_in_supervisor_scope(department_id))
  WITH CHECK (public.department_in_supervisor_scope(department_id));

DROP POLICY IF EXISTS incident_reports_manager_write ON public.incident_reports;
CREATE POLICY incident_reports_manager_write
  ON public.incident_reports
  FOR ALL
  TO authenticated
  USING (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  )
  WITH CHECK (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  );

DROP POLICY IF EXISTS incident_reports_admin_write ON public.incident_reports;
CREATE POLICY incident_reports_admin_write
  ON public.incident_reports
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- incident_status_history (T014 — operational)
-- SELECT scoped via incident; INSERT on status change for supervisor/manager/admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS incident_status_history_supervisor_select ON public.incident_status_history;
CREATE POLICY incident_status_history_supervisor_select
  ON public.incident_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.incident_reports ir
      WHERE ir.id = incident_status_history.incident_id
        AND public.department_in_supervisor_scope(ir.department_id)
    )
  );

DROP POLICY IF EXISTS incident_status_history_supervisor_insert ON public.incident_status_history;
CREATE POLICY incident_status_history_supervisor_insert
  ON public.incident_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.incident_reports ir
      WHERE ir.id = incident_status_history.incident_id
        AND public.department_in_supervisor_scope(ir.department_id)
    )
  );

DROP POLICY IF EXISTS incident_status_history_manager_write ON public.incident_status_history;
CREATE POLICY incident_status_history_manager_write
  ON public.incident_status_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.incident_reports ir
      WHERE ir.id = incident_status_history.incident_id
        AND public.is_manager()
        AND ir.venue_id = public.user_venue_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.incident_reports ir
      WHERE ir.id = incident_status_history.incident_id
        AND public.is_manager()
        AND ir.venue_id = public.user_venue_id()
    )
  );

DROP POLICY IF EXISTS incident_status_history_admin_write ON public.incident_status_history;
CREATE POLICY incident_status_history_admin_write
  ON public.incident_status_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.incident_reports ir
      WHERE ir.id = incident_status_history.incident_id
        AND public.can_access_pilot_venue(ir.venue_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.incident_reports ir
      WHERE ir.id = incident_status_history.incident_id
        AND public.can_access_pilot_venue(ir.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- venue_incident_categories (T014 — operational)
-- SELECT venue read; CRUD manager/admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS venue_incident_categories_venue_select ON public.venue_incident_categories;
CREATE POLICY venue_incident_categories_venue_select
  ON public.venue_incident_categories
  FOR SELECT
  TO authenticated
  USING (
    public.user_venue_id() = venue_id
    OR public.can_access_pilot_venue(venue_id)
    OR public.can_read_venue_metrics(venue_id)
  );

DROP POLICY IF EXISTS venue_incident_categories_manager_write ON public.venue_incident_categories;
CREATE POLICY venue_incident_categories_manager_write
  ON public.venue_incident_categories
  FOR ALL
  TO authenticated
  USING (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  )
  WITH CHECK (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  );

DROP POLICY IF EXISTS venue_incident_categories_admin_write ON public.venue_incident_categories;
CREATE POLICY venue_incident_categories_admin_write
  ON public.venue_incident_categories
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- venue_staff_settings (T014 — operational)
-- SELECT manager/staff venue; UPDATE manager/admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS venue_staff_settings_venue_select ON public.venue_staff_settings;
CREATE POLICY venue_staff_settings_venue_select
  ON public.venue_staff_settings
  FOR SELECT
  TO authenticated
  USING (
    public.is_venue_staff(venue_id)
    OR (
      public.is_manager()
      AND public.user_venue_id() = venue_id
    )
    OR public.can_access_pilot_venue(venue_id)
  );

DROP POLICY IF EXISTS venue_staff_settings_manager_update ON public.venue_staff_settings;
CREATE POLICY venue_staff_settings_manager_update
  ON public.venue_staff_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  )
  WITH CHECK (
    public.is_manager()
    AND public.user_venue_id() = venue_id
  );

DROP POLICY IF EXISTS venue_staff_settings_admin_write ON public.venue_staff_settings;
CREATE POLICY venue_staff_settings_admin_write
  ON public.venue_staff_settings
  FOR ALL
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id))
  WITH CHECK (public.can_access_pilot_venue(venue_id));

COMMIT;
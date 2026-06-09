-- TagMe MVP — Row Level Security Policies
-- Spec: specs/001-tagme-platform/data-model.md (RLS matrix)
-- Migration: 002_rls_policies.sql
--
-- Service role (API routes) bypasses RLS by default in Supabase/InsForge.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper functions for policy evaluation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.user_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_venue_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT venue_id
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Staff: assigned venue only
CREATE OR REPLACE FUNCTION public.is_venue_staff(target_venue_id UUID)
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
      AND role = 'staff'
      AND venue_id = target_venue_id
  );
$$;

-- Admin: all pilot venues
CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_pilot_venue(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = target_venue_id
      AND v.is_pilot = true
  )
  AND public.is_admin();
$$;

-- Staff or admin with venue scope; ops read-only on pilot venues
CREATE OR REPLACE FUNCTION public.can_read_venue_metrics(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_venue_staff(target_venue_id)
    OR public.can_access_pilot_venue(target_venue_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.venues v ON v.id = target_venue_id
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'ops'
        AND v.is_pilot = true
    );
$$;

CREATE OR REPLACE FUNCTION public.can_write_venue_content(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_venue_staff(target_venue_id)
    OR public.can_access_pilot_venue(target_venue_id);
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.touch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avex_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avex_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_audit_log ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (defense in depth; service role still bypasses)
ALTER TABLE public.venues FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experience_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.touch_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.destination_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.avex_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.avex_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.content_audit_log FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- venues
-- Anon: SELECT active (all venues in MVP — no is_active column)
-- Staff: SELECT own venue | Admin: SELECT pilot venues
-- ---------------------------------------------------------------------------
CREATE POLICY venues_anon_select
  ON public.venues
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY venues_staff_select
  ON public.venues
  FOR SELECT
  TO authenticated
  USING (
    public.is_venue_staff(id)
    OR public.can_access_pilot_venue(id)
    OR (
      public.user_role() = 'ops'
      AND is_pilot = true
    )
  );

CREATE POLICY venues_admin_write
  ON public.venues
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- nfc_tags
-- Anon: SELECT active | Staff: SELECT/UPDATE own venue | Admin: ALL pilot
-- ---------------------------------------------------------------------------
CREATE POLICY nfc_tags_anon_select_active
  ON public.nfc_tags
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY nfc_tags_staff_select
  ON public.nfc_tags
  FOR SELECT
  TO authenticated
  USING (public.can_write_venue_content(venue_id) OR public.can_read_venue_metrics(venue_id));

CREATE POLICY nfc_tags_staff_update
  ON public.nfc_tags
  FOR UPDATE
  TO authenticated
  USING (public.can_write_venue_content(venue_id))
  WITH CHECK (public.can_write_venue_content(venue_id));

CREATE POLICY nfc_tags_admin_write
  ON public.nfc_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_pilot_venue(venue_id));

CREATE POLICY nfc_tags_admin_delete
  ON public.nfc_tags
  FOR DELETE
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- experience_configs
-- Anon: SELECT | Staff: SELECT/UPDATE own venue | Admin: ALL pilot
-- ---------------------------------------------------------------------------
CREATE POLICY experience_configs_anon_select
  ON public.experience_configs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY experience_configs_staff_select
  ON public.experience_configs
  FOR SELECT
  TO authenticated
  USING (public.can_write_venue_content(venue_id) OR public.can_read_venue_metrics(venue_id));

CREATE POLICY experience_configs_staff_update
  ON public.experience_configs
  FOR UPDATE
  TO authenticated
  USING (public.can_write_venue_content(venue_id))
  WITH CHECK (public.can_write_venue_content(venue_id));

CREATE POLICY experience_configs_admin_insert
  ON public.experience_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_pilot_venue(venue_id));

CREATE POLICY experience_configs_admin_delete
  ON public.experience_configs
  FOR DELETE
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- knowledge_entries
-- Anon: SELECT active | Staff: SELECT/INSERT/UPDATE own venue
-- ---------------------------------------------------------------------------
CREATE POLICY knowledge_entries_anon_select_active
  ON public.knowledge_entries
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY knowledge_entries_staff_select
  ON public.knowledge_entries
  FOR SELECT
  TO authenticated
  USING (public.can_write_venue_content(venue_id) OR public.can_read_venue_metrics(venue_id));

CREATE POLICY knowledge_entries_staff_insert
  ON public.knowledge_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_venue_content(venue_id));

CREATE POLICY knowledge_entries_staff_update
  ON public.knowledge_entries
  FOR UPDATE
  TO authenticated
  USING (public.can_write_venue_content(venue_id))
  WITH CHECK (public.can_write_venue_content(venue_id));

CREATE POLICY knowledge_entries_admin_delete
  ON public.knowledge_entries
  FOR DELETE
  TO authenticated
  USING (public.can_access_pilot_venue(venue_id));

-- ---------------------------------------------------------------------------
-- touch_events
-- Anon: INSERT | Staff/Admin/Ops: SELECT venue metrics
-- ---------------------------------------------------------------------------
CREATE POLICY touch_events_anon_insert
  ON public.touch_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY touch_events_staff_select
  ON public.touch_events
  FOR SELECT
  TO authenticated
  USING (public.can_read_venue_metrics(venue_id));

-- ---------------------------------------------------------------------------
-- destination_visits
-- Anon: INSERT | Staff/Admin/Ops: SELECT via touch_event venue
-- ---------------------------------------------------------------------------
CREATE POLICY destination_visits_anon_insert
  ON public.destination_visits
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY destination_visits_staff_select
  ON public.destination_visits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.touch_events te
      WHERE te.id = touch_event_id
        AND public.can_read_venue_metrics(te.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- avex_sessions / avex_messages
-- Anon: INSERT only | No staff access
-- ---------------------------------------------------------------------------
CREATE POLICY avex_sessions_anon_insert
  ON public.avex_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY avex_messages_anon_insert
  ON public.avex_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- user_profiles
-- Authenticated: SELECT own profile only
-- ---------------------------------------------------------------------------
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- content_audit_log (implicit — written by service role API routes)
-- Staff/Admin: SELECT scoped to venue
-- ---------------------------------------------------------------------------
CREATE POLICY content_audit_log_staff_select
  ON public.content_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (venue_id IS NOT NULL AND public.can_write_venue_content(venue_id))
    OR (venue_id IS NOT NULL AND public.can_read_venue_metrics(venue_id))
    OR public.is_admin()
  );

COMMIT;
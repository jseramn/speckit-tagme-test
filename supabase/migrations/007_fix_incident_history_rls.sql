-- Fix incident_status_history INSERT/SELECT policies for supervisors.
-- Policy subqueries on incident_reports ran as invoker and could not see rows
-- even when UPDATE on the same incident succeeded (FORCE RLS + nested check).

CREATE OR REPLACE FUNCTION public.incident_in_supervisor_history_scope(p_incident_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT public.department_in_supervisor_scope(ir.department_id)
      FROM public.incident_reports ir
      WHERE ir.id = p_incident_id
      LIMIT 1
    ),
    false
  );
$$;

DROP POLICY IF EXISTS incident_status_history_supervisor_insert ON public.incident_status_history;
CREATE POLICY incident_status_history_supervisor_insert
  ON public.incident_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.incident_in_supervisor_history_scope(incident_id));

DROP POLICY IF EXISTS incident_status_history_supervisor_select ON public.incident_status_history;
CREATE POLICY incident_status_history_supervisor_select
  ON public.incident_status_history
  FOR SELECT
  TO authenticated
  USING (public.incident_in_supervisor_history_scope(incident_id));
-- TagMe Fase 3 — Scorecard Views
-- Spec: specs/003-staff/data-model.md
-- Migration: 006_staff_scorecard_views.sql
-- Tasks: T017–T018

-- ---------------------------------------------------------------------------
-- calc_internal_nps (T017) — returns NULL when n < 6
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_internal_nps(
  p_promoters BIGINT,
  p_detractors BIGINT,
  p_total BIGINT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_total < 6 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(
    (p_promoters::NUMERIC / p_total * 100) -
    (p_detractors::NUMERIC / p_total * 100),
    1
  );
END;
$$;

COMMENT ON FUNCTION public.calc_internal_nps IS
  'NPS interno proxy; NULL si volumen < 6 (anti-patrón scorecard)';

-- ---------------------------------------------------------------------------
-- v_feedback_base (T017) — atomic base with venue timezone
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_feedback_base
WITH (security_invoker = true)
AS
SELECT
  fe.id,
  fe.venue_id,
  fe.staff_member_id,
  fe.guest_stay_id,
  fe.rating,
  fe.comment,
  fe.origin_type,
  fe.origin_id,
  fe.created_at,
  (fe.context_snapshot->>'shift_id')::uuid AS shift_id,
  (fe.context_snapshot->>'department_id')::uuid AS department_id,
  date_trunc(
    'day',
    fe.created_at AT TIME ZONE v.timezone
  ) AS local_day
FROM public.feedback_entries fe
JOIN public.venues v ON v.id = fe.venue_id;

COMMENT ON VIEW public.v_feedback_base IS
  'Base atómica scorecard con timezone venue y shift/depto desde snapshot';

-- ---------------------------------------------------------------------------
-- v_scorecard_employee (T018)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_scorecard_employee
WITH (security_invoker = true)
AS
SELECT
  fb.venue_id,
  fb.staff_member_id,
  fb.department_id,
  fb.shift_id,
  fb.local_day,
  COUNT(*)::bigint AS feedback_count,
  ROUND(AVG(fb.rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE fb.rating = 5)::bigint AS promoters,
  COUNT(*) FILTER (WHERE fb.rating IN (1, 2))::bigint AS detractors,
  public.calc_internal_nps(
    COUNT(*) FILTER (WHERE fb.rating = 5),
    COUNT(*) FILTER (WHERE fb.rating IN (1, 2)),
    COUNT(*)
  ) AS nps_internal,
  (COUNT(*) < COALESCE(vss.min_feedbacks_for_nps, 6)) AS insufficient_data
FROM public.v_feedback_base fb
LEFT JOIN public.venue_staff_settings vss ON vss.venue_id = fb.venue_id
WHERE fb.origin_type = 'staff_nfc'
  AND fb.staff_member_id IS NOT NULL
GROUP BY
  fb.venue_id,
  fb.staff_member_id,
  fb.department_id,
  fb.shift_id,
  fb.local_day,
  vss.min_feedbacks_for_nps;

COMMENT ON VIEW public.v_scorecard_employee IS
  'Scorecard por empleado/día con NPS interno (n≥6)';

-- ---------------------------------------------------------------------------
-- v_scorecard_shift (T018) — excludes shift_id IS NULL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_scorecard_shift
WITH (security_invoker = true)
AS
SELECT
  fb.venue_id,
  fb.department_id,
  fb.shift_id,
  fb.local_day,
  COUNT(*)::bigint AS feedback_count,
  ROUND(AVG(fb.rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE fb.rating = 5)::bigint AS promoters,
  COUNT(*) FILTER (WHERE fb.rating IN (1, 2))::bigint AS detractors,
  public.calc_internal_nps(
    COUNT(*) FILTER (WHERE fb.rating = 5),
    COUNT(*) FILTER (WHERE fb.rating IN (1, 2)),
    COUNT(*)
  ) AS nps_internal,
  (COUNT(*) < COALESCE(vss.min_feedbacks_for_nps, 6)) AS insufficient_data
FROM public.v_feedback_base fb
LEFT JOIN public.venue_staff_settings vss ON vss.venue_id = fb.venue_id
WHERE fb.origin_type = 'staff_nfc'
  AND fb.shift_id IS NOT NULL
GROUP BY
  fb.venue_id,
  fb.department_id,
  fb.shift_id,
  fb.local_day,
  vss.min_feedbacks_for_nps;

COMMENT ON VIEW public.v_scorecard_shift IS
  'Roll-up turno; excluye registros sin shift_id (Q1=B)';

-- ---------------------------------------------------------------------------
-- v_scorecard_department (T018)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_scorecard_department
WITH (security_invoker = true)
AS
SELECT
  fb.venue_id,
  fb.department_id,
  fb.local_day,
  COUNT(*)::bigint AS feedback_count,
  ROUND(AVG(fb.rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE fb.rating = 5)::bigint AS promoters,
  COUNT(*) FILTER (WHERE fb.rating IN (1, 2))::bigint AS detractors,
  public.calc_internal_nps(
    COUNT(*) FILTER (WHERE fb.rating = 5),
    COUNT(*) FILTER (WHERE fb.rating IN (1, 2)),
    COUNT(*)
  ) AS nps_internal,
  (COUNT(*) < COALESCE(vss.min_feedbacks_for_nps, 6)) AS insufficient_data,
  (
    SELECT COUNT(*)::bigint
    FROM public.incident_reports ir
    WHERE ir.venue_id = fb.venue_id
      AND ir.department_id = fb.department_id
      AND ir.status IN ('abierta', 'en_progreso')
  ) AS open_incidents
FROM public.v_feedback_base fb
LEFT JOIN public.venue_staff_settings vss ON vss.venue_id = fb.venue_id
WHERE fb.department_id IS NOT NULL
GROUP BY
  fb.venue_id,
  fb.department_id,
  fb.local_day,
  vss.min_feedbacks_for_nps;

COMMENT ON VIEW public.v_scorecard_department IS
  'Roll-up departamento con incidencias abiertas';

-- ---------------------------------------------------------------------------
-- v_scorecard_hotel (T018)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_scorecard_hotel
WITH (security_invoker = true)
AS
SELECT
  fb.venue_id,
  fb.local_day,
  COUNT(*)::bigint AS feedback_count,
  ROUND(AVG(fb.rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE fb.rating = 5)::bigint AS promoters,
  COUNT(*) FILTER (WHERE fb.rating IN (1, 2))::bigint AS detractors,
  public.calc_internal_nps(
    COUNT(*) FILTER (WHERE fb.rating = 5),
    COUNT(*) FILTER (WHERE fb.rating IN (1, 2)),
    COUNT(*)
  ) AS nps_internal,
  (COUNT(*) < COALESCE(vss.min_feedbacks_for_nps, 6)) AS insufficient_data,
  (
    SELECT COUNT(*)::bigint
    FROM public.incident_reports ir
    WHERE ir.venue_id = fb.venue_id
      AND ir.status IN ('abierta', 'en_progreso')
  ) AS open_incidents,
  (
    SELECT COUNT(*)::bigint
    FROM public.guest_stays gs
    WHERE gs.venue_id = fb.venue_id
      AND gs.status = 'active'
  ) AS active_stays
FROM public.v_feedback_base fb
LEFT JOIN public.venue_staff_settings vss ON vss.venue_id = fb.venue_id
GROUP BY
  fb.venue_id,
  fb.local_day,
  vss.min_feedbacks_for_nps;

COMMENT ON VIEW public.v_scorecard_hotel IS
  'Roll-up hotel con incidencias abiertas y estadías activas';

-- ---------------------------------------------------------------------------
-- Grants (T018)
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.v_feedback_base TO authenticated;
GRANT SELECT ON public.v_scorecard_employee TO authenticated;
GRANT SELECT ON public.v_scorecard_shift TO authenticated;
GRANT SELECT ON public.v_scorecard_department TO authenticated;
GRANT SELECT ON public.v_scorecard_hotel TO authenticated;

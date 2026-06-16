-- TagMe Fase 3 — M5: explicit origin filter for employee/shift scorecards
-- room_nfc feedback must NOT feed employee or shift scorecards (Principio VII)

BEGIN;

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
  'Scorecard empleado; solo origin_type=staff_nfc (excluye room_nfc)';

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
  'Roll-up turno; solo staff_nfc con shift_id (excluye room_nfc y sin turno)';

COMMIT;
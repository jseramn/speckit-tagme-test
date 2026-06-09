-- TagMe MVP — TagMétricas SQL Views
-- Spec: specs/001-tagme-platform/data-model.md
-- Migration: 003_metrics_views.sql

-- ---------------------------------------------------------------------------
-- v_touches_daily — daily touch counts per venue (non-deduplicated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_touches_daily
WITH (security_invoker = true)
AS
SELECT
  venue_id,
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*)                      AS touches
FROM public.touch_events
WHERE deduplicated = false
GROUP BY 1, 2;

COMMENT ON VIEW public.v_touches_daily IS
  'TagMétricas: daily NFC/URL touches per venue, excluding deduplicated events';

-- ---------------------------------------------------------------------------
-- v_touches_hourly — hourly distribution in venue local timezone
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_touches_hourly
WITH (security_invoker = true)
AS
SELECT
  te.venue_id,
  EXTRACT(HOUR FROM te.created_at AT TIME ZONE v.timezone)::INTEGER AS hour,
  COUNT(*)                                                          AS touches
FROM public.touch_events te
JOIN public.venues v ON v.id = te.venue_id
WHERE te.deduplicated = false
GROUP BY 1, 2;

COMMENT ON VIEW public.v_touches_hourly IS
  'TagMétricas: hourly touch distribution using venue timezone';

-- ---------------------------------------------------------------------------
-- v_destination_breakdown — visit share by destination type per venue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_destination_breakdown
WITH (security_invoker = true)
AS
SELECT
  te.venue_id,
  dv.destination_type,
  COUNT(*) AS visits,
  ROUND(
    100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY te.venue_id),
    1
  )        AS pct
FROM public.destination_visits dv
JOIN public.touch_events te ON te.id = dv.touch_event_id
GROUP BY 1, 2;

COMMENT ON VIEW public.v_destination_breakdown IS
  'TagMétricas: destination click breakdown with percentage per venue';

-- ---------------------------------------------------------------------------
-- Grants — authenticated staff/admin/ops read via RLS on underlying tables
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.v_touches_daily TO authenticated;
GRANT SELECT ON public.v_touches_hourly TO authenticated;
GRANT SELECT ON public.v_destination_breakdown TO authenticated;

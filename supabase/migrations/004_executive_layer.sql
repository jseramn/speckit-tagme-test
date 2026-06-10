-- TagMe M0 — Executive Visibility Layer (schema, views, RLS)
-- Spec: specs/002-clevel/plan.md § Modelo de Datos
-- Migration: 004_executive_layer.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- user_profiles — extend managerial roles + executive_scope (CL-13)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  DROP CONSTRAINT user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (
    role IN ('staff', 'admin', 'ops', 'executive', 'manager', 'department_head')
  );

ALTER TABLE public.user_profiles
  ADD COLUMN executive_scope TEXT
    CHECK (executive_scope IS NULL OR executive_scope IN (
      'operations', 'fnb', 'experience', 'front_office'
    ));

COMMENT ON COLUMN public.user_profiles.executive_scope IS
  'Department scope for manager/department_head; NULL for executive/admin/staff/ops';

-- ---------------------------------------------------------------------------
-- executive_alerts — proactive alert inbox
-- ---------------------------------------------------------------------------
CREATE TABLE public.executive_alerts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  alert_type        TEXT        NOT NULL,
  severity          TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'active',
  department        TEXT,
  entity_ref        TEXT,
  message           TEXT        NOT NULL,
  suggested_action  TEXT,
  dedup_key         TEXT        NOT NULL,
  acknowledged_by   UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  assigned_to       UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  window_start      TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at   TIMESTAMPTZ,
  assigned_at       TIMESTAMPTZ,
  dismissed_at      TIMESTAMPTZ,

  CONSTRAINT executive_alerts_severity_check CHECK (
    severity IN ('info', 'warning', 'critical')
  ),
  CONSTRAINT executive_alerts_status_check CHECK (
    status IN ('active', 'acknowledged', 'assigned', 'dismissed')
  ),
  CONSTRAINT executive_alerts_department_check CHECK (
    department IS NULL OR department IN (
      'operations', 'fnb', 'experience', 'front_office', 'transversal'
    )
  ),
  CONSTRAINT executive_alerts_type_check CHECK (
    alert_type IN (
      'activity_drop',
      'tag_inactive',
      'tag_disabled',
      'avex_derivation',
      'avex_critical',
      'unusual_spike',
      'destination_failure',
      'system_health',
      'abandonment_high'
    )
  )
);

CREATE INDEX idx_executive_alerts_venue_status
  ON public.executive_alerts (venue_id, status, created_at DESC);

CREATE INDEX idx_executive_alerts_venue_department
  ON public.executive_alerts (venue_id, department)
  WHERE status = 'active';

CREATE UNIQUE INDEX idx_executive_alerts_dedup
  ON public.executive_alerts (
    venue_id,
    alert_type,
    COALESCE(entity_ref, ''),
    window_start
  );

CREATE TRIGGER trg_executive_alerts_updated_at
  BEFORE UPDATE ON public.executive_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.executive_alerts IS
  'Gerencial alert inbox — deduplicated by venue/type/entity/window (4h)';

-- ---------------------------------------------------------------------------
-- alert_thresholds — configurable CL-02/03/04 thresholds per venue/dept
-- ---------------------------------------------------------------------------
CREATE TABLE public.alert_thresholds (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  alert_type  TEXT        NOT NULL,
  department  TEXT,
  config      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT alert_thresholds_department_check CHECK (
    department IS NULL OR department IN (
      'operations', 'fnb', 'experience', 'front_office', 'transversal'
    )
  ),
  CONSTRAINT alert_thresholds_type_check CHECK (
    alert_type IN (
      'activity_drop',
      'tag_inactive',
      'tag_disabled',
      'avex_derivation',
      'avex_critical',
      'unusual_spike',
      'destination_failure',
      'system_health',
      'abandonment_high'
    )
  )
);

CREATE UNIQUE INDEX idx_alert_thresholds_venue_type_dept
  ON public.alert_thresholds (venue_id, alert_type, COALESCE(department, ''));

CREATE INDEX idx_alert_thresholds_venue_active
  ON public.alert_thresholds (venue_id)
  WHERE is_active = true;

CREATE TRIGGER trg_alert_thresholds_updated_at
  BEFORE UPDATE ON public.alert_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.alert_thresholds IS
  'Configurable alert thresholds per venue/department (CL-02/03/04)';

-- ---------------------------------------------------------------------------
-- kpi_targets — CL-08 meta vs. real targets
-- ---------------------------------------------------------------------------
CREATE TABLE public.kpi_targets (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID           NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  department    TEXT           NOT NULL,
  kpi_key       TEXT           NOT NULL,
  period        TEXT           NOT NULL,
  target_value  NUMERIC(12, 4) NOT NULL,
  comparison    TEXT           NOT NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT kpi_targets_department_check CHECK (
    department IN (
      'executive',
      'operations',
      'fnb',
      'experience',
      'front_office',
      'transversal'
    )
  ),
  CONSTRAINT kpi_targets_period_check CHECK (
    period IN ('weekly', 'monthly')
  ),
  CONSTRAINT kpi_targets_comparison_check CHECK (
    comparison IN ('gte', 'lte')
  )
);

CREATE UNIQUE INDEX idx_kpi_targets_venue_dept_key_period
  ON public.kpi_targets (venue_id, department, kpi_key, period);

CREATE TRIGGER trg_kpi_targets_updated_at
  BEFORE UPDATE ON public.kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.kpi_targets IS
  'Executive KPI targets per department and period (CL-08)';

-- ---------------------------------------------------------------------------
-- executive_audit_log — human managerial actions
-- ---------------------------------------------------------------------------
CREATE TABLE public.executive_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  venue_id      UUID        REFERENCES public.venues (id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  resource_type TEXT        NOT NULL,
  resource_id   UUID,
  metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT executive_audit_log_action_check CHECK (
    action IN (
      'acknowledge_alert',
      'assign_alert',
      'dismiss_alert',
      'export_report',
      'update_threshold',
      'update_kpi_target',
      'view_report'
    )
  )
);

CREATE INDEX idx_executive_audit_log_venue_created
  ON public.executive_audit_log (venue_id, created_at DESC);

CREATE INDEX idx_executive_audit_log_user_id
  ON public.executive_audit_log (user_id, created_at DESC);

COMMENT ON TABLE public.executive_audit_log IS
  'Audit trail for executive human actions (not cron evaluation)';

-- ---------------------------------------------------------------------------
-- venue_baseline — CL-11 baseline gate cache
-- ---------------------------------------------------------------------------
CREATE TABLE public.venue_baseline (
  venue_id        UUID        PRIMARY KEY REFERENCES public.venues (id) ON DELETE CASCADE,
  first_touch_at  TIMESTAMPTZ,
  total_touches   BIGINT      NOT NULL DEFAULT 0,
  baseline_ready  BOOLEAN     NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_venue_baseline_updated_at
  BEFORE UPDATE ON public.venue_baseline
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.venue_baseline IS
  'Cached baseline stats per venue (14 days + 100 touches — CL-11)';

-- ---------------------------------------------------------------------------
-- SQL views — executive analytics (security_invoker = true)
-- ---------------------------------------------------------------------------

-- v_touches_by_zone_hourly
CREATE OR REPLACE VIEW public.v_touches_by_zone_hourly
WITH (security_invoker = true)
AS
SELECT
  te.venue_id,
  nt.zone,
  EXTRACT(HOUR FROM te.created_at AT TIME ZONE v.timezone)::INTEGER AS hour,
  COUNT(*)                                                          AS touches
FROM public.touch_events te
JOIN public.nfc_tags nt ON nt.id = te.tag_id
JOIN public.venues v ON v.id = te.venue_id
WHERE te.deduplicated = false
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_touches_by_zone_hourly IS
  'Executive: hourly touch distribution by zone (venue timezone)';

-- v_touches_by_tag_daily
CREATE OR REPLACE VIEW public.v_touches_by_tag_daily
WITH (security_invoker = true)
AS
SELECT
  te.venue_id,
  te.tag_id,
  DATE_TRUNC('day', te.created_at) AS day,
  COUNT(*)                         AS touches
FROM public.touch_events te
WHERE te.deduplicated = false
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_touches_by_tag_daily IS
  'Executive: daily touch counts per tag';

-- v_hourly_baseline_median — 28-day median by venue/zone/dow/hour
CREATE OR REPLACE VIEW public.v_hourly_baseline_median
WITH (security_invoker = true)
AS
SELECT
  daily.venue_id,
  daily.zone,
  daily.dow,
  daily.hour,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY daily.daily_touches) AS median_touches
FROM (
  SELECT
    te.venue_id,
    nt.zone,
    EXTRACT(DOW FROM te.created_at AT TIME ZONE v.timezone)::INTEGER  AS dow,
    EXTRACT(HOUR FROM te.created_at AT TIME ZONE v.timezone)::INTEGER AS hour,
    DATE_TRUNC('day', te.created_at AT TIME ZONE v.timezone)          AS day,
    COUNT(*)::NUMERIC                                                 AS daily_touches
  FROM public.touch_events te
  JOIN public.nfc_tags nt ON nt.id = te.tag_id
  JOIN public.venues v ON v.id = te.venue_id
  WHERE te.deduplicated = false
    AND te.created_at >= NOW() - INTERVAL '28 days'
  GROUP BY 1, 2, 3, 4, 5
) daily
GROUP BY 1, 2, 3, 4;

COMMENT ON VIEW public.v_hourly_baseline_median IS
  'Executive: 28-day median hourly touches by venue/zone/dow/hour (CL-05)';

-- v_avex_effectiveness
CREATE OR REPLACE VIEW public.v_avex_effectiveness
WITH (security_invoker = true)
AS
WITH session_stats AS (
  SELECT
    s.venue_id,
    DATE_TRUNC('day', s.created_at) AS day,
    s.id,
    EXISTS (
      SELECT 1
      FROM public.avex_messages m
      WHERE m.session_id = s.id
        AND m.escalated = true
    ) AS has_escalation
  FROM public.avex_sessions s
)
SELECT
  venue_id,
  day,
  COUNT(*)::BIGINT                                                    AS sessions,
  COUNT(*) FILTER (WHERE NOT has_escalation)::BIGINT                  AS resolved,
  COUNT(*) FILTER (WHERE has_escalation)::BIGINT                      AS escalated,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE has_escalation) / NULLIF(COUNT(*), 0),
    1
  )                                                                   AS derivation_pct
FROM session_stats
GROUP BY 1, 2;

COMMENT ON VIEW public.v_avex_effectiveness IS
  'Executive: AVEX sessions, resolution, escalation rate by day';

-- v_touch_abandonment
CREATE OR REPLACE VIEW public.v_touch_abandonment
WITH (security_invoker = true)
AS
SELECT
  te.venue_id,
  nt.zone,
  DATE_TRUNC('day', te.created_at) AS day,
  COUNT(*)::BIGINT                 AS touches,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM public.destination_visits dv
      WHERE dv.touch_event_id = te.id
    )
  )::BIGINT                        AS with_destination,
  ROUND(
    100.0 * (
      COUNT(*) - COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM public.destination_visits dv
          WHERE dv.touch_event_id = te.id
        )
      )
    ) / NULLIF(COUNT(*), 0),
    1
  )                                AS abandonment_pct
FROM public.touch_events te
JOIN public.nfc_tags nt ON nt.id = te.tag_id
WHERE te.deduplicated = false
GROUP BY 1, 2, 3;

COMMENT ON VIEW public.v_touch_abandonment IS
  'Executive: touch abandonment rate by zone and day';

-- v_channel_breakdown
CREATE OR REPLACE VIEW public.v_channel_breakdown
WITH (security_invoker = true)
AS
SELECT
  venue_id,
  channel,
  COUNT(*)::BIGINT AS count,
  ROUND(
    100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY venue_id),
    1
  )                AS pct
FROM public.touch_events
WHERE deduplicated = false
GROUP BY 1, 2;

COMMENT ON VIEW public.v_channel_breakdown IS
  'Executive: touch channel mix per venue';

-- v_latency_to_destination
CREATE OR REPLACE VIEW public.v_latency_to_destination
WITH (security_invoker = true)
AS
WITH latencies AS (
  SELECT
    te.venue_id,
    te.tag_id,
    EXTRACT(EPOCH FROM (MIN(dv.created_at) - te.created_at)) AS seconds
  FROM public.touch_events te
  JOIN public.destination_visits dv ON dv.touch_event_id = te.id
  WHERE te.deduplicated = false
  GROUP BY te.id, te.venue_id, te.tag_id, te.created_at
)
SELECT
  venue_id,
  tag_id,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds)::INTEGER AS median_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY seconds)::INTEGER  AS p95_seconds
FROM latencies
GROUP BY 1, 2;

COMMENT ON VIEW public.v_latency_to_destination IS
  'Executive: server-side latency from touch to first destination visit';

-- ---------------------------------------------------------------------------
-- Helper functions — executive RBAC (CL-13)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_executive()
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
      AND role IN ('executive', 'manager', 'department_head')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_executive_for_venue(target_venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_access_pilot_venue(target_venue_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.venue_id = target_venue_id
        AND up.role IN ('executive', 'manager', 'department_head')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_executive_role()
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
      AND role = 'executive'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_executive_alerts(
  target_venue_id UUID,
  target_department TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.venue_id = target_venue_id
      AND (
        up.role = 'executive'
        OR (
          up.role IN ('manager', 'department_head')
          AND (
            target_department IS NULL
            OR up.executive_scope = target_department
            OR target_department = 'transversal'
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on executive tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.executive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_baseline ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.executive_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.alert_thresholds FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.executive_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_baseline FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- executive_alerts — read by venue; managers update in scope
-- ---------------------------------------------------------------------------
CREATE POLICY executive_alerts_select
  ON public.executive_alerts
  FOR SELECT
  TO authenticated
  USING (public.is_executive_for_venue(venue_id));

CREATE POLICY executive_alerts_update
  ON public.executive_alerts
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_executive_alerts(venue_id, department))
  WITH CHECK (public.can_manage_executive_alerts(venue_id, department));

-- ---------------------------------------------------------------------------
-- alert_thresholds — read by venue; executive writes
-- ---------------------------------------------------------------------------
CREATE POLICY alert_thresholds_select
  ON public.alert_thresholds
  FOR SELECT
  TO authenticated
  USING (public.is_executive_for_venue(venue_id));

CREATE POLICY alert_thresholds_executive_insert
  ON public.alert_thresholds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  );

CREATE POLICY alert_thresholds_executive_update
  ON public.alert_thresholds
  FOR UPDATE
  TO authenticated
  USING (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  )
  WITH CHECK (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  );

CREATE POLICY alert_thresholds_executive_delete
  ON public.alert_thresholds
  FOR DELETE
  TO authenticated
  USING (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  );

-- ---------------------------------------------------------------------------
-- kpi_targets — read by venue; executive writes
-- ---------------------------------------------------------------------------
CREATE POLICY kpi_targets_select
  ON public.kpi_targets
  FOR SELECT
  TO authenticated
  USING (public.is_executive_for_venue(venue_id));

CREATE POLICY kpi_targets_executive_insert
  ON public.kpi_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  );

CREATE POLICY kpi_targets_executive_update
  ON public.kpi_targets
  FOR UPDATE
  TO authenticated
  USING (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  )
  WITH CHECK (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  );

CREATE POLICY kpi_targets_executive_delete
  ON public.kpi_targets
  FOR DELETE
  TO authenticated
  USING (
    public.is_executive_for_venue(venue_id)
    AND public.is_executive_role()
  );

-- ---------------------------------------------------------------------------
-- executive_audit_log — read by venue; insert by executive roles
-- ---------------------------------------------------------------------------
CREATE POLICY executive_audit_log_select
  ON public.executive_audit_log
  FOR SELECT
  TO authenticated
  USING (
    venue_id IS NOT NULL
    AND public.is_executive_for_venue(venue_id)
  );

CREATE POLICY executive_audit_log_insert
  ON public.executive_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    venue_id IS NOT NULL
    AND public.is_executive_for_venue(venue_id)
    AND public.is_executive()
  );

-- ---------------------------------------------------------------------------
-- venue_baseline — read by venue executives/admin
-- ---------------------------------------------------------------------------
CREATE POLICY venue_baseline_select
  ON public.venue_baseline
  FOR SELECT
  TO authenticated
  USING (public.is_executive_for_venue(venue_id));

-- ---------------------------------------------------------------------------
-- Fase 1 tables — executive SELECT on raw event data
-- ---------------------------------------------------------------------------
CREATE POLICY touch_events_executive_select
  ON public.touch_events
  FOR SELECT
  TO authenticated
  USING (public.is_executive_for_venue(venue_id));

CREATE POLICY destination_visits_executive_select
  ON public.destination_visits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.touch_events te
      WHERE te.id = touch_event_id
        AND public.is_executive_for_venue(te.venue_id)
    )
  );

CREATE POLICY avex_sessions_executive_select
  ON public.avex_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_executive_for_venue(venue_id));

CREATE POLICY avex_messages_executive_select
  ON public.avex_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.avex_sessions s
      WHERE s.id = session_id
        AND public.is_executive_for_venue(s.venue_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Grants — authenticated read via RLS on underlying tables
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.v_touches_by_zone_hourly TO authenticated;
GRANT SELECT ON public.v_touches_by_tag_daily TO authenticated;
GRANT SELECT ON public.v_hourly_baseline_median TO authenticated;
GRANT SELECT ON public.v_avex_effectiveness TO authenticated;
GRANT SELECT ON public.v_touch_abandonment TO authenticated;
GRANT SELECT ON public.v_channel_breakdown TO authenticated;
GRANT SELECT ON public.v_latency_to_destination TO authenticated;

COMMIT;
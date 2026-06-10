-- M4: allow content correction requests in executive_audit_log (T074)
ALTER TABLE public.executive_audit_log
  DROP CONSTRAINT executive_audit_log_action_check;

ALTER TABLE public.executive_audit_log
  ADD CONSTRAINT executive_audit_log_action_check CHECK (
    action IN (
      'acknowledge_alert',
      'assign_alert',
      'dismiss_alert',
      'export_report',
      'update_threshold',
      'update_kpi_target',
      'view_report',
      'request_content_correction'
    )
  );
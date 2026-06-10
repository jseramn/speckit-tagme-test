-- Fix kpi_targets department CHECK to include executive (CL-08 Ejecutivo row)
ALTER TABLE public.kpi_targets
  DROP CONSTRAINT kpi_targets_department_check;

ALTER TABLE public.kpi_targets
  ADD CONSTRAINT kpi_targets_department_check CHECK (
    department IN (
      'executive',
      'operations',
      'fnb',
      'experience',
      'front_office',
      'transversal'
    )
  );
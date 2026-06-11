---
description: "Lista de tareas TagMe Fase 3 — Staff & Feedback Operativo (milestones M0–M6)"
---

# Tasks: TagMe — Staff & Feedback Operativo (Fase 3)

**Input**: [plan.md](./plan.md) | [spec.md](./spec.md) | [constitution.md](./constitution.md) | [data-model.md](./data-model.md) | [contracts/](./contracts/) | [quickstart.md](./quickstart.md)

**Prerequisites**: Fase 1 desplegada (`001-tagme-platform`); rama `003-tagme-staff`

**Organización**: Milestones M0→M6 del plan, con trazabilidad a user stories (`S1`, `G1`, `V2`, etc.)

**Leyenda de reutilización**:
- `[REUTILIZA F1]` — artefacto existente de Fase 1 sin cambios estructurales
- `[REUTILIZA F2]` — extensión de capa gerencial Fase 2
- `[NUEVO]` — trabajo exclusivo Fase 3

---

## M0 — Fundación (Schema, RLS base, tipos, seed)

**Objetivo de salida**: Migraciones `004`–`006` aplicadas; roles `supervisor`/`manager`; seed Hotel Caribe org; helpers RLS; tipos y validadores listos.

**Dependencias**: Fase 1 completa (`venues`, `nfc_tags`, `user_profiles`, `touch_events`, `lib/insforge*.ts`)

**Verificación**: Query a `departments` devuelve 4 deptos Caribe; `staff_nfc_tags` con slugs `/s/`; helpers RLS retornan scope correcto por rol

### Auditoría y preparación

- [ ] T001 [Prioridad: Alta] [Milestone: M0] Inventariar artefactos F1 reutilizables (`lib/insforge.ts`, `lib/insforge-server.ts`, `lib/auth/session.ts`, `app/(guest)/layout.tsx`, `app/(admin)/layout.tsx`, `lib/tags/resolve-tag.ts`) y documentar gaps F3 en comentario de `types/staff.ts`. [REUTILIZA F1]

- [ ] T002 [Prioridad: Alta] [Milestone: M0] Crear estructura de carpetas vacías según `plan.md`: `app/(guest)/s/`, `app/(guest)/capture/`, `app/(staff)/`, `app/(supervisor)/`, `lib/staff/`, `lib/stays/`, `lib/capture/`, `lib/scorecards/`, `lib/supervisor/`, `tests/contract/003-staff/`. Depends on: T001

- [ ] T003 [Prioridad: Alta] [Milestone: M0] Crear scaffold `tests/contract/003-staff/` con harness de fixtures SQL (`rls/fixtures.sql`) y helper Vitest para mocks JWT por rol (staff/supervisor/manager/admin). [NUEVO] Depends on: T002

### Migración 004 — Schema

- [ ] T004 [Prioridad: Alta] [Milestone: M0] Crear `supabase/migrations/004_staff_schema.sql` con tablas org: `venue_staff_settings`, `departments`, `job_roles`, `shifts`, `supervisor_department_assignments` según `data-model.md`. [NUEVO]

- [ ] T005 [Prioridad: Alta] [Milestone: M0] Extender `004_staff_schema.sql` con tablas operativas: `staff_members`, `staff_nfc_tags`, `staff_shift_assignments`, `guest_stays`, `staff_capture_sessions`. Incluir partial unique index una tarjeta activa por empleado y CHECK constraints `origin_type`. [NUEVO] Depends on: T004

- [ ] T006 [Prioridad: Alta] [Milestone: M0] Extender `004_staff_schema.sql` con tablas captura: `feedback_entries`, `incident_reports`, `incident_status_history`, `venue_incident_categories`. CHECK: `feedback` sin campos incidencia; `origin_type` + `origin_id` NOT NULL. [NUEVO] Depends on: T005

- [ ] T007 [Prioridad: Alta] [Milestone: M0] Extender Fase 1 en `004_staff_schema.sql`: `user_profiles.role` +`supervisor`/`manager`; `touch_events.event_type` +`staff_capture_open`/`room_capture_open` + columna `metadata` jsonb. [REUTILIZA F1] Depends on: T004

- [ ] T008 [Prioridad: Alta] [Milestone: M0] Crear índices de rendimiento en `004_staff_schema.sql`: `idx_feedback_venue_created`, `idx_feedback_staff_created`, `idx_incidents_venue_status`, `idx_sessions_token`, `idx_guest_stays_token`, `idx_staff_nfc_slug`. [NUEVO] Depends on: T006

- [ ] T009 [Prioridad: Alta] [Milestone: M0] Aplicar migración `004_staff_schema.sql` en InsForge via CLI y verificar 12 tablas nuevas + extensiones F1. Depends on: T007, T008

### Migración 005 — RLS y helpers

- [ ] T010 [Prioridad: Alta] [Milestone: M0] Scaffold `supabase/migrations/005_staff_rls.sql` referenciando helpers F1 (`current_user_profile`, `user_venue_id`, `is_admin`, `can_access_pilot_venue`) de `002_rls_policies.sql`. [REUTILIZA F1] Depends on: T009

- [ ] T011 [Prioridad: Alta] [Milestone: M0] Implementar helpers SQL en `005_staff_rls.sql`: `supervisor_department_ids()`, `is_manager()`, `staff_member_id_for_user()`, `is_reception_staff()` (staff_member activo en depto `code='RECEPCION'`), `can_manage_guest_stays()` (`is_admin() OR is_manager() OR is_reception_staff()`), + composites `department_in_supervisor_scope()`, `can_manage_venue_staff()`. [NUEVO] Depends on: T010

- [ ] T012 [Prioridad: Alta] [Milestone: M0] `ENABLE ROW LEVEL SECURITY` + `FORCE` en las 14 tablas F3 de `005_staff_rls.sql`. [NUEVO] Depends on: T011

- [ ] T013 [Prioridad: Alta] [Milestone: M0] Políticas RLS org en `005_staff_rls.sql`: `departments`, `job_roles`, `shifts`, `staff_members`, `staff_nfc_tags`, `staff_shift_assignments`, `supervisor_department_assignments` según matriz Q2=B del plan. [NUEVO] Depends on: T012

- [ ] T014 [Prioridad: Alta] [Milestone: M0] Políticas RLS operativas en `005_staff_rls.sql`: `guest_stays` (INSERT formal y UPDATE consolidate/close solo vía `can_manage_guest_stays()`; INSERT ephemeral solo service role en APIs captura), `staff_capture_sessions` (RLS+FORCE sin políticas INSERT/UPDATE/SELECT para roles operativos; solo policy `admin` ALL por `venue_id`; escritura exclusiva vía service role en APIs captura), `feedback_entries` SELECT por rol, `incident_reports`, `incident_status_history`, `venue_incident_categories`, `venue_staff_settings`. Sin políticas anon INSERT (captura vía service role). [NUEVO] Depends on: T013

- [ ] T015 [Prioridad: Alta] [Milestone: M0] Extender `can_write_venue_content()` en `005_staff_rls.sql` para incluir rol `manager` en mismo `venue_id`. [REUTILIZA F1] Depends on: T011

- [ ] T016 [Prioridad: Alta] [Milestone: M0] Aplicar migración `005_staff_rls.sql` y smoke-test manual: supervisor solo ve depto asignado; staff solo ve propio `staff_member_id`; `staff_capture_sessions` inaccesible vía SDK authenticated para roles no-admin. Depends on: T014, T015, T117

- [ ] T117 [Prioridad: Alta] [Milestone: M0] Test RLS `staff_capture_sessions` en `tests/contract/003-staff/rls/capture-sessions.test.ts`: usuario `staff`/`supervisor` authenticated no puede SELECT/INSERT/UPDATE sesiones; `admin` sí; verificar que APIs captura usan service role (mock). [NUEVO] Depends on: T014, T003

### Migración 006 — Vistas scorecard (estructura)

- [ ] T017 [Prioridad: Media] [Milestone: M0] Crear `supabase/migrations/006_staff_scorecard_views.sql` con función `calc_internal_nps()` (retorna NULL si n<6) y vista `v_feedback_base` con timezone venue. [NUEVO] Depends on: T009

- [ ] T018 [Prioridad: Media] [Milestone: M0] Completar `006_staff_scorecard_views.sql` con vistas `v_scorecard_employee`, `v_scorecard_shift` (excluye `shift_id IS NULL`), `v_scorecard_department`, `v_scorecard_hotel` + grants SELECT authenticated. [NUEVO] Depends on: T017

- [ ] T019 [Prioridad: Media] [Milestone: M0] Aplicar migración `006_staff_scorecard_views.sql` y verificar `calc_internal_nps(1,0,6)` retorna valor; `calc_internal_nps(0,0,5)` retorna NULL. Depends on: T018

### Tipos, validadores y seed

- [ ] T020 [Prioridad: Alta] [Milestone: M0] Definir tipos Fase 3 en `types/staff.ts`: `StaffCaptureSession`, `GuestStay`, `FeedbackEntry`, `IncidentReport`, `ContextSnapshot`, `ScorecardMetrics`, roles extendidos. [NUEVO] Depends on: T001

- [ ] T021 [Prioridad: Alta] [Milestone: M0] Crear validadores Zod en `lib/validators/staff-session.ts`, `lib/validators/feedback.ts`, `lib/validators/incident.ts`, `lib/validators/guest-stay.ts` alineados a contratos. [NUEVO] Depends on: T020

- [ ] T022 [Prioridad: Alta] [Milestone: M0] Extender `lib/auth/session.ts`: tipos `StaffRole` +`supervisor`/`manager`; funciones `requireSupervisor()`, `requireManager()`, `canManageGuestStays()` (spec §Capacidad recepción: manager/admin OR staff_member en depto `RECEPCION`), `requireReception()` (= `canManageGuestStays()`, lanza 403 `RECEPTION_REQUIRED`), `staffMemberIdForSession()`. [REUTILIZA F1] Depends on: T007, T020, T011

- [ ] T023 [Prioridad: Alta] [Milestone: M0] Crear `scripts/seed-hotel-caribe-staff.ts`: 4 departamentos (Recepción con **`code = 'RECEPCION'`**), 2–3 `job_roles`/depto, turnos Mañana/Tarde/Noche, 5 categorías incidencia, ≥12 `staff_members`, 1 `staff_nfc_tag` activo/empleado piloto. **[DECISIÓN NEGOCIO]** validar nombres reales con RRHH Caribe antes de ejecutar. [NUEVO] Depends on: T009

- [ ] T024 [Prioridad: Alta] [Milestone: M0] Ejecutar seed y crear usuarios piloto InsForge: ≥1 supervisor con `supervisor_department_assignments`, ≥1 manager, ≥1 usuario recepción vinculado a `staff_members` del depto `RECEPCION` (para validar T118); vincular `staff_members.user_profile_id` donde aplique. **[DECISIÓN NEGOCIO]** asignación supervisores por departamento. Depends on: T023

- [ ] T025 [Prioridad: Alta] [Milestone: M0] Tests RLS helpers y matriz permisos base en `tests/contract/003-staff/rls/helpers.test.ts` y `rls/staff-role.test.ts` (staff ve propio feedback, no ve incidencias ajenas). [NUEVO] Depends on: T003, T016, T024

**Checkpoint M0**: Schema + RLS + seed + tipos listos · helpers RLS en verde · slugs `/s/caribe-staff-*` resolubles en DB

---

## M1 — NFC Staff → Sesión → Feedback (S1, G1 parcial) 🎯 MVP

**Objetivo de salida**: `/s/{slug}` abre captura ≤3s; sesión TTL 5 min; feedback persiste con `origin_type=staff_nfc`; walk-in auto-efímero 48h; touch_event `staff_capture_open`.

**Dependencias**: M0 completo (T001–T025)

**Independent Test**: Toque `/s/caribe-staff-maria-g` → redirect `/capture/{token}` con countdown → feedback 5★ → fila en `feedback_entries` con origen completo (quickstart esc. 1 + 3)

### Tests primero (Constitution III + V)

- [ ] T026 [Prioridad: Alta] [Milestone: M1] Contract test apertura sesión en `tests/contract/003-staff/staff-nfc-session.test.ts` según `contracts/staff-nfc-session.md` — debe fallar sin implementación. [S1] Depends on: T021

- [ ] T027 [Prioridad: Alta] [Milestone: M1] Contract test envío feedback en `tests/contract/003-staff/guest-capture-feedback.test.ts` según `contracts/guest-capture.md` — validar separación feedback/incidencia (sin campos categoría). [G1] Depends on: T021

- [ ] T028 [Prioridad: Alta] [Milestone: M1] Unit test TTL sesión y dedup 45s en `tests/unit/session-ttl.test.ts`: expiración a 5 min, reutilización sesión activa mismo tag+fingerprint, token invalidado post-expiración. [NUEVO] Depends on: T021

### Capa lib/staff — resolución y sesión

- [ ] T029 [Prioridad: Alta] [Milestone: M1] Implementar `resolveStaffTag(slug)` en `lib/staff/resolve-staff-tag.ts`: JOIN `staff_nfc_tags`→`staff_members`→`departments`→`job_roles`; 404 si revocada/inactiva. [REUTILIZA F1: patrón `lib/tags/resolve-tag.ts`] Depends on: T009, T020

- [ ] T030 [Prioridad: Alta] [Milestone: M1] Implementar `resolveActiveShift(staffMemberId)` en `lib/staff/resolve-shift.ts` con query `staff_shift_assignments` vigente (Q1=B: sin inferencia por hora). [NUEVO] Depends on: T029

- [ ] T031 [Prioridad: Alta] [Milestone: M1] Implementar `buildContextSnapshot()` en `lib/staff/build-context-snapshot.ts`: empleado, depto, cargo, `shift_id|null`, timezone venue; snapshot inmutable. [NUEVO] Depends on: T029, T030

- [ ] T032 [Prioridad: Alta] [Milestone: M1] Implementar `openCaptureSession()` en `lib/staff/open-capture-session.ts`: INSERT `staff_capture_sessions` TTL 5min, dedup <45s, `touch_events` `staff_capture_open`. [NUEVO] Depends on: T031

- [ ] T033 [Prioridad: Alta] [Milestone: M1] Implementar `validateSession(token)` en `lib/staff/validate-session.ts`: estados `active`/`expired`/`completed`; retorna 410 SESSION_EXPIRED. [NUEVO] Depends on: T032

### Capa lib/stays — cookie y efímero (mínimo para G1 esc.3)

- [ ] T034 [Prioridad: Alta] [Milestone: M1] Implementar `lib/stays/cookie.ts`: `readStayTokenFromRequest`, `setStayCookie` (HttpOnly/Secure/SameSite=Lax), `clearStayCookie`. [REUTILIZA F1: patrón cookies en `app/api/auth/sign-in`] Depends on: T020

- [ ] T035 [Prioridad: Alta] [Milestone: M1] Implementar `lib/stays/generate-stay-token.ts` y `lib/stays/resolve-stay-by-token.ts` con validación `status=active` + `expires_at > now()`. [NUEVO] Depends on: T020

- [ ] T036 [Prioridad: Alta] [Milestone: M1] Implementar `createEphemeralStay()` + `resolveOrCreateEphemeralStay()` en `lib/stays/create-ephemeral-stay.ts`: TTL 48h desde `venue_staff_settings`; reutilizar cookie activa; lazy expire. [G1] Depends on: T034, T035

### API sesión staff

- [ ] T037 [Prioridad: Alta] [Milestone: M1] Crear `POST /api/staff/sessions/open` en `app/api/staff/sessions/open/route.ts` con validación Zod, dedup, respuesta JSON contrato. [NUEVO] Depends on: T032, T022

- [ ] T038 [Prioridad: Alta] [Milestone: M1] Crear `GET /api/staff/sessions/[sessionToken]/route.ts` para polling countdown (`secondsRemaining`, staff context). [NUEVO] Depends on: T033

### UI captura huésped — feedback only (MVP slice)

- [ ] T039 [Prioridad: Alta] [Milestone: M1] Crear `components/capture/SessionCountdown.tsx`: countdown visible 5 min, mensaje expiración TR-01, deshabilitar envío al expirar. [NUEVO] Depends on: T038

- [ ] T040 [Prioridad: Alta] [Milestone: M1] Crear `components/capture/CaptureChoice.tsx`: bifurcación Feedback | Incidencia (Incidencia deshabilitada o placeholder hasta M3). [NUEVO] Depends on: T039

- [ ] T041 [Prioridad: Alta] [Milestone: M1] Crear `components/capture/FeedbackForm.tsx`: escala 1–5 + comentario opcional; sin campos incidencia (Principio IV). [G1] Depends on: T040

- [ ] T042 [Prioridad: Alta] [Milestone: M1] Crear `components/capture/CaptureConfirmation.tsx` con mensaje agradecimiento post-envío. [NUEVO] Depends on: T041

- [ ] T043 [Prioridad: Alta] [Milestone: M1] Crear página `app/(guest)/capture/[sessionToken]/page.tsx`: validar sesión activa, mostrar staff context, integrar componentes captura. [REUTILIZA F1: `app/(guest)/layout.tsx`] Depends on: T039, T040, T041, T042

- [ ] T044 [Prioridad: Alta] [Milestone: M1] Crear página entry `app/(guest)/s/[tagSlug]/page.tsx`: resolver tag → abrir sesión → redirect `/capture/{token}` en ≤3s. [S1] Depends on: T032, T043

### API y lib captura feedback

- [ ] T045 [Prioridad: Alta] [Milestone: M1] Implementar `submitFeedback()` en `lib/capture/submit-feedback.ts`: validar sesión activa, resolver/crear `guest_stay`, INSERT `feedback_entries` con `origin_type=staff_nfc`, completar sesión, validar CHECK origen. [NUEVO] Depends on: T033, T036, T031

- [ ] T046 [Prioridad: Alta] [Milestone: M1] Crear `POST /api/capture/feedback/route.ts` con service role, validación Zod, `setStayCookie` si efímero nuevo, respuesta 201. [G1] Depends on: T045, T034

### Verificación M1

- [ ] T047 [Prioridad: Alta] [Milestone: M1] Test trazabilidad origen en `tests/contract/003-staff/traceability-feedback.test.ts`: 100% registros con `origin_type`, `origin_id`, `stay_id`, `staff_member_id` cuando `staff_nfc`. [NUEVO] Depends on: T046

- [ ] T048 [Prioridad: Alta] [Milestone: M1] Test edge: sesión expirada mid-form retorna 410; tarjeta revocada retorna 404 INVALID_STAFF_TAG; huésped sin cookie auto-crea efímero. Depends on: T046

- [ ] T049 [Prioridad: Alta] [Milestone: M1] E2E Playwright `tests/e2e/staff-nfc-feedback.spec.ts`: flujo NFC staff → feedback → verificar DB; 9/10 aperturas ≤3s. [S1, G1] Depends on: T044, T046

- [ ] T050 [Prioridad: Alta] [Milestone: M1] Ejecutar `npm run test` y verificar T026–T028, T047–T048 en verde. Depends on: T049

**Checkpoint M1**: MVP captura staff-led funcional · SC-001/002 parcial · Principios II, III, IV, V verificados en feedback

---

## M2 — Estadía formal + cookie persistente (S4, G1, G3)

**Objetivo de salida**: Recepción genera estadía formal; cookie `tagme_stay` vincula múltiples feedbacks; mismo `stay_id` en capturas repetidas; cierre manual checkout.

**Dependencias**: M1 completo (T026–T050)

**Independent Test**: Recepción genera formal → dos NFC staff distintos → mismo `guest_stay_id` (quickstart esc. 2)

### Tests

- [x] T051 [Prioridad: Alta] [Milestone: M2] Contract tests estadía en `tests/contract/003-staff/guest-stay.test.ts` para POST formal, lookup, close según `contracts/guest-stay.md`. [S4] Depends on: T021

- [x] T052 [Prioridad: Alta] [Milestone: M2] Unit test `tests/unit/stay-ephemeral.test.ts`: reutilización cookie, expiración lazy, múltiples feedbacks mismo stay (S2/G3). Depends on: T036

### lib/stays — formal

- [x] T053 [Prioridad: Alta] [Milestone: M2] Implementar `createFormalStay()` en `lib/stays/create-formal-stay.ts`: TTL desde `venue_staff_settings.default_stay_ttl_days`, `stay_type=formal`, `created_by` recepción. [S4] Depends on: T035

- [x] T054 [Prioridad: Alta] [Milestone: M2] Implementar `lib/stays/resolve-guest-stay-for-capture.ts` unificando lógica para APIs captura: priorizar cookie formal > efímera activa > crear efímero. [NUEVO] Depends on: T036, T053

### API recepción

- [x] T055 [Prioridad: Alta] [Milestone: M2] Crear `POST /api/reception/stays/route.ts`: auth `requireReception()` (= `canManageGuestStays`), `createFormalStay`, `setStayCookie`, 201. [REUTILIZA F1: patrón `app/api/admin/tags/route.ts`] Depends on: T053, T034, T022

- [x] T056 [Prioridad: Alta] [Milestone: M2] Crear `GET /api/reception/stays/lookup/route.ts`: auth `requireReception()`; preview stay por token + `recordCounts` feedbacks/incidencias. Depends on: T035, T055

- [x] T057 [Prioridad: Alta] [Milestone: M2] Crear `POST /api/reception/stays/[stayId]/close/route.ts`: auth `requireReception()`; `status=closed`, `clearStayCookie`. [S4] Depends on: T053, T034, T022

- [x] T058 [Prioridad: Alta] [Milestone: M2] Refactorizar `POST /api/capture/feedback` para usar `resolve-guest-stay-for-capture` (formal prevalece sobre efímero). Depends on: T054, T046

### UI recepción

- [x] T059 [Prioridad: Alta] [Milestone: M2] Crear layout `app/(staff)/layout.tsx` con auth guard; rutas `/reception/*` exigen `canManageGuestStays()` (no todo `(staff)` genérico). [REUTILIZA F1: patrón `app/(admin)/layout.tsx`] Depends on: T022

- [x] T060 [Prioridad: Alta] [Milestone: M2] Crear `components/staff/StayGenerator.tsx` + página `app/(staff)/reception/page.tsx`: generar estadía formal, instrucciones operativas para recepcionista. **[DECISIÓN NEGOCIO]** copy UX check-in. Depends on: T055, T059

### Verificación M2

- [x] T061 [Prioridad: Alta] [Milestone: M2] Test SC-010 parcial: 100% `feedback_entries` tienen `guest_stay_id` NOT NULL tras flujos formal + walk-in + multi-empleado (G3). Depends on: T058, T060

- [x] T062 [Prioridad: Alta] [Milestone: M2] Test edge: checkout cierra stay; feedback post-cierre requiere nueva estadía; cookie formal prevalece si coexistía efímera en otro tab. Depends on: T057, T058

- [x] T063 [Prioridad: Media] [Milestone: M2] Validar quickstart escenarios 2–3 manualmente o E2E `tests/e2e/reception-stay.spec.ts`. Depends on: T060

**Checkpoint M2**: SC-010 stay_id en 100% registros · Recepción operativa

---

## M3 — Incidencias + bandeja supervisor (S3, V2)

**Objetivo de salida**: Flujo incidencia separado de feedback; estados auditados; bandeja supervisor ≤60s; notificación panel (badge).

**Dependencias**: M2 completo (T051–T063)

**Independent Test**: Sesión staff → Incidencia Mantenimiento → supervisor ve en `/incidents` → workflow completo (quickstart esc. 5)

### Tests

- [x] T064 [Prioridad: Alta] [Milestone: M3] Contract test incidencia en `tests/contract/003-staff/guest-capture-incident.test.ts`: sin campo `rating`; categorías válidas. [S3] Depends on: T021

- [x] T065 [Prioridad: Alta] [Milestone: M3] Contract test supervisor incidencias en `tests/contract/003-staff/supervisor-incidents.test.ts` según `contracts/supervisor-api.md`. [V2] Depends on: T021

- [x] T066 [Prioridad: Alta] [Milestone: M3] Tests RLS supervisor en `tests/contract/003-staff/rls/supervisor-role.test.ts`: SELECT/UPDATE incidencias solo depto asignado; INSERT `incident_status_history` en cada cambio. Depends on: T025

### Captura incidencia huésped

- [x] T067 [Prioridad: Alta] [Milestone: M3] Crear `components/capture/IncidentForm.tsx`: categoría (desde `venue_incident_categories`), descripción, prioridad sugerida por categoría + override huésped. **[DECISIÓN NEGOCIO]** labels categorías Caribe. Depends on: T040

- [x] T068 [Prioridad: Alta] [Milestone: M3] Implementar `submitIncident()` en `lib/capture/submit-incident.ts`: pipeline separado, `origin_type=staff_nfc`, ruteo `department_id` por categoría, estado `abierta`. [NUEVO] Depends on: T033, T054

- [x] T069 [Prioridad: Alta] [Milestone: M3] Crear `POST /api/capture/incident/route.ts` con validación Zod, INSERT `incident_reports` + history inicial, completar sesión staff. [S3] Depends on: T068

- [x] T070 [Prioridad: Alta] [Milestone: M3] Habilitar rama Incidencia en `CaptureChoice.tsx` y `capture/[sessionToken]/page.tsx` (ya no placeholder). Depends on: T067, T069

### lib/supervisor + API bandeja

- [x] T071 [Prioridad: Alta] [Milestone: M3] Implementar `lib/supervisor/incident-routing.ts`: mapeo categoría → `default_department_id` + prioridad default. [NUEVO] Depends on: T009

- [x] T072 [Prioridad: Alta] [Milestone: M3] Implementar `lib/supervisor/department-scope.ts`: wrapper `assertDepartmentAccess(departmentId)` usando RLS helpers. [NUEVO] Depends on: T011

- [x] T073 [Prioridad: Alta] [Milestone: M3] Crear `GET /api/supervisor/incidents/route.ts` con filtros status/depto/categoría; scope supervisor vs manager. [V2] Depends on: T071, T072, T022

- [x] T074 [Prioridad: Alta] [Milestone: M3] Crear `PATCH /api/supervisor/incidents/[id]/route.ts`: transiciones válidas, INSERT `incident_status_history`, validación `changed_by`. [V2] Depends on: T073

### UI supervisor incidencias

- [x] T075 [Prioridad: Alta] [Milestone: M3] Crear `components/supervisor/IncidentStatusBadge.tsx` y `components/supervisor/IncidentInbox.tsx` con badge conteo abiertas. [NUEVO] Depends on: T073

- [x] T076 [Prioridad: Alta] [Milestone: M3] Crear layout `app/(supervisor)/layout.tsx` + página `app/(supervisor)/incidents/page.tsx` con bandeja, filtros y acciones de estado. [REUTILIZA F1: patrones `app/(admin)/`] Depends on: T075, T074

- [x] T077 [Prioridad: Media] [Milestone: M3] Test regresión TR-02: matriz permisos completa en `tests/contract/003-staff/rls/permission-matrix.test.ts` (scorecard, comentarios, incidencias, config). Depends on: T066

- [x] T078 [Prioridad: Alta] [Milestone: M3] Verificar SC-007/SC-008: incidencia visible ≤60s; workflow 4 estados con 3+ filas history. Depends on: T076

**Checkpoint M3**: Feedback ≠ Incidencia end-to-end · Principio IV completo · V2 operativo

---

## M4 — Room NFC + consolidación estadías (G2, S4 consolidate)

**Objetivo de salida**: Captura desde `/capture/room/{slug}` con `origin_type=room_nfc`; CTA en hub `/t/`; Recepción consolida efímera→formal sin pérdida de registros.

**Dependencias**: M3 completo (T064–T078)

**Independent Test**: quickstart esc. 4 y 6 — room capture + consolidación (pueden paralelizarse con M5 tras M3)

### Consolidación estadías

- [ ] T079 [Prioridad: Alta] [Milestone: M4] Implementar `consolidateStays()` en `lib/stays/consolidate-stays.ts`: transacción atómica UPDATE `guest_stay_id` en feedbacks/incidencias/sessions; efímera `status=consolidated`. [NUEVO] Depends on: T053, T036

- [ ] T080 [Prioridad: Alta] [Milestone: M4] Crear `POST /api/reception/stays/consolidate/route.ts`: auth `requireReception()` (= `canManageGuestStays`); variantes con/sin `formalStayId` preexistente (one-step). [S4] Depends on: T079, T055, T022

- [ ] T118 [Prioridad: Alta] [Milestone: M4] Test auth recepción en `tests/contract/003-staff/reception-auth.test.ts`: manager/admin PASS; staff en depto `RECEPCION` PASS; staff housekeeping 403; supervisor housekeeping 403; supervisor `RECEPCION` PASS en POST `/api/reception/stays` y `/consolidate`. [S4] Depends on: T055, T080, T024

- [ ] T081 [Prioridad: Alta] [Milestone: M4] Unit test `tests/unit/stay-consolidation.test.ts`: counts correctos, idempotencia (re-consolidar falla), `consolidated_into` FK. Depends on: T079

- [ ] T082 [Prioridad: Alta] [Milestone: M4] Crear `components/staff/StayConsolidation.tsx` + `app/(staff)/reception/consolidate/page.tsx`: lookup token → preview counts → consolidar. Depends on: T056, T080

- [ ] T083 [Prioridad: Alta] [Milestone: M4] Edge cases consolidación: efímera expirada (lookup warning), cookie stale post-consolidación retorna 409, múltiples efímeras mismo huésped (UI sugiere más reciente). Depends on: T082

### Room NFC captura

- [ ] T084 [Prioridad: Alta] [Milestone: M4] Crear `app/(guest)/capture/room/[tagSlug]/page.tsx`: resolver `nfc_tags` F1, contexto habitación, bifurcación Feedback/Incidencia sin sesión staff. [G2] [REUTILIZA F1: `lib/tags/resolve-tag.ts`] Depends on: T043, T069

- [ ] T085 [Prioridad: Alta] [Milestone: M4] Extender `submitFeedback` y `submitIncident` para `origin_type=room_nfc` con `roomTagSlug`; `staff_member_id` NULL; `touch_events` `room_capture_open`. Depends on: T084

- [ ] T086 [Prioridad: Alta] [Milestone: M4] Extender `app/(guest)/t/[tagSlug]/page.tsx` [REUTILIZA F1]: añadir CTAs "Dejar opinión" / "Reportar problema" → `/capture/room/{slug}` sin romper hub AVEX. Depends on: T084

- [ ] T087 [Prioridad: Alta] [Milestone: M4] Test trazabilidad room: `origin_type=room_nfc`, `staff_member_id IS NULL`, `room_number` en snapshot; mismo workflow incidencia que staff-led. Depends on: T085

- [ ] T088 [Prioridad: Media] [Milestone: M4] Validar quickstart esc. 4 y 6; verificar TR-05 (slugs `/s/` vs `/t/` sin colisión). Depends on: T083, T087

**Checkpoint M4**: Dos orígenes trazables (staff_nfc + room_nfc) · Consolidación operativa

---

## M5 — Scorecards jerárquicos (S5, V1, M1)

**Objetivo de salida**: NPS interno n≥6; drill-down Empleado→Turno→Departamento→Hotel; vista staff personal; pulso supervisor; enrichment Fase 2.

**Dependencias**: M2 completo (feedbacks con `stay_id`); idealmente M3/M4 para incidencias en scorecard depto

**Independent Test**: ≥6 feedbacks piloto → NPS visible; empleado n<6 ve "datos insuficientes" (quickstart esc. 7)

### lib/scorecards

- [ ] T089 [Prioridad: Alta] [Milestone: M5] Implementar `lib/scorecards/calc-nps.ts` y `lib/scorecards/aggregate-ratings.ts`: NPS = %5★ − %1–2★; `insufficientData` si n< threshold. [NUEVO] Depends on: T020

- [ ] T090 [Prioridad: Alta] [Milestone: M5] Implementar `lib/scorecards/parse-period.ts` y `lib/scorecards/get-nps-threshold.ts` (desde `venue_staff_settings.min_feedbacks_for_nps`). Depends on: T089

- [ ] T091 [Prioridad: Alta] [Milestone: M5] Implementar `lib/scorecards/query-employee.ts`, `query-department.ts`, `query-hotel.ts` filtrando `v_feedback_base` por periodo; `trend7d`; ranking con `insufficientData` por empleado. Depends on: T019, T090

- [ ] T092 [Prioridad: Alta] [Milestone: M5] Implementar `lib/scorecards/assert-scorecard-access.ts` + `map-response.ts` según matriz Q2=B y contrato (staff sin comentarios ajenos). Depends on: T091, T022

### API scorecards

- [ ] T093 [Prioridad: Alta] [Milestone: M5] Crear validadores `lib/validators/scorecards.ts` y rutas `GET /api/scorecards/employee/[staffMemberId]`, `department/[departmentId]`, `hotel/route.ts`. [NUEVO] Depends on: T092

- [ ] T094 [Prioridad: Media] [Milestone: M5] Crear `GET /api/metrics/feedback-summary/route.ts` enrichment Fase 2 con `signalType: direct_feedback` [REUTILIZA F2: endpoint metrics existente]. Depends on: T091

### UI scorecards

- [ ] T095 [Prioridad: Alta] [Milestone: M5] Crear `components/supervisor/ScorecardCard.tsx`, `PeriodSelector.tsx`, `ScorecardDrillDown.tsx` con manejo TR-07 (sin turno asignado). [V1] Depends on: T093

- [ ] T096 [Prioridad: Alta] [Milestone: M5] Crear `app/(staff)/my-scorecard/page.tsx` (S5): NPS propio si n≥6; mensaje insuficiente; sin comentarios de terceros. Depends on: T095

- [ ] T097 [Prioridad: Alta] [Milestone: M5] Crear `app/(supervisor)/scorecards/page.tsx` + widget pulso en `app/(supervisor)/dashboard/page.tsx`. [V1, M1] Depends on: T095

### Tests scorecards

- [ ] T098 [Prioridad: Alta] [Milestone: M5] Unit tests `tests/unit/scorecards-nps.test.ts`: boundary n=5 vs n=6, solo promoters, solo detractors. Depends on: T089

- [ ] T099 [Prioridad: Alta] [Milestone: M5] Unit test `tests/unit/scorecards-shift-null.test.ts`: feedback con `shift_id: null` en employee/dept sí cuenta; excluido de `v_scorecard_shift`. Depends on: T091

- [ ] T100 [Prioridad: Alta] [Milestone: M5] Contract tests `tests/contract/003-staff/scorecards.test.ts` + `scorecards-auth.test.ts`: staff 403 en otro empleado; supervisor 403 fuera de depto. Depends on: T093

- [ ] T101 [Prioridad: Alta] [Milestone: M5] Seed ≥6 feedbacks/empleado piloto + E2E `tests/e2e/staff-scorecard.spec.ts`: NFC → feedback → scorecard actualizado ≤60s (SC-004). Depends on: T096, T024

**Checkpoint M5**: SC-004, SC-009 · Principio VII verificado · Jerarquía completa

---

## M6 — Config org + piloto + hardening (V3, M2)

**Objetivo de salida**: CRUD org operativo sin deploy; semana piloto Caribe; quickstart completo; hardening seguridad y performance.

**Dependencias**: M5 completo (ideal); mínimo M3+M4 para piloto funcional

**Independent Test**: Supervisor asigna NFC nuevo empleado → toque refleja turno; quickstart 10/10 escenarios PASS

### API configuración organizacional

- [ ] T102 [Prioridad: Alta] [Milestone: M6] Crear CRUD `app/api/supervisor/departments/route.ts` y `[id]/route.ts` con scope supervisor/manager. [V3] Depends on: T072, T022

- [ ] T103 [Prioridad: Alta] [Milestone: M6] Crear CRUD `app/api/supervisor/shifts/route.ts` por `departmentId` con validación `days_of_week`. [V3] Depends on: T102

- [ ] T115 [Prioridad: Alta] [Milestone: M6] Crear CRUD `app/api/supervisor/job-roles/route.ts` y `[id]/route.ts`: list/create/update/desactivar cargos por `departmentId`; scope supervisor (depto asignado) / manager (venue). Body: `{ departmentId, title, isActive }`. [V3] [FR-028] Depends on: T102, T072

- [ ] T116 [Prioridad: Alta] [Milestone: M6] Contract test `tests/contract/003-staff/supervisor-job-roles.test.ts`: supervisor crea cargo en depto asignado (201), supervisor 403 en depto ajeno, manager CRUD venue. Depends on: T115, T003

- [ ] T104 [Prioridad: Alta] [Milestone: M6] Crear CRUD `app/api/supervisor/staff-members/route.ts`: asignación depto/`jobRoleId` válido vía T115, activar/desactivar. **[DECISIÓN NEGOCIO]** no hardcodear empleados Caribe. Depends on: T102, T115

- [ ] T105 [Prioridad: Alta] [Milestone: M6] Crear endpoints asignación NFC y turnos: `StaffNfcAssignForm` logic en API (revocar tag anterior al asignar nuevo); CRUD `staff_shift_assignments`. Depends on: T104

### UI configuración

- [ ] T106 [Prioridad: Alta] [Milestone: M6] Crear `components/supervisor/StaffNfcAssignForm.tsx`, `OrganizationTree.tsx` y páginas `app/(supervisor)/organization/departments|shifts|job-roles|staff/page.tsx`. [V3] Depends on: T102, T103, T104, T105, T115

- [ ] T107 [Prioridad: Media] [Milestone: M6] Crear `app/(supervisor)/organization/page.tsx` hub navegación config; proteger rutas con layout supervisor. Depends on: T106

### Piloto y hardening

- [ ] T108 [Prioridad: Alta] [Milestone: M6] Ejecutar validación completa `quickstart.md` (10 escenarios) documentando PASS/FAIL por SC-00x. Depends on: T107, T101, T088

- [ ] T109 [Prioridad: Alta] [Milestone: M6] Test Safari iOS NFC real (TR-08): apertura `/s/{slug}` ≤3s en dispositivo físico; documentar hallazgos. Depends on: T049

- [ ] T110 [Prioridad: Alta] [Milestone: M6] Auditoría seguridad TR-09: verificar CHECK constraints origen en DB + validación Zod en APIs; script query registros huérfanos (debe retornar 0 filas). Depends on: T047

- [ ] T111 [Prioridad: Media] [Milestone: M6] Moderación comentarios: endpoint supervisor `GET /api/supervisor/feedback-comments` con filtro depto + filtro palabras básico. **[DECISIÓN NEGOCIO]** lista palabras. Depends on: T093

- [ ] T112 [Prioridad: Media] [Milestone: M6] Performance smoke TR-03: scorecard departamento ≤3s con 200 empleados simulados; documentar si requiere cache diario. Depends on: T097

- [ ] T113 [Prioridad: Alta] [Milestone: M6] Preparar capacitación piso Caribe: guía 1-página staff NFC + recepción consolidación (entregable operativo, no código). **[DECISIÓN NEGOCIO]** Depends on: T108

- [ ] T114 [Prioridad: Alta] [Milestone: M6] Semana piloto: checklist diario SC-005, SC-011, SC-012 con métricas captura vs. interacciones. **[DECISIÓN NEGOCIO]** Depends on: T113

**Checkpoint M6**: Fase 3 done según Constitution §8 — piloto operativo una semana

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total tareas** | 118 |
| **MVP mínimo (M0+M1)** | 51 tareas — NFC staff → feedback con origen trazable |
| **MVP operativo (M0–M3)** | 79 tareas — + estadía + incidencias + bandeja supervisor |
| **Piloto completo (M0–M6)** | 118 tareas — room NFC, scorecards, config org, piloto |

### Tareas por milestone

| Milestone | Tareas | IDs | User Stories | Entregable clave |
|-----------|--------|-----|--------------|------------------|
| **M0** Fundación | 26 | T001–T025, T117 | — | Schema 004–006, RLS, seed Caribe |
| **M1** NFC staff → feedback | 25 | T026–T050 | S1, G1 | `/s/{slug}` + captura ≤3s, TTL 5min |
| **M2** Estadía + cookie | 13 | T051–T063 | S4, G1, G3 | Recepción formal, walk-in 48h |
| **M3** Incidencias | 15 | T064–T078 | S3, V2 | Pipeline separado + bandeja |
| **M4** Room NFC + consolidate | 11 | T079–T088, T118 | G2, S4 | Origen habitación + fusión efímera |
| **M5** Scorecards | 13 | T089–T101 | S5, V1, M1 | NPS n≥6 jerárquico |
| **M6** Config + piloto | 15 | T102–T114, T115–T116 | V3, M2 | CRUD org + semana Caribe |

### Reutilización vs trabajo nuevo (resumen)

| Reutilizar (F1–F2) | Trabajo nuevo (F3) |
|--------------------|-------------------|
| `venues`, `nfc_tags`, `touch_events`, `user_profiles` | 12 tablas + 3 migraciones |
| `lib/insforge*.ts`, `lib/auth/session.ts` | `lib/staff/*`, `lib/stays/*`, `lib/capture/*` |
| `lib/tags/resolve-tag.ts`, hub `/t/` | Flujo `/s/` + sesiones TTL |
| `app/(guest)/layout.tsx`, `app/(admin)/*` patrones | `app/(staff)/`, `app/(supervisor)/`, UI captura |
| TagMétricas / `metrics/summary` | Scorecards + `feedback-summary` |

---

## Recomendación de Orden de Implementación

### Fase 1 — Bloqueante (semana 1)
**T001→T025 (M0 completo)** antes de cualquier UI. Sin schema y RLS, todo lo demás es deuda técnica. Priorizar T011–T016 (helpers + políticas core) para desbloquear tests de permisos tempranos.

### Fase 2 — MVP valor (semana 2)
**T026→T050 (M1)** en orden: tests contrato → lib/staff → cookie efímera mínima → API → UI → E2E. Este slice demuestra el paradigma staff-led (Principio II) y cierra el loop feedback con trazabilidad.

### Fase 3 — Identidad huésped (semana 3)
**T051→T063 (M2)** — la cookie formal es prerequisito de SC-010 y de scorecards fiables. Integrar `resolve-guest-stay-for-capture` antes de abrir incidencias a producción.

### Fase 4 — Cierre operativo (semana 4)
**T064→T078 (M3)** — incidencias y bandeja supervisor. Ejecutar T077 (matriz permisos) antes de piloto: TR-02 es riesgo alto.

### Fase 5 — Paralelo (semana 5)
Tras M3, **M4 (T079–T088)** y **M5 (T089–T101)** pueden avanzar en paralelo con equipos distintos:
- **Track A**: consolidación + room NFC (orígenes completos)
- **Track B**: scorecards + vistas (métricas gerenciales)

### Fase 6 — Piloto (semana 6+)
**T102→T114 (M6)** — config org primero (supervisor autónomo), luego quickstart completo y semana piloto.

### Criterio de parada MVP demo
Completar **M0+M1+M2** (50 tareas) permite demo: staff toca NFC → huésped feedback → recepción genera estadía → segundo feedback mismo stay.

---

## Riesgos y Decisiones a Validar Antes de Implementar

| ID | Tema | Acción requerida | Tareas bloqueadas |
|----|------|------------------|-------------------|
| **D-01** | **[DECISIÓN NEGOCIO]** Estructura org Hotel Caribe: departamentos, turnos, empleados piloto, asignación supervisores | Validar con RRHH/operaciones Caribe antes de T023–T024 | T023, T024, T104, T113 |
| **D-02** | **[DECISIÓN NEGOCIO]** Categorías y prioridades default de incidencias | Confirmar 5 categorías seed y mapeo a deptos (mantenimiento→Mantenimiento, etc.) | T067, T071 |
| **D-03** | **[DECISIÓN NEGOCIO]** Copy UX captura huésped y recepción | Aprobar textos español piso (countdown, confirmación, instrucciones cookie) | T039, T060, T082 |
| **D-04** | Fórmula NPS interno | Resuelto Q1=B (n≥6, %5★−%1–2★) — no requiere acción | — |
| **D-05** | Consolidación UX: ¿one-step default o formal preexistente? | Resuelto Q3=B one-step; validar flujo recepción en T082 con usuario real | T082 |
| **R-01** | TR-02 RLS supervisor demasiado amplio/restrictivo | Ejecutar T077 antes de piloto; revisar con cuenta supervisor real | T076–T078 |
| **R-02** | TR-08 Safari iOS NFC | Planificar T109 con tarjetas físicas antes de semana piloto | T109, T114 |
| **R-03** | Staff sin `shift_assignment` (TR-07) | Documentar en capacitación; UI "sin turno asignado" en T095 — no bloquea MVP | T095, T113 |
| **R-04** | Zona gris: notificaciones push/WhatsApp incidencias | Fuera MVP; solo badge panel (T075) salvo decisión explícita | — |
| **R-05** | Fase 2 dashboards no listos para enrichment | T094 es desacoplado; panel supervisor (M5) autónomo | T094 |

---

## Dependencias entre Milestones

```text
M0 ──► M1 ──► M2 ──► M3 ──┬──► M4 ──┐
                           │         ├──► M6
                           └──► M5 ──┘
```

**Paralelización segura post-M3**: M4 ∥ M5 (equipos distintos, sin conflictos de archivos principales).

---

## Oportunidades de Paralelización

| Grupo | Tareas paralelas | Condición |
|-------|------------------|-----------|
| M0 setup | T004–T007 (migración por bloques), T020–T021 (tipos/validators) | Tras T002 |
| M0 RLS | T013 (org) ∥ T014 (operativo) | Tras T012 |
| M1 lib | T029–T031 ∥ T034–T036 | Tras T025 |
| M1 UI | T039–T042 componentes en paralelo | Tras T038 |
| M3+M4+M5 | M4 room NFC ∥ M5 scorecards | Tras M3 |
| M6 | T102–T105 APIs en paralelo | Tras M5 |

---

## Notas de Trazabilidad Constitution

| Principio | Tareas de verificación |
|-----------|------------------------|
| II Staff central | T044, T049 |
| III Origen trazable | T047, T087, T110 |
| IV Feedback ≠ Incidencia | T027, T064, T067–T069 |
| V Sesiones 5 min | T028, T033, T048, T117 |
| VI Estadía persistente | T051–T063, T079–T083, T118 |
| VII Scorecards jerárquicos | T089–T101 |
| VIII Config sin código | T102–T107, T115–T116 |
| IX Captura interna | T049, T108 |
| X Entrega incremental | Checkpoints por milestone |
# Research: TagMe Fase 3 — Staff & Feedback Operativo

**Fecha**: 2026-06-10 | **Spec**: [spec.md](./spec.md) | **Constitution**: [constitution.md](./constitution.md)

Decisiones consolidadas de Phase 0. Sin marcadores `NEEDS CLARIFICATION` pendientes — Q1–Q3 resueltos en clarificación 2026-06-10.

---

## 1. Arquitectura — Extensión del monolito Next.js + InsForge

**Decision**: Mantener monolito Next.js (BFF) en Vercel; extender rutas y tablas existentes. Sin microservicios ni colas en MVP.

**Rationale**: Fases 1–2 ya validaron el patrón. Volumen piloto (≥150 sesiones staff/día, ≥500 registros/mes) no justifica infra adicional. Principio X (entrega incremental) favorece slices sobre plataforma paralela.

**Alternatives considered**:
- Servicio separado de captura — rechazado: duplica auth, deploy y RLS
- Edge Function dedicada por sesión — rechazado: latencia similar; complejidad de debugging en piso

---

## 2. URL de tarjetas NFC staff vs tags fijos

**Decision**: Tarjetas staff programadas con URL canónica `https://{domain}/s/{staffTagSlug}`. Tags fijos de habitación/zona mantienen `/t/{tagSlug}` con CTA de captura integrado.

**Rationale**: Separación física y semántica clara (Principio III). El staff no comparte slug namespace con tags de habitación. Resolución en ≤1 query (`staff_nfc_tags.tag_slug`).

**Alternatives considered**:
- Misma ruta `/t/` con discriminador en DB — rechazado: riesgo de colisión slug staff vs room; confusión al programar tags
- Query param `?mode=capture` en hub — rechazado para staff: staff no pasa por hub; necesita apertura directa ≤3s

---

## 3. Modelo de sesiones efímeras (TTL 5 min)

**Decision**: Tabla `staff_capture_sessions` con `session_token` opaco (UUID v4), `expires_at = NOW() + interval '5 minutes'`, estado `active | completed | expired`. Validación server-side en cada endpoint de captura; token invalidado tras envío exitoso o expiración.

**Rationale**: Principio V constitucional. Token en path (`/capture/{sessionToken}`) evita almacenar en localStorage (huésped no autenticado). Expiración enforced en DB + middleware API, no solo en UI.

**Alternatives considered**:
- JWT firmado sin persistencia — rechazado: no permite revocación centralizada ni auditoría de sesiones activas
- Sesión en cookie — rechazado: mezcla identidad estadía con sesión efímera staff; confunde TTL

**Deduplicación de sesiones (edge case spec)**: Ventana **45 segundos**. Si mismo `staff_nfc_tag_id` + `client_fingerprint` (hash UA parcial + IP /24) tiene sesión `active` no expirada → reutilizar sesión existente en lugar de crear duplicado. No aplica a feedbacks ya enviados.

---

## 4. Identidad de estadía — cookie + guest_stay efímero

**Decision**:
- Cookie `tagme_stay` HttpOnly, Secure, SameSite=Lax; valor = `stay_token` opaco (no UUID expuesto).
- Tabla `guest_stays` con `stay_type`: `formal` (Recepción) | `ephemeral` (auto 48h).
- TTL formal: configurable por venue en `venue_staff_settings.default_stay_ttl_days` (default **7 días** piloto).
- TTL efímero: **48 horas** fijas (Q3=B).
- Consolidación: `UPDATE` registros + `guest_stays.consolidated_into` apuntando a estadía formal; estadía efímera pasa a `status = consolidated`.

**Rationale**: Principio VI. Walk-ins cubiertos sin bloquear captura. Recepción fusiona sin pérdida de trazabilidad (FR-010b).

**Alternatives considered**:
- Solo cookie formal — rechazado: pierde capturas pre-check-in (R-02)
- localStorage stay_id — rechazado: menos robusto cross-tab; no HttpOnly

**Detección estadía activa en consolidación**: Recepción busca por `stay_token` de cookie del huésped o ingreso manual de token corto impreso (opcional post-MVP). MVP: escaneo de QR con `stay_token` en pantalla del huésped o lectura de cookie vía flujo asistido en estación recepción.

---

## 5. Feedback ≠ Incidencia — tablas separadas

**Decision**: Dos tablas `feedback_entries` e `incident_reports` con esquemas distintos. UI bifurcada desde primer pantallazo post-sesión. Cero campos compartidos de workflow (prioridad, categoría fallo) en feedback.

**Rationale**: Principio IV no negociable. Evita anti-patrón de "comentario unificado". Pipelines de métricas independientes.

**Alternatives considered**:
- Tabla `capture_entries` con `type` discriminator — rechazado: tentación de mezclar campos; viola constitution §9
- Incidencia como feedback rating=1 — rechazado explícitamente en spec

---

## 6. Scorecards — vistas SQL en tiempo real vs snapshots

**Decision**: **Vistas SQL** (`v_scorecard_*`) como fuente primaria en MVP; actualización en tiempo real al consultar (objetivo ≤60s = consistencia read-after-write PostgreSQL). Tabla opcional `scorecard_snapshots` para cache diario (job nocturno) solo si NFR-002 falla en piloto.

**Rationale**: Volumen piloto bajo; vistas con índices en `feedback_entries(venue_id, created_at, staff_member_id)` son suficientes. Evita pipeline de materialización prematura.

**Fórmula NPS interno (Q1=B)**:
```
NPS_interno = (count(rating=5)/n × 100) − (count(rating IN (1,2))/n × 100)
```
Gate UI: `n >= 6` → mostrar NPS; `n < 6` → `insufficient_data: true`.

**Turno**: Solo `shift_id` de `staff_shift_assignments` vigente al `created_at` del registro; sin inferencia horaria.

**Alternatives considered**:
- Agregación solo en aplicación — rechazado: duplica lógica supervisor/gerente; difícil de auditar
- Materialized views refresh cada minuto — pospuesto: añadir si dashboard >3s

---

## 7. Roles y RLS — extensión de Fase 1

**Decision**:
- Extender `user_profiles.role` con valores `supervisor`, `manager` (gerente general).
- Tabla `supervisor_department_assignments` (user_profile_id, department_id) para scope supervisor.
- Tabla `staff_members` vincula empleado operativo a `user_profiles` (nullable si empleado sin login — solo NFC).
- RLS: supervisor filtra por `department_id IN (asignados)`; manager/admin venue completo; staff operativo solo `staff_member_id` propio.

**Rationale**: Matriz Q2=B. Reutiliza auth InsForge y helpers RLS existentes (`user_venue_id()`, `is_admin()`).

**Alternatives considered**:
- Rol supervisor solo en JWT claim — rechazado: no auditable; difícil de configurar sin deploy
- Permisos solo en aplicación — rechazado: NFR-007 exige RLS por venue/depto

---

## 8. Extensión touch_events (FR-034)

**Decision**: Migración `ALTER TABLE touch_events ADD COLUMN event_type TEXT DEFAULT 'hub_visit'` con valores `hub_visit | staff_capture_open | room_capture_open`. Metadata JSONB opcional (`staff_capture_session_id`, `stay_id`).

**Rationale**: Un solo pipeline de analítica física; TagMétricas distingue proxy vs captura real. No duplicar tabla de toques.

**Alternatives considered**:
- Tabla `capture_touch_events` separada — rechazado: spec FR-034 pide extensión

---

## 9. Prioridad de incidencia

**Decision**: **Auto-sugerida por categoría** con override del huésped (opcional selector simple: Normal / Urgente). Defaults en `venue_incident_categories.default_priority`.

| Categoría default | Prioridad sugerida |
|-------------------|-------------------|
| mantenimiento | alta |
| ruido | media |
| limpieza | media |
| f_and_b | media |
| otro | baja |

**Rationale**: Zona gris spec resuelta pragmáticamente; staff de piso no clasifica — huésped elige urgencia si desea.

---

## 10. Notificaciones de incidencia

**Decision**: MVP = **visibilidad en panel supervisor** (bandeja con badge contador). Sin push/WhatsApp/email (zona gris constitution).

**Rationale**: Entrega incremental; SC-007 cumplible con polling/refresh ≤60s en panel.

---

## 11. Integración Fase 2 (dashboards C-Level)

**Decision**: Exponer endpoint `GET /api/metrics/feedback-summary` consumible por dashboards Fase 2. Panel supervisor Fase 3 **autónomo** (R-07).

**Rationale**: Fase 2 puede estar parcial; no bloquear piloto staff.

---

## 12. Testing strategy

**Decision**: Vitest (unit: NPS calc, session TTL, stay consolidation); Playwright E2E (staff NFC → feedback → scorecard); contract tests en `tests/contract/003-staff/`.

**Rationale**: Alineado a Fase 1; tests en puntos de valor constitucional (sesión 5 min, origen obligatorio, n≥6).

---

## Resumen de decisiones abiertas → cerradas

| Tema | Estado |
|------|--------|
| Fórmula NPS y n≥6 | ✅ Q1=B |
| Permisos supervisor/gerente/staff | ✅ Q2=B |
| guest_stay efímero 48h + consolidación | ✅ Q3=B |
| Deduplicación sesiones NFC | ✅ 45s ventana |
| Prioridad incidencia | ✅ Auto-sugerida + override huésped |
| URL staff NFC | ✅ `/s/{staffTagSlug}` |
| Scorecards compute | ✅ Vistas SQL tiempo real |
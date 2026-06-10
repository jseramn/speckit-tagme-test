# Quickstart: Validación Fase 3 — Staff & Feedback Operativo

**Fecha**: 2026-06-10 | **Plan**: [plan.md](./plan.md) | **Piloto**: Hotel Caribe by Faranda Grand

Guía para validar la Fase 3 end-to-end tras implementación. Referencia contratos y modelo de datos; no incluye código de implementación.

---

## Prerrequisitos

| Requisito | Verificación |
|-----------|--------------|
| Fase 1 desplegada | `/t/caribe-lobby` abre hub |
| Migraciones Fase 3 | `004_staff_schema`, `005_staff_rls`, `006_staff_scorecard_views` |
| Seed Hotel Caribe Fase 3 | 4 departamentos, ≥3 staff con NFC, categorías incidencia |
| Roles configurados | ≥1 supervisor, ≥1 manager, recepción staff |
| Variables entorno | `INSFORGE_*`, `NEXT_PUBLIC_APP_URL` |
| Tarjeta NFC staff física (opcional) | URL `/s/caribe-staff-{nombre}` |

---

## Escenario 1 — NFC staff → feedback (S1, G1, SC-001, SC-002)

**Objetivo**: Sesión ≤3s; expira 5 min; feedback con origen completo.

1. En móvil, abrir `https://{APP_URL}/s/caribe-staff-maria-g`
2. **Esperado**: Redirect a `/capture/{token}` con nombre "María G.", countdown 5 min
3. Elegir **Feedback** → calificar 5 → enviar
4. **Esperado**: Confirmación; sesión cerrada
5. Verificar InsForge:
   - `staff_capture_sessions.status = completed`
   - `feedback_entries` con `origin_type=staff_nfc`, `staff_member_id`, `guest_stay_id`
   - `touch_events.event_type = staff_capture_open`
6. Esperar 5 min sin enviar en nueva sesión → **Esperado**: 410 SESSION_EXPIRED

**Pass**: 9/10 aperturas ≤3s; 100% sesiones expiran a 5 min.

---

## Escenario 2 — Estadía formal Recepción (S4, FR-006)

**Objetivo**: Cookie persistente vincula feedbacks posteriores.

1. Login recepción → `/reception`
2. Generar estadía formal → **Esperado**: cookie `tagme_stay` en DevTools
3. Sin cerrar navegador, completar feedback vía NFC staff (Escenario 1)
4. **Esperado**: Mismo `guest_stay_id` en ambos intentos si misma cookie

**Pass**: `stay_type=formal`; cookie HttpOnly presente.

---

## Escenario 3 — Walk-in efímero 48h (G1 esc.3, Q3=B)

**Objetivo**: Captura sin cookie previa auto-crea estadía.

1. Ventana incógnito (sin cookie)
2. Abrir `/s/caribe-staff-carlos-r` → enviar feedback
3. **Esperado**: `guest_stays.stay_type=ephemeral`, TTL ~48h
4. Verificar cookie emitida automáticamente

**Pass**: Envío exitoso sin pasar por Recepción.

---

## Escenario 4 — Consolidación efímera → formal (S4 esc.4, FR-010b)

1. Con estadía efímera del Escenario 3, login recepción
2. `/reception/consolidate` → ingresar token efímero o flujo asistido
3. Crear estadía formal y consolidar
4. **Esperado**:
   - Feedback del esc.3 ahora bajo `guest_stay_id` formal
   - Efímera `status=consolidated`, `consolidated_into` poblado

**Pass**: Cero pérdida de registros; conteo `consolidatedRecords` correcto.

---

## Escenario 5 — Incidencia separada (S3, V2, SC-007)

1. Nueva sesión staff → elegir **Incidencia**
2. Categoría Mantenimiento → descripción → enviar
3. Login supervisor mantenimiento → `/incidents`
4. **Esperado**: Incidencia `status=abierta` visible ≤60s
5. Cambiar a `en_progreso` → `resuelta` → `cerrada`
6. **Esperado**: 3 filas en `incident_status_history`

**Pass**: Formulario incidencia sin campos de rating; workflow completo.

---

## Escenario 6 — Captura habitación sin staff (G2, FR-021)

1. Incógnito → `https://{APP_URL}/capture/room/caribe-room-412`
2. **Esperado**: Contexto "Habitación 412"
3. Enviar incidencia categoría Ruido
4. Verificar: `origin_type=room_nfc`, `staff_member_id IS NULL`

**Pass**: Mismo workflow estados que incidencia staff-led.

---

## Escenario 7 — Scorecard NPS n≥6 (S5, V1, FR-026)

1. Insertar o capturar ≥6 feedbacks para empleado piloto en 30 días
2. Login staff empleado → `/my-scorecard`
3. **Esperado**: NPS interno visible, `insufficientData=false`
4. Con solo 3 feedbacks → **Esperado**: "Datos insuficientes (n=3)"
5. Login supervisor → `/scorecards` → drill-down empleado
6. **Esperado**: Ranking sin PII huésped; comentarios visibles solo manager

**Pass**: NPS = (%5★ − %1-2★); staff no ve comentarios textuales.

---

## Escenario 8 — Múltiples feedbacks mismo par (S2, G3)

1. Misma cookie estadía + mismo empleado
2. Dos sesiones NFC separadas (>45s entre ellas) → dos feedbacks
3. **Esperado**: 2 filas `feedback_entries` independientes
4. Scorecard empleado promedia ambos

**Pass**: Timestamps y `staff_capture_session_id` distintos.

---

## Escenario 9 — Config org sin deploy (V3, SC-011)

1. Login supervisor housekeeping
2. Crear turno "Mañana 6–14", asignar empleado, vincular NFC
3. Toque NFC del empleado
4. **Esperado**: `context_snapshot.shift_id` poblado en nuevo feedback
5. Tiempo total configuración ≤15 min

**Pass**: Sin intervención desarrollo.

---

## Escenario 10 — Enriquecimiento Fase 2 (M1, OBJ-09)

1. `GET /api/metrics/feedback-summary?period=7d` como manager
2. **Esperado**: `signalType=direct_feedback`, NPS y conteo incidencias
3. Comparar con TagMétricas toques en dashboard Fase 1
4. **Esperado**: Etiquetas distinguen proxy vs señal directa

**Pass**: Endpoint responde ≤3s con datos reales del piloto.

---

## Checklist pre-piloto semana Caribe

- [ ] ≥12 staff con tarjeta NFC activa
- [ ] ≥4 departamentos configurados
- [ ] Recepción capacitada en estadía formal + consolidación
- [ ] Supervisores con departamentos asignados en `supervisor_department_assignments`
- [ ] Categorías incidencia seed validadas con jefes de área
- [ ] Prueba iOS + Android en ≥3 dispositivos reales
- [ ] Auditoría: 0 registros sin `origin_type` o `guest_stay_id` (SC-010)

---

## Comandos útiles (post-implementación)

```bash
# Migraciones locales
npx @insforge/cli db push

# Tests unitarios scorecard/sesión
npm run test -- tests/unit/scorecards-nps.test.ts

# E2E flujo staff NFC
npx playwright test tests/e2e/staff-nfc-feedback.spec.ts
```

---

## Referencias

- [data-model.md](./data-model.md) — tablas y vistas
- [contracts/](./contracts/) — payloads API
- [spec.md](./spec.md) — SC-001–SC-012
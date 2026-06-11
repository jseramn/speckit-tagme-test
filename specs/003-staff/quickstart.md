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

# Contract test job_roles (M6 / T115)
npm run test -- tests/contract/003-staff/supervisor-job-roles.test.ts

# Auditoría TR-09 — registros huérfanos (debe PASS)
npm run audit:orphans

# E2E flujo staff NFC
npx playwright test tests/e2e/staff-nfc-feedback.spec.ts
```

## Validación M6 completada

Ver [checklists/quickstart-validation.md](./checklists/quickstart-validation.md) para resultados PASS por escenario.

Guías operativas:
- [guides/capacitacion-piso-caribe.md](./guides/capacitacion-piso-caribe.md) — capacitación staff/recepción/supervisor
- [checklists/pilot-week.md](./checklists/pilot-week.md) — métricas diarias semana piloto
- [checklists/ios-nfc-tr08.md](./checklists/ios-nfc-tr08.md) — protocolo iOS Safari NFC

---

## Referencias

- [data-model.md](./data-model.md) — tablas y vistas
- [contracts/](./contracts/) — payloads API
- [spec.md](./spec.md) — SC-001–SC-012

---

## Tests de Permisos y RLS (Opcional pero recomendado para piloto)

Los tests de integración bajo `tests/contract/003-staff/rls/` validan que las políticas RLS de Fase 3 respeten la matriz de permisos (Q2=B): staff solo ve lo propio, supervisor solo su(s) departamento(s), manager/admin ven el venue completo.

Por defecto, la suite completa aparece como **omitida** (`skipped`) en CI y en entornos locales sin credenciales de usuario. Estos tests no usan la service key (bypass RLS); necesitan clientes InsForge autenticados con JWT reales para simular cada rol en PostgREST.

### Variables de entorno necesarias

Además de las variables base del proyecto, configura en `.env.local`:

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `INSFORGE_URL` | Sí | Base URL del proyecto InsForge |
| `INSFORGE_ANON_KEY` | Sí | Clave anon para clientes con JWT de rol |
| `INSFORGE_SERVICE_KEY` | Sí* | Tests que comparan contra service role |
| `INSFORGE_TEST_SUPERVISOR_JWT` | Recomendada | Cliente autenticado como supervisor |
| `INSFORGE_TEST_MANAGER_JWT` | Recomendada | Cliente autenticado como manager |
| `INSFORGE_TEST_ADMIN_JWT` | Opcional | Cliente autenticado como admin |
| `INSFORGE_TEST_STAFF_JWT` | Opcional | Cliente autenticado como staff operativo |

\* Sin service key, `hasRlsTestEnv()` puede activarse igualmente si al menos un JWT de rol está presente; algunos casos de comparación quedarán incompletos.

Ejemplo en `.env.local`:

```env
INSFORGE_TEST_SUPERVISOR_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
INSFORGE_TEST_MANAGER_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
INSFORGE_TEST_ADMIN_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Opcional — staff operativo / recepción
INSFORGE_TEST_STAFF_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Cómo obtener los JWTs

**Prerrequisito:** usuarios piloto creados en InsForge Auth y vinculados a `user_profiles`:

```bash
npm run seed:staff        # estructura org + categorías incidencia
npm run seed:pilot-users  # supervisor, manager y recepción piloto
```

Credenciales por defecto del seed (cambiables vía env):

| Rol | Email | Contraseña default |
|-----|-------|-------------------|
| Supervisor | `supervisor.caribe@tagme.pilot` | `PilotCaribe2026!` |
| Manager | `manager.caribe@tagme.pilot` | `PilotCaribe2026!` |
| Staff (recepción) | `reception.caribe@tagme.pilot` | `PilotCaribe2026!` |

**Opción A — Dashboard InsForge (recomendada)**

1. Abre el proyecto **tagme-hotel-caribe** en [InsForge Dashboard](https://insforge.dev).
2. Ve a **Authentication → Users**.
3. Localiza el usuario piloto (p. ej. `supervisor.caribe@tagme.pilot`).
4. Inicia sesión como ese usuario o copia su **access token** / JWT de sesión desde las herramientas de Auth del dashboard.
5. Pega el token en la variable correspondiente (`INSFORGE_TEST_SUPERVISOR_JWT`, etc.).
6. Repite para manager y admin.

**Opción B — Sign-in vía API**

Con la app en marcha (`npm run dev`), autentica cada usuario y extrae el `accessToken` de la respuesta:

```bash
curl -s -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor.caribe@tagme.pilot","password":"PilotCaribe2026!"}'
```

Copia el valor de `accessToken` del JSON de respuesta al `.env.local`. Los tokens expiran; renóvalos si los tests empiezan a fallar con `401`.

### Tests que se activan

Al configurar las variables, Vitest deja de omitir los `describe` RLS y ejecuta los casos cuyo JWT de rol esté disponible:

| Archivo | Qué valida | Roles requeridos |
|---------|------------|------------------|
| `rls/permission-matrix.test.ts` | Regresión TR-02: matriz permisos staff/supervisor/manager | staff, supervisor, manager |
| `rls/staff-role.test.ts` | Staff: feedback propio; sin acceso a incidencias | staff (+ supervisor para casos cruzados) |
| `rls/supervisor-role.test.ts` | Supervisor: incidencias solo de depto asignado; sin feedback ajeno | supervisor (+ staff) |
| `rls/capture-sessions.test.ts` | Sesiones NFC: deny-by-default; solo service role escribe | staff, supervisor, admin |

Los tests de esquema/contrato en `scorecards.test.ts`, `scorecards-auth.test.ts` y `reception-auth.test.ts` corren sin JWT de rol (lógica de aplicación o validadores Zod).

### Cómo ejecutar los tests de permisos

```bash
# Suite RLS completa
npm run test -- tests/contract/003-staff/rls/

# Archivo específico
npm run test -- tests/contract/003-staff/rls/permission-matrix.test.ts

# Con salida detallada
npm run test -- tests/contract/003-staff/rls/ --reporter=verbose
```

**Esperado con JWTs configurados:** 0 suites `skipped` en `rls/`; tests individuales sin JWT de un rol concreto muestran `Skipping: set INSFORGE_TEST_*_JWT...` en consola pero no fallan la suite.

### Recomendación pre-piloto Caribe

Configura **al menos** `INSFORGE_TEST_SUPERVISOR_JWT` y `INSFORGE_TEST_MANAGER_JWT` antes de la semana piloto:

- El **supervisor** es el rol más expuesto a errores de scope (incidencias y scorecards fuera de departamento asignado).
- El **manager** valida visibilidad hotelera completa y acceso a comentarios textuales.
- Un fallo RLS en piloto es difícil de detectar manualmente y puede exponer datos de otros departamentos o empleados.

Ejecutar `npm run test -- tests/contract/003-staff/rls/` con JWTs válidos toma menos de un minuto y confirma que la capa de seguridad documentada en `005_staff_rls.sql` se comporta como la spec antes de abrir el hotel a usuarios reales.
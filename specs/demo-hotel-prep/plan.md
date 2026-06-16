# Plan Técnico: Preparación de Demo para el Hotel

**Branch**: `demo/preparacion-piloto` | **Fecha**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Especificación en `specs/demo-hotel-prep/spec.md` — fase de preparación demo (sin nuevas funcionalidades), post Fase 3 M0–M6 con tests estables.

---

## Summary

Dejar TagMe en estado **demo-ready** para Hotel Caribe ejecutando solo trabajo de **alto impacto perceptivo y bajo esfuerzo**: curación de datos realistas, guion operativo, smoke tests manuales, y correcciones puntuales de copy/UX que eviten artefactos de desarrollo visibles durante la presentación.

**Enfoque**: reutilizar el 95 % del producto ya implementado; invertir el esfuerzo restante en datos, ensayo y 3–5 micro-ajustes de UI.

**Esfuerzo estimado total**: 1–2 días persona (no calendario) repartidos en:
- Día A: seeds + smoke + micro-fixes
- Día B: ensayo general + hoja QR/bookmarks

---

## Technical Context

| Dimensión | Valor |
|-----------|-------|
| **Stack** | Next.js 15 (Vercel) + InsForge PostgreSQL |
| **Tests** | Vitest (contract/integration) + Playwright E2E — estables |
| **Entorno demo** | Producción piloto o staging con `NEXT_PUBLIC_APP_URL` público |
| **Seeds existentes** | `seed-hotel-caribe.ts`, `seed-hotel-caribe-staff.ts`, `seed-scorecard-feedbacks.ts`, `seed-pilot-users.ts` |
| **E2E cubiertos** | Staff NFC feedback, room capture, room context, guest hub, reception page load, scorecard auth |
| **E2E no cubiertos** | Incidencia → bandeja supervisor, scorecard drill-down con datos reales |
| **Restricción** | Cero features nuevas; solo bugs bloqueantes y pulido de presentación |

---

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven Development | `spec.md` aprobada; plan acotado a preparación | ✅ |
| II. Business First | Prioriza flujos que el hotel valora (trazabilidad, bandeja, scorecards) | ✅ |
| III. Visual/UX Clarity | Micro-fixes de copy; sin rediseño | ✅ |
| IV. Pragmatic Quality | Smoke + E2E existentes; no expandir suite salvo guion P1 | ✅ |
| V. Simplicity | Sin refactors; scripts idempotentes | ✅ |
| VI. MVP-Oriented | Solo P1 obligatorio; P2 si sobra tiempo | ✅ |

**Violaciones**: ninguna. No se requiere Complexity Tracking.

---

## 1. Análisis de Brechas Actuales

### 1.1 Flujos suficientemente presentables (listos con datos correctos)

| Flujo | Evidencia | Estado demo |
|-------|-----------|-------------|
| **Staff NFC → Feedback** | E2E `staff-nfc-feedback.spec.ts`; UI `CaptureFlow`, `FeedbackForm`, `CaptureConfirmation` | ✅ Listo |
| **Staff NFC → Incidencia (captura)** | Contract `guest-capture-incident.test.ts`; copy confirmación en `IncidentForm` | ✅ Listo |
| **Room NFC → Captura** | E2E `room-capture.spec.ts`, `room-context.spec.ts` | ✅ Listo |
| **Login / roles** | E2E redirects en `staff-scorecard.spec.ts`; usuarios en `seed-pilot-users.ts` | ✅ Listo |
| **Sesión 5 min + expiración** | `SessionCountdown.tsx` con mensaje claro en español | ✅ Listo |
| **Elección Feedback/Incidencia** | `CaptureChoice.tsx` sin "Próximamente" | ✅ Listo |

### 1.2 Brechas que requieren pulido mínimo (no bloquean, pero afectan percepción)

| Brecha | Impacto demo | Esfuerzo | Acción recomendada |
|--------|--------------|----------|-------------------|
| **Comentarios seed técnicos** (`Seed scorecard seed-f3-scorecard-feedbacks`) | Medio — si alguien ve comentarios en drill-down manager | Bajo | Curar textos en `seed-scorecard-feedbacks.ts` o script `seed-demo-curate.ts` |
| **Bandeja sin incidencias precargadas** | Alto — anticlimax al abrir `/incidents` | Bajo | Nuevo `scripts/seed-demo-incidents.ts` (2–3 casos realistas) |
| **Etiqueta `(TR-07)` visible** en scorecards turno | Alto — luce desarrollo interno | Muy bajo | Reemplazar por "Sin turno asignado" en `ScorecardDrillDown.tsx` |
| **Sin comando único de preparación** | Medio — riesgo de olvidar un seed | Bajo | Agregar `npm run seed:demo` en `package.json` |
| ~~**Slug inconsistente en spec**~~ | — | — | Resuelto en T008; slugs canónicos en §2.4 |
| **E2E incidencias ausente** | Medio — confianza interna pre-ensayo | Bajo | Smoke manual documentado en `quickstart.md` (no obligatorio E2E nuevo) |
| **Supervisor piloto solo HK** | Medio — incidencia Mantenimiento no visible para supervisor HK | Bajo | Guion: incidencia demo vía `maria-g` (HK) o login `manager` para bandeja global |
| **Estados de carga texto plano** ("Cargando…") | Bajo | — | Aceptable para demo; no invertir en skeletons |
| **Recepción/consolidación** | Bajo (P2) | — | Mostrar pantalla + narrar; E2E solo smoke de carga |

### 1.3 Qué dejar simplificado o solo con datos demo

| Área | Tratamiento |
|------|-------------|
| **Recepción + consolidación** | Pantalla `/reception` en vivo; consolidación narrada o captura estática |
| **Config org (turnos/NFC)** | Mencionar capacidad; no demostrar CRUD completo |
| **`/my-scorecard` staff** | Opcional si hay segundo móvil |
| **Hub Fase 1 `/t/caribe-lobby`** | 30 s de contexto si preguntan |
| **AVEX / C-Level** | Fuera del guion |
| **Turnos sin asignar** | Válido; UI ya muestra turno "unassigned" — ocultar código TR-07 |

### 1.4 Matriz de confianza pre-demo

```text
                    Presentable    Necesita datos    Necesita micro-fix
Staff NFC Feedback       ✅              —                  —
Staff NFC Incidencia     ✅              ✅ (bandeja)        —
Room NFC Capture         ✅              —                  —
Bandeja Supervisor       ✅              ✅ (seed)           —
Scorecards Empleado      ✅              ✅ (n≥6)            —
Scorecards Depto         ✅              ✅ (n≥6)            ✅ (TR-07 label)
Login/Roles              ✅              —                  —
Recepción (P2)           ⚠️              —                  —
```

---

## 2. Estrategia de Datos para la Demo

### 2.1 Capas de datos

| Capa | Script | Propósito | ¿Re-ejecutar? |
|------|--------|-----------|---------------|
| **Venue + tags habitación** | `npm run seed` | Lobby, habitación 412, tags `/t/` | Idempotente; solo si venue vacío |
| **Org + staff NFC** | `npm run seed:staff` | 12 empleados, 4 deptos, categorías incidencia | Idempotente |
| **Scorecards n≥6** | `npm run seed:scorecards` | 8 feedbacks/empleado con `seed_tag` | Salta si ya existe |
| **Usuarios piloto** | `npm run seed:pilot-users` | supervisor, manager, recepción | Idempotente |
| **Incidencias demo** *(nuevo)* | `npm run seed:demo-incidents` | 2–3 incidencias realistas | Idempotente por `seed_tag` |
| **Curación copy** *(opcional)* | `npm run seed:demo-curate` | Reemplazar comentarios técnicos | Idempotente |

### 2.2 Procedimiento recomendado (reset demo)

```bash
# 1. Base (orden obligatorio)
npm run seed
npm run seed:staff
npm run seed:pilot-users
npm run seed:scorecards

# 2. Datos demo (tras implementar scripts del plan)
npm run seed:demo-incidents
npm run seed:demo-curate   # opcional

# 3. Verificación
npm run audit:orphans      # debe reportar 0 huérfanos
npm run test:e2e -- tests/e2e/staff-nfc-feedback.spec.ts tests/e2e/room-capture.spec.ts
```

**Comando unificado propuesto** (`package.json`):

```bash
npm run seed:demo
# → ejecuta la cadena 1+2 en orden con mensajes de progreso
```

### 2.3 Reset ligero post-ensayo (sin destruir seed base)

| Qué limpiar | Criterio | Método |
|-------------|----------|--------|
| Capturas del ensayo | Feedback/incidencias sin `seed_tag` creadas en las últimas 24 h | Script `scripts/cleanup-demo-session.ts` *(opcional)* o borrado manual vía SQL por `created_at` |
| Datos seed demo | Registros con `seed_tag` demo | Re-ejecutar seed idempotente (no duplica) |
| Sesiones staff abiertas | `staff_capture_sessions` expiradas | Auto-TTL; no requiere acción |

**Regla**: no truncar tablas completas; borrar solo por `seed_tag` o ventana temporal.

### 2.4 Actores y URLs canónicos para la demo

| Rol demo | Slug / URL | Departamento | Uso en guion |
|----------|------------|--------------|--------------|
| **María G.** | `/s/caribe-staff-maria-g` | Housekeeping | Protagonista feedback + incidencia HK |
| **Carlos P.** | `/s/caribe-staff-carlos-p` | Housekeeping | Segundo staff (E2E scorecard; evitar colisión paralela con maria-g) |
| **Roberto H.** | `/s/caribe-staff-roberto-h` | Mantenimiento | Solo si se demo incidencia Mantenimiento con manager |
| **Habitación 412** | `/capture/room/caribe-room-412` | Room | Captura sin staff |
| **Hub habitación** | `/t/caribe-room-412` | Room | CTA → captura (contexto) |
| **Supervisor HK** | login `supervisor.caribe@tagme.pilot` | HK | `/incidents`, `/scorecards` |
| **Gerente** | login `manager.caribe@tagme.pilot` | Global | Bandeja multi-depto si hace falta |
| **Recepción** | login `reception.caribe@tagme.pilot` | Recepción | `/reception` |

**Password piloto** (default seed): `PilotCaribe2026!` — confirmar en `.env.local` antes de la demo.

### 2.5 Textos realistas sugeridos (incidencias precargadas)

| Estado | Categoría | Descripción demo |
|--------|-----------|------------------|
| `abierta` | Limpieza / HK | "Faltan toallas en habitación 412" |
| `en_progreso` | Mantenimiento | "Aire acondicionado con ruido irregular en 408" |
| `abierta` | Ruido | "Ruido de obra en pasillo piso 4" |

### 2.6 Comentarios feedback realistas (reemplazar seed técnico)

- "Excelente atención durante el turn-down."
- "Muy amable al entregar las toallas extra."
- "Servicio rápido y profesional."
- "Demora en el room service del desayuno."

---

## 3. Cambios Técnicos Recomendados (mínimos, alto impacto)

Priorizados por ratio impacto/esfuerzo. **Total estimado: 4–6 h desarrollo.**

### P0 — Hacer antes del ensayo (bloquean percepción)

| # | Cambio | Archivo(s) | Impacto |
|---|--------|------------|---------|
| 1 | **Script `seed-demo-incidents.ts`** — 2–3 incidencias con `seed_tag: seed-demo-hotel-prep` | `scripts/`, `package.json` | Bandeja nunca vacía |
| 2 | **Ocultar `(TR-07)`** → "Sin turno asignado" | `components/supervisor/ScorecardDrillDown.tsx` | Elimina artefacto dev |
| 3 | **`npm run seed:demo`** — cadena ordenada | `package.json`, `scripts/seed-demo-all.ts` | Reduce error humano |

### P1 — Hacer si hay 1–2 h extra

| # | Cambio | Archivo(s) | Impacto |
|---|--------|------------|---------|
| 4 | **Comentarios realistas en scorecard seed** | `scripts/seed-scorecard-feedbacks.ts` | Credibilidad si manager ve detalle |
| 5 | **Hoja QR / bookmarks** — markdown con URLs absolutas | `specs/demo-hotel-prep/guides/demo-urls.md` | Fallback NFC |
| 6 | **Auto-refresh bandeja** tras crear incidencia en vivo | `IncidentInbox.tsx` — polling 15 s opcional *solo si* el facilitador reporta delay >60 s | Confianza "tiempo real" |

### P2 — Solo si un bug aparece en ensayo

| # | Cambio | Condición |
|---|--------|-----------|
| 7 | Fix performance scorecards >3 s | Solo si ensayo mide >3 s en red del hotel |
| 8 | E2E smoke incidencias | Solo si falla repetidamente en ensayo manual |
| 9 | Copy consolidación recepción | Solo si pantalla confunde al hotel |

### Explícitamente NO hacer

- Rediseño visual, nuevos gráficos, skeleton loaders
- Nuevos endpoints o tablas
- Integración PMS, notificaciones, AVEX
- Refactor de scorecards o RLS
- Ampliar matriz E2E completa

---

## 4. Estructura de la Demo

### 4.1 Guion ordenado (45–60 min)

| # | Tiempo | Quién | Qué mostrar | Mensaje clave |
|---|--------|-------|-------------|---------------|
| **0** | 3 min | Facilitador | Contexto: reseñas tardías vs captura en el momento | Problema → oportunidad |
| **1** | 7 min | Staff (móvil huésped) | `/s/caribe-staff-maria-g` → Feedback 5★ → confirmación | "Un toque NFC, cero fricción" |
| **2** | 8 min | Staff + Supervisor (proyector) | Misma tarjeta → Incidencia HK → login supervisor → `/incidents` → "Tomar en progreso" | "Feedback ≠ incidencia; bandeja inmediata" |
| **3** | 6 min | Huésped (incógnito) | `/capture/room/caribe-room-412` → incidencia o feedback | "Captura sin staff en habitación" |
| **4** | 8 min | Supervisor | `/scorecards` → Housekeeping → drill-down María G. → NPS visible | "Métricas reales del huésped, no proxies" |
| **5** | 5 min | Recepción | `/reception` → generar estadía (narrar consolidación) | "Identidad del huésped desde check-in" |
| **6** | 5 min | Facilitador | Recap + próximos pasos piloto | Cierre |
| **7** | 15 min | Todos | Preguntas y alineación | Compromiso piloto |

**Duración demo en vivo**: ~32 min + 15 min Q&A ≈ **47 min** (margen hasta 60 con preguntas operativas).

### 4.2 Dispositivos y setup en sala

| Dispositivo | Rol |
|-------------|-----|
| iPhone Safari | Huésped (NFC o QR) |
| Android Chrome | Backup huésped |
| Laptop + proyector | Supervisor / scorecards / bandeja |
| Hotspot 4G | Backup si WiFi hotel falla |

**Precargar** antes de entrar: URLs del guion en favoritos; sesión supervisor logueada en laptop.

### 4.3 Puntos que generan más confianza en el hotel

1. **Captura en vivo ≤3 s** — el staff no pierde tiempo
2. **Incidencia aparece en bandeja durante la sesión** — no es mockup
3. **NPS con n≥6 en empleado real del hotel** (María G.) — métrica creíble
4. **Origen trazable visible** ("María G.", "Habitación 412") — responde "¿quién atendió?"
5. **Sin login del huésped** — baja fricción vs TripAdvisor
6. **Config org existente** (4 departamentos, 12 empleados) — "ya está nuestro hotel"

### 4.4 Narrativa de trazabilidad (hilo conductor)

```text
Staff toca NFC → Huésped opina/reporta → Supervisor ve bandeja/scorecard
                     ↓
              Cookie estadía vincula todo (Recepción)
                     ↓
         Room NFC cubre el caso sin staff presente
```

---

## 5. Riesgos Técnicos para la Demo

| ID | Riesgo | Prob. | Impacto | Mitigación |
|----|--------|-------|---------|------------|
| **DR-01** | NFC iOS no abre URL | Media | Crítico | QR impreso con `/s/caribe-staff-maria-g`; probar TR-08 48 h antes |
| **DR-02** | WiFi lento/bloqueado | Media | Alto | Hotspot; usar URL producción; `next start` no dev server en sala |
| **DR-03** | Incidencia no aparece ≤60 s | Baja | Alto | Precargar seed; botón "Actualizar" en bandeja; ensayo mismo día |
| **DR-04** | Scorecard "datos insuficientes" | Baja | Alto | `npm run seed:scorecards` 24 h antes; verificar María G. n≥6 |
| **DR-05** | Sesión expira durante explicación | Media | Medio | Segunda URL lista; narrar los 5 min como feature |
| **DR-06** | Credenciales piloto inválidas | Baja | Alto | `npx tsx scripts/seed-pilot-users.ts --verify-only` 1 h antes |
| **DR-07** | RLS bloquea supervisor | Baja | Alto | Ensayo con cuenta real; fallback login manager |
| **DR-08** | Comentarios "Seed scorecard…" visibles | Media | Medio | P1 curación copy; evitar drill-down comentarios en demo |
| **DR-09** | Paralelo E2E consume slug | Baja | Medio | No ejecutar E2E durante demo; maria-g vs carlos-p separados |

### Entorno estable recomendado

| Aspecto | Recomendación |
|---------|---------------|
| **Deploy** | Build producción Vercel (`next build` + `next start` local solo para ensayo) |
| **Base de datos** | InsForge producción piloto — no dev local sin red |
| **Variables** | `NEXT_PUBLIC_APP_URL` = URL pública real del piloto |
| **Dev tokens** | Desactivar `STAFF_DEV_TOKEN` en entorno demo |
| **Datos** | Ejecutar `npm run seed:demo` ≥24 h antes + verificación día D |
| **Tests** | Correr E2E en commit desplegado; no correr suite completa en sala |

---

## 6. Criterios de "Demo Ready"

Checklist técnico mínimo antes del **ensayo general** (T-48h) y repetir **día D-1 h**.

### 6.1 Infraestructura y datos

- [ ] `npm run seed:demo` completado sin errores
- [ ] `npm run audit:orphans` → 0 registros huérfanos
- [ ] Usuarios piloto verificados (`seed-pilot-users.ts --verify-only`)
- [ ] María G. scorecard NPS visible (n≥6) en periodo 30d
- [ ] Bandeja `/incidents` muestra ≥2 incidencias precargadas + estados distintos
- [ ] Deploy commit = commit con E2E verde

### 6.2 Flujos P1 (smoke manual — ver `quickstart.md`)

- [ ] Staff NFC feedback: apertura ≤3 s, confirmación, sesión cierra
- [ ] Staff NFC incidencia: llega a bandeja ≤60 s, avance de estado OK
- [ ] Room 412 capture: contexto habitación + envío OK
- [ ] Scorecards: dept HK + drill-down María G. con NPS
- [ ] Login supervisor y manager OK

### 6.3 UX y presentación

- [ ] Sin `(TR-07)` ni textos "Seed scorecard" visibles en guion
- [ ] QR/favoritos impresos para maria-g y room-412
- [ ] Guion cronometrado ≤60 min
- [ ] Hotspot probado como backup

### 6.4 Automatizado (pre-ensayo)

```bash
npm run test -- tests/contract/003-staff/
npm run test:e2e -- tests/e2e/staff-nfc-feedback.spec.ts tests/e2e/room-capture.spec.ts tests/e2e/staff-scorecard.spec.ts
```

### 6.5 Criterio de salida

**Demo Ready** = todos los ítems §6.1 + §6.2 + §6.3 marcados + ensayo general 2× consecutivas sin fallo bloqueante en flujos P1.

---

## Project Structure (esta fase)

```text
specs/demo-hotel-prep/
├── spec.md
├── plan.md              # este archivo
├── research.md          # decisiones de datos y entorno
├── quickstart.md        # smoke + ensayo demo
├── data-model.md        # mapa entidades demo (no schema nuevo)
├── guides/
│   └── demo-urls.md     # QR/bookmarks (P1)
└── checklists/
    └── requirements.md

scripts/                   # cambios propuestos
├── seed-demo-incidents.ts   # P0 nuevo
├── seed-demo-all.ts         # P0 nuevo
├── seed-demo-curate.ts      # P1 opcional
└── seed-scorecard-feedbacks.ts  # P1 editar comentarios

components/supervisor/
└── ScorecardDrillDown.tsx   # P0 editar label TR-07
```

---

## Fases de Ejecución

| Fase | Entregable | Duración est. |
|------|------------|---------------|
| **A — Datos** | `seed:demo`, incidencias precargadas, comentarios curados | 2–3 h |
| **B — Micro-fixes** | TR-07 label, `seed:demo` script | 1 h |
| **C — Documentación** | `quickstart.md`, `demo-urls.md`, guion impreso | 1–2 h |
| **D — Ensayo** | 2× guion completo + checklist §6 | 2 h |
| **E — Demo hotel** | Ejecución guion §4 | 45–60 min |

**Siguiente comando**: `/speckit.tasks` para desglosar Fases A–D en tareas verificables.

---

## Complexity Tracking

No aplica — cero violaciones de constitution; sin complejidad añadida.
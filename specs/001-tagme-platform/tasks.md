---
description: "Lista de tareas TagMe MVP — milestones M0–M6"
---

# Tasks: TagMe — Plataforma NFC/IoT

**Input**: [plan.md](./plan.md) | [spec.md](./spec.md) | [data-model.md](./data-model.md) | [contracts/](./contracts/) | [quickstart.md](./quickstart.md)

**Prerequisites**: Plan y spec clarificados; rama `001-tagme-platform`

**Organización**: Milestones M0→M6 del plan, con etiquetas `[USn]` para trazabilidad a user stories

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Total tareas** | 92 |
| **MVP mínimo (M0+M1)** | 34 tareas — hub NFC funcional con métricas de toque |
| **MVP demo hotel (M0–M2)** | 46 tareas — destinos + dashboard básico |
| **MVP piloto completo (M0–M6)** | 92 tareas — AVEX, admin, habitación, hardening |

### Tareas por milestone

| Milestone | Tareas | User Stories | Entregable clave |
|-----------|--------|--------------|------------------|
| **M0** Fundación | T001–T018 (18) | — | Next.js + InsForge + schema + seed Hotel Caribe |
| **M1** NFC Core | T019–T034 (16) | US-1 | `/t/[tagSlug]` <3s + `touch_events` |
| **M2** Destinos + métricas | T035–T046 (12) | US-2, US-6 | Destinos navegables + dashboard parcial |
| **M3** Admin contenido | T047–T060 (14) | US-4, US-7 | Staff edita contenido; CRUD tags |
| **M4** Contexto habitación | T061–T068 (8) | US-2 | Banner habitación + hub contextualizado |
| **M5** AVEX conversacional | T069–T082 (14) | US-3 | Chat SSE + guardrails + KB |
| **M6** Piloto hardening | T083–T092 (10) | US-5, US-6 | Fallback staff, deploy Vercel, validación quickstart |

### Prioridad de inicio

1. **M0** (bloqueante) — sin esto nada más funciona
2. **M1** (valor core) — promesa NFC del producto
3. **M2** — segundo pilar TagMétricas + destinos PDF
4. M3 ∥ M4 — pueden paralelizarse tras M2
5. M5 → M6 — AVEX y cierre piloto

### Oportunidades paralelas

- M0: T005, T006, T007, T010, T011 en paralelo tras T004
- M1: T020, T021 tests en paralelo; T023, T024 componentes en paralelo
- M3 ∥ M4: equipos distintos post-M2

---

## M0 — Fundación

**Objetivo de salida**: Repo Next.js operativo, InsForge vinculado, tablas creadas con RLS, seed Hotel Caribe con 3 tags, tipos y validadores listos.

**Dependencias**: Ninguna — inicio inmediato

**Verificación**: `npm run dev` arranca; query a `venues` devuelve Hotel Caribe; tags seed existen

### Setup proyecto

- [x] T001 Inicializar Next.js 15 App Router con TypeScript en raíz del repo via `npx create-next-app@latest` con Tailwind en `package.json`
- [x] T002 [P] Configurar `tsconfig.json` con paths alias `@/*` apuntando a raíz del proyecto
- [x] T003 [P] Crear `.env.local.example` con `INSFORGE_URL`, `INSFORGE_ANON_KEY`, `INSFORGE_SERVICE_KEY`, `NEXT_PUBLIC_APP_URL` en `.env.local.example`
- [x] T004 Instalar dependencias `@insforge/sdk`, `zod`, `date-fns` en `package.json` via npm

### InsForge y schema

- [x] T005 Vincular proyecto InsForge ejecutando `npx @insforge/cli link` y documentar project-id en `README.md` (sección Setup)
- [x] T006 Crear cliente browser en `lib/insforge.ts` con `createClient` y variables de entorno públicas
- [x] T007 [P] Crear cliente server-side en `lib/insforge-server.ts` con service key solo para API routes
- [x] T008 Crear script SQL de migración `supabase/migrations/001_initial_schema.sql` con tablas de `data-model.md` (venues, nfc_tags, experience_configs, knowledge_entries, touch_events, destination_visits, avex_sessions, avex_messages, user_profiles, content_audit_log)
- [x] T009 Aplicar migración en InsForge y verificar tablas creadas via dashboard o CLI — script `npm run db:migrate` + instrucciones CLI/dashboard
- [x] T010 [P] Configurar RLS policies en `supabase/migrations/002_rls_policies.sql` según matriz en `data-model.md`
- [x] T011 [P] Crear vistas SQL `v_touches_daily`, `v_touches_hourly`, `v_destination_breakdown` en `supabase/migrations/003_metrics_views.sql`

### Tipos, validadores y seed

- [x] T012 [P] Definir tipos TypeScript compartidos (`GuestHubPayload`, `Destination`, `TouchEvent`) en `types/index.ts` alineados a `contracts/guest-experience.md`
- [x] T013 [P] Crear esquemas Zod para eventos en `lib/validators/events.ts` según `contracts/analytics-events.md`
- [x] T014 Crear seed script `scripts/seed-hotel-caribe.ts` con venue `hotel-caribe`, 3 tags (`caribe-lobby`, `caribe-restaurant`, `caribe-room-412`) y `experience_config` con 4 destinos de ejemplo
- [x] T015 Ejecutar seed y verificar datos en InsForge (3 tags activos, `avex_enabled: true`) — script listo; ejecución requiere `.env.local` + migraciones aplicadas

### Tooling y estructura base

- [x] T016 [P] Configurar Vitest en `vitest.config.ts` y script `test` en `package.json`
- [x] T017 [P] Configurar Playwright en `playwright.config.ts` con proyecto mobile Safari/Chrome en `playwright.config.ts`
- [x] T018 Crear estructura de carpetas vacías documentada en `plan.md`: `app/(guest)/`, `app/(admin)/`, `app/api/`, `components/guest|avex|admin|ui/`, `lib/tags/`, `lib/analytics/`, `lib/avex/`, `tests/contract/`, `tests/e2e/`

**Checkpoint M0**: `npm run dev` OK · seed visible · RLS aplicado

---

## M1 — NFC Core (US-1) 🎯 MVP

**Objetivo de salida**: Huésped abre `/t/caribe-lobby`, ve hub mobile en <3s, se registra `touch_event` con deduplicación 60s.

**Dependencias**: M0 completo (T001–T018)

**Independent Test**: Abrir `/t/caribe-lobby` en móvil → hub visible; fila en `touch_events` con `device_type` y `country_code`

### Testing (Pragmatic Quality — escribir primero, verificar fallo)

- [x] T019 [P] [US1] Contract test schema `TouchEventRequest` en `tests/contract/touch-event.test.ts` — debe fallar sin implementación
- [x] T020 [P] [US1] Integration test resolución tag en `tests/integration/resolve-tag.test.ts` contra seed — debe fallar sin `lib/tags/resolve-tag.ts`

### Core — resolución tag y API

- [x] T021 [US1] Implementar `resolveTag(slug)` con join venue+config en `lib/tags/resolve-tag.ts` retornando `GuestHubPayload`
- [x] T022 [US1] Implementar deduplicación 60s y parseo UA/geo en `lib/analytics/track.ts` función `recordTouchEvent`
- [x] T023 [US1] Crear `POST /api/events/touch` en `app/api/events/touch/route.ts` validando con Zod e insertando via service client

### Guest UI — hub básico

- [x] T024 [P] [US1] Crear layout mobile-first "silent luxury" en `app/(guest)/layout.tsx` con tipografía y colores base Tailwind
- [x] T025 [P] [US1] Crear `components/guest/DestinationCard.tsx` para tarjeta de destino (props: label, icon, url, isPrimary)
- [x] T026 [US1] Crear `components/guest/GuestHub.tsx` client component mostrando destinos desde payload en `components/guest/GuestHub.tsx`
- [x] T027 [US1] Crear página RSC `app/(guest)/t/[tagSlug]/page.tsx` que resuelve tag, dispara touch async, renderiza GuestHub con `revalidate: 60`
- [x] T028 [US1] Crear `components/guest/FallbackHelp.tsx` para tag no encontrado en `components/guest/FallbackHelp.tsx`
- [x] T029 [US1] Manejar 404 en `app/(guest)/t/[tagSlug]/page.tsx` renderizando FallbackHelp cuando slug inválido

### Cliente analítica y verificación

- [x] T030 [US1] Crear hook `useTouchTracking` que llama `/api/events/touch` con fingerprint en `lib/analytics/client-track.ts`
- [x] T031 [US1] Integrar `navigator.sendBeacon` fallback en `lib/analytics/client-track.ts` para registro al cerrar página
- [x] T032 [US1] Verificar tests T019–T020 pasan en verde ejecutando `npm run test`
- [x] T033 [US1] E2E Playwright flujo básico `/t/caribe-lobby` carga hub en `tests/e2e/guest-nfc-flow.spec.ts`
- [x] T034 [US1] Validar manualmente SC-001: hub visible <3s en DevTools mobile — documentar resultado en commit message o nota de PR

**Checkpoint M1**: US-1 completa · primer MVP desplegable (solo hub + toques)

---

## M2 — Destinos + TagMétricas base (US-2, US-6)

**Objetivo de salida**: Huésped navega destinos con tracking; operaciones ve toques/día y horas pico en dashboard.

**Dependencias**: M1 completo

**Independent Test**: Click menú → `destination_visits`; dashboard muestra datos de prueba

### Testing

- [x] T035 [P] [US2] Contract test `DestinationVisitRequest` en `tests/contract/destination-event.test.ts`
- [x] T036 [P] [US6] Contract test respuesta `MetricsSummary` en `tests/contract/metrics-summary.test.ts`

### Destinos (US-2)

- [x] T037 [US2] Implementar `recordDestinationVisit` en `lib/analytics/track.ts`
- [x] T038 [US2] Crear `POST /api/events/destination` en `app/api/events/destination/route.ts`
- [x] T039 [US2] Añadir tracking onClick en `components/guest/DestinationCard.tsx` llamando destination API con `touchEventId`
- [x] T040 [US2] Manejar destinos externos (abrir en nueva pestaña) vs internos en `components/guest/GuestHub.tsx`
- [x] T041 [US2] Mostrar estado de error útil si URL destino falla (toast o inline) en `components/guest/GuestHub.tsx`

### TagMétricas dashboard parcial (US-6)

- [x] T042 [US6] Implementar query agregaciones en `lib/analytics/metrics.ts` usando vistas SQL
- [x] T043 [US6] Crear `GET /api/metrics/summary` protegido en `app/api/metrics/summary/route.ts` (auth placeholder hasta M3)
- [x] T044 [P] [US6] Crear `components/admin/TouchChart.tsx` con recharts para toques diarios en `components/admin/TouchChart.tsx`
- [x] T045 [P] [US6] Crear `components/admin/DestinationBreakdown.tsx` para % destinos en `components/admin/DestinationBreakdown.tsx`
- [x] T046 [US6] Crear página provisional `app/(admin)/dashboard/page.tsx` consumiendo metrics API (protección básica temporal)

**Checkpoint M2**: Destinos medidos · dashboard muestra toques y horas

---

## M3 — Admin contenido (US-4, US-7)

**Objetivo de salida**: Staff autenticado edita destinos y KB; admin CRUD tags/venues; cambios visibles en hub ≤5 min.

**Dependencias**: M2 completo (métricas requieren auth real)

**Independent Test**: Staff cambia URL menú → hub refleja cambio tras guardar + revalidate

### Auth y layout admin

- [x] T047 [US4] Crear página login en `app/login/page.tsx` con InsForge Auth (email/password)
- [x] T048 [US4] Implementar `lib/auth/session.ts` con helpers `getSession`, `requireStaff`, `requireAdmin`
- [x] T049 [US7] Crear layout protegido con sidebar en `app/(admin)/layout.tsx` redirigiendo a login si no autenticado
- [x] T050 [US7] Crear `GET /api/admin/me` en `app/api/admin/me/route.ts` retornando perfil y venue

### CRUD tags y venues (US-7)

- [x] T051 [P] [US7] Crear `components/admin/TagForm.tsx` para crear/editar tags en `components/admin/TagForm.tsx`
- [x] T052 [US7] Crear página listado tags en `app/(admin)/tags/page.tsx` con acciones activar/desactivar
- [x] T053 [US7] Implementar `GET|POST /api/admin/tags` en `app/api/admin/tags/route.ts`
- [x] T054 [US7] Implementar `PATCH /api/admin/tags/[id]` en `app/api/admin/tags/[id]/route.ts`

### Gestión contenido (US-4)

- [x] T055 [US4] Crear editor destinos JSON visual en `app/(admin)/content/page.tsx` usando `components/admin/DestinationEditor.tsx`
- [x] T056 [US4] Implementar `GET|PUT /api/admin/experience/[id]` en `app/api/admin/experience/[id]/route.ts` con validación Zod
- [x] T057 [US4] Registrar cambios en `content_audit_log` en cada PUT de `app/api/admin/experience/[id]/route.ts`
- [x] T058 [US4] Llamar `revalidatePath('/t/[tagSlug]')` on-demand al guardar contenido en `app/api/admin/experience/[id]/route.ts`
- [x] T059 [US4] Proteger `GET /api/metrics/summary` con `requireStaff` en `app/api/metrics/summary/route.ts` (reemplazar placeholder M2)
- [x] T060 [US7] Conectar dashboard definitivo en `app/(admin)/dashboard/page.tsx` con auth y filtros venue/fecha

**Checkpoint M3**: Staff edita contenido · admin gestiona tags · SC-003 verificable

---

## M4 — Contexto habitación (US-2 ext.)

**Objetivo de salida**: Tag `caribe-room-412` muestra banner habitación; copy y metadata contextualizados; SC-010 pasable.

**Dependencias**: M1 completo; recomendado tras M3 (contenido editable por zona)

**Independent Test**: `/t/caribe-room-412` muestra "Habitación 412"; `touch_events` join tiene `room_number`

### Implementación

- [x] T061 [P] [US2] Crear `components/guest/RoomContextBanner.tsx` mostrando habitación/zona en `components/guest/RoomContextBanner.tsx`
- [x] T062 [US2] Integrar RoomContextBanner en `components/guest/GuestHub.tsx` cuando `tag.zone === 'room'`
- [x] T063 [US2] Personalizar `welcomeMessage` por zona en seed y permitir edición por tag en `app/(admin)/content/page.tsx`
- [x] T064 [US2] Añadir copy específico habitación (servicios a la habitación) en `experience_configs.destinations` del tag room en seed `scripts/seed-hotel-caribe.ts`
- [x] T065 [US2] Pasar `roomNumber` y `zone` al payload AVEX-ready en `lib/tags/resolve-tag.ts`
- [x] T066 [US2] E2E test contexto habitación en `tests/e2e/room-context.spec.ts` verificando banner visible
- [x] T067 [US2] Verificar SC-010: 100% tags room piloto resuelven contexto en prueba manual documentada
- [x] T068 [US2] Documentar en `app/(admin)/tags/page.tsx` UI el campo `roomNumber` con ayuda para staff

**Checkpoint M4**: Identificación ligera Q3=B operativa sin PMS

---

## M5 — AVEX conversacional (US-3)

**Objetivo de salida**: Chat AVEX con streaming SSE, RAG-lite desde KB, guardrails anti-transacción, derivación a humano.

**Dependencias**: M4 recomendado (contexto habitación); M3 para KB editable (T070 puede usar seed KB hasta entonces)

**Independent Test**: Pregunta horario restaurante → respuesta KB; pedir reserva → redirect sin confirmación

### Testing

- [x] T069 [P] [US3] Contract test payload/response SSE en `tests/contract/avex-chat.test.ts`
- [x] T070 [P] [US3] Unit test guardrails intención transaccional en `tests/unit/avex-guardrails.test.ts`

### Backend AVEX

- [x] T071 [US3] Implementar `buildAvexPrompt(venue, tag, knowledge)` en `lib/avex/build-prompt.ts` con restricciones no-transaccional
- [x] T072 [US3] Implementar detección intención y derivación en `lib/avex/guardrails.ts`
- [x] T073 [US3] Implementar streaming Model Gateway en `lib/avex/stream-chat.ts` via InsForge AI endpoint
- [x] T074 [US3] Crear `POST /api/avex/chat` SSE en `app/api/avex/chat/route.ts` con rate limit 20 msg/hora
- [x] T075 [US3] Persistir `avex_sessions` y `avex_messages` en `app/api/avex/chat/route.ts`

### Frontend AVEX

- [x] T076 [P] [US3] Crear `components/avex/AvexMessage.tsx` burbuja mensaje en `components/avex/AvexMessage.tsx`
- [x] T077 [P] [US3] Crear `components/avex/AvexEscalation.tsx` con tel/WhatsApp venue en `components/avex/AvexEscalation.tsx`
- [x] T078 [US3] Crear `components/avex/AvexChat.tsx` con streaming SSE y sessionToken localStorage en `components/avex/AvexChat.tsx`
- [x] T079 [US3] Integrar AvexChat en `components/guest/GuestHub.tsx` cuando `experience.avexEnabled`
- [x] T080 [US3] Registrar `destination_visit` type `avex` al abrir chat en `components/avex/AvexChat.tsx`

### Knowledge admin (si M3 pendiente parcial)

- [x] T081 [US3] Crear `components/admin/KnowledgeEditor.tsx` y página `app/(admin)/knowledge/page.tsx` con CRUD `knowledge_entries`
- [x] T082 [US3] Ejecutar batería 20 preguntas de `quickstart.md` Escenario 5 y documentar % acierto para SC-009

**Checkpoint M5**: AVEX conversacional Q1=B operativo

---

## M6 — Piloto hardening (US-5, US-6, Polish)

**Objetivo de salida**: Fallback staff, reportes completos, deploy Vercel producción, 3 tags físicos Hotel Caribe, quickstart validado.

**Dependencias**: M2–M5 según feature; mínimo M1+M2+M3+M5 para piloto completo

**Independent Test**: Ejecutar escenarios 1–7 de `quickstart.md` en staging/producción

### Staff fallback (US-5)

- [x] T083 [US5] Implementar `GET /api/admin/tags/[id]/fallback` en `app/api/admin/tags/[id]/fallback/route.ts`
- [x] T084 [US5] Añadir sección "Ayuda huésped sin NFC" con URL copiable en `app/(admin)/tags/page.tsx`
- [x] T085 [US5] Soportar `channel: staff_assisted` via query param `?assisted=1` en `app/api/events/touch/route.ts`

### Dashboard completo y métricas (US-6)

- [x] T086 [P] [US6] Añadir gráfico device breakdown y country breakdown en `components/admin/MetricsDashboard.tsx`
- [x] T087 [US6] Componer `components/admin/MetricsDashboard.tsx` con filtros tagId y rango fechas
- [x] T088 [US6] Refactorizar `app/(admin)/dashboard/page.tsx` para usar MetricsDashboard completo

### Deploy y validación piloto

- [x] T089 [P] Configurar proyecto Vercel con env vars y `next.config.ts` runtime edge para guest routes en `next.config.ts`
- [x] T090 Configurar dominio piloto o preview y programar 3 tags NFC físicos apuntando a URLs producción (documentar slugs en `README.md`)
- [x] T091 Ejecutar checklist completo `quickstart.md` escenarios 1–7 y registrar resultados en `specs/001-tagme-platform/checklists/pilot-validation.md`
- [x] T092 [P] Revisión seguridad RLS + auth: verificar staff no accede venue ajeno; anon no escribe admin — documentar en `specs/001-tagme-platform/checklists/security-review.md`

**Checkpoint M6**: Piloto Hotel Caribe listo · SC-005 a SC-008 verificables en producción

---

## Dependencies & Execution Order

### Milestone Dependencies

```text
M0 ──► M1 ──► M2 ──┬──► M3 ──┐
                     │         ├──► M5 ──► M6
                     └──► M4 ──┘
```

| Milestone | Depende de | Bloquea |
|-----------|------------|---------|
| M0 | — | M1–M6 |
| M1 | M0 | M2, M4, M5, M6 |
| M2 | M1 | M3, M6 |
| M3 | M2 | M5, M6 |
| M4 | M1 (M3 recomendado) | M5, M6 |
| M5 | M1, M3 (KB), M4 (recomendado) | M6 |
| M6 | M2, M3, M5 mínimo | — |

### User Story → Milestone Map

| Story | Prioridad | Milestone principal |
|-------|-----------|---------------------|
| US-1 Conexión NFC | P1 | M1 |
| US-2 Destinos + habitación | P2 | M2, M4 |
| US-3 AVEX | P3 | M5 |
| US-4 Editar contenido | P2 | M3 |
| US-5 Fallback staff | P3 | M6 |
| US-6 TagMétricas | P2 | M2, M6 |
| US-7 CRUD tags | P3 | M3 |

### Parallel Execution Examples

**M0 burst (tras T004)**:
```bash
# Paralelo: T005 insforge link, T012 types, T013 validators, T016 vitest, T017 playwright
```

**M1 burst (tras T021)**:
```bash
# Paralelo: T024 layout guest, T025 DestinationCard
```

**Post-M2 split team**:
```bash
# Dev A: M3 admin (T047–T060)
# Dev B: M4 habitación (T061–T068)
```

---

## Implementation Strategy

### MVP First — Solo M0 + M1 (34 tareas)

1. Completar M0 (T001–T018)
2. Completar M1 (T019–T034)
3. **STOP y validar**: `/t/caribe-lobby` en móvil, touch en DB
4. Demo interna — promesa NFC cumplida

### MVP Demo Hotel — M0 + M1 + M2 (46 tareas)

1. Añadir M2 para destinos medidos y dashboard básico
2. Demo a Hotel Caribe con métricas en vivo

### Piloto Completo — M0 through M6 (92 tareas)

1. Secuencial: M0 → M1 → M2
2. Paralelo: M3 + M4
3. M5 AVEX → M6 hardening + deploy

### Criterio de done por tarea

Cada tarea se considera completa cuando:

- El archivo/ruta indicado existe y compila (`npm run build` sin errores nuevos)
- La verificación descrita pasa (test verde, comportamiento manual, o query DB)
- Commit convencional en rama `001-tagme-platform` (ej. `feat(guest): add NFC hub page`)

---

## Notes

- Rutas y archivos relativos a **raíz del repo** `speckit-tagme-test`
- `[P]` = paralelizable sin conflicto de archivos ni dependencias incompletas
- Constitución TagMe v1.1.0: calidad pragmática — tests en M1, M2, M5 (puntos de alto riesgo), no TDD exhaustivo en cada tarea
- No implementar PMS, sensores IoT, ni transacciones AVEX — fuera de scope spec
- Tras M1, se puede desplegar preview en Vercel para pruebas NFC físicas tempranas
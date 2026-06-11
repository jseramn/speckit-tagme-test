---
description: "Lista de tareas — Preparación Demo Hotel Caribe (sin nuevas funcionalidades)"
---

# Tasks: Preparación de Demo para el Hotel

**Input**: [plan.md](./plan.md) | [spec.md](./spec.md) | [research.md](./research.md) | [data-model.md](./data-model.md) | [quickstart.md](./quickstart.md)

**Prerequisites**: Fase 3 M0–M6 completa; tests Vitest + Playwright estables; rama `demo/preparacion-piloto`

**Organización**: Fases por prioridad de demo (P0 → P1 → P2). Trazabilidad a flujos del guion (`US1`–`US5`).

**Leyenda**:
- `[Prioridad: P0]` — Imprescindible antes del ensayo general
- `[Prioridad: P1]` — Recomendado; mejora percepción
- `[Prioridad: P2]` — Verificación simple; solo si hay tiempo o fallo en ensayo
- `[P]` — Paralelizable (archivos distintos, sin dependencias pendientes)

---

## Phase 1: Setup — Línea base

**Objetivo**: Confirmar que el punto de partida es estable antes de tocar datos o UI.

**Verificación**: `npm run test` y E2E P1 verdes en el commit actual.

- [ ] T001 [Prioridad: P0] Verificar `.env.local` con `INSFORGE_URL`, `INSFORGE_SERVICE_KEY`, `NEXT_PUBLIC_APP_URL` documentado en notas internas del facilitador (no commitear secretos)

- [ ] T002 [Prioridad: P0] Ejecutar línea base de tests en repo root: `npm run test` + `npm run test:e2e -- tests/e2e/staff-nfc-feedback.spec.ts tests/e2e/room-capture.spec.ts tests/e2e/staff-scorecard.spec.ts` — registrar commit SHA si pasa

---

## Phase 2: P0 — Datos demo y micro-fixes bloqueantes

**Objetivo**: Bandeja con incidencias, scorecards sin artefactos dev, un solo comando de preparación.

**⚠️ CRITICAL**: Completar esta fase antes del smoke manual (Phase 6).

### Incidencias demo (US2)

- [ ] T003 [Prioridad: P0] [US2] Crear `scripts/seed-demo-incidents.ts` idempotente (`seed_tag: seed-demo-hotel-prep`) con 3 incidencias realistas: `abierta` HK "Faltan toallas en habitación 412", `en_progreso` Mantenimiento "Aire acondicionado con ruido irregular en 408", `abierta` Ruido "Ruido de obra en pasillo piso 4" — usar categorías existentes de `scripts/seed-hotel-caribe-staff.ts` y `guest_stay` activo del venue

- [ ] T004 [Prioridad: P0] [US2] Registrar script en `package.json`: `"seed:demo-incidents": "tsx scripts/seed-demo-incidents.ts"` y verificar ejecución local sin duplicar registros en segunda corrida

### Scorecards sin artefacto dev (US4)

- [ ] T005 [Prioridad: P0] [US4] Reemplazar etiqueta `(TR-07)` por texto "Sin turno asignado" en `components/supervisor/ScorecardDrillDown.tsx` (rama `shiftId === "unassigned"`)

### Comando unificado seed (transversal)

- [ ] T006 [Prioridad: P0] Crear `scripts/seed-demo-all.ts` que ejecute en orden con logs: `seed-hotel-caribe.ts` → `seed-hotel-caribe-staff.ts` → `seed-pilot-users.ts` → `seed-scorecard-feedbacks.ts` → `seed-demo-incidents.ts` — reutilizar `scripts/lib/seed-env.ts`

- [ ] T007 [Prioridad: P0] Registrar en `package.json`: `"seed:demo": "tsx scripts/seed-demo-all.ts"` y documentar uso en `specs/demo-hotel-prep/quickstart.md` § Paso 0

### Corrección slug canónico (documentación)

- [ ] T008 [Prioridad: P0] Corregir slug `caribe-staff-carlos-r` → `caribe-staff-carlos-p` (Housekeeping, no F&B) en `specs/demo-hotel-prep/spec.md` y alinear cualquier referencia en `specs/demo-hotel-prep/research.md` / `data-model.md` si contradice el seed en `scripts/seed-hotel-caribe-staff.ts`

**Checkpoint P0**: `npm run seed:demo` termina sin error; `/incidents` muestra ≥2 incidencias; scorecards sin `(TR-07)`.

---

## Phase 3: P1 — Pulido perceptivo y materiales de demo

**Objetivo**: Datos y documentación que aumentan credibilidad ante el hotel.

### Comentarios realistas (US4)

- [ ] T009 [P] [Prioridad: P1] [US4] Sustituir comentarios técnicos en `scripts/seed-scorecard-feedbacks.ts` por textos realistas en español (rotar 4 frases del plan §2.6); mantener `seed_tag` para idempotencia

- [ ] T010 [P] [Prioridad: P1] [US4] Alternativa si seed scorecard ya ejecutado: crear `scripts/seed-demo-curate.ts` que actualice `feedback_entries` con `seed_tag: seed-f3-scorecard-feedbacks` — registrar `"seed:demo-curate"` en `package.json` e incluir en `scripts/seed-demo-all.ts` como paso final opcional

### Hoja URLs / QR (transversal)

- [ ] T011 [Prioridad: P1] Crear `specs/demo-hotel-prep/guides/demo-urls.md` con URLs absolutas (`{NEXT_PUBLIC_APP_URL}`), credenciales piloto, slugs canónicos (`maria-g`, `carlos-p`, `room-412`), e instrucción para generar QR (enlace a herramienta externa o nota "imprimir QR desde favoritos")

- [ ] T012 [Prioridad: P1] Añadir enlace a `guides/demo-urls.md` desde `specs/demo-hotel-prep/quickstart.md` sección Fallbacks

**Checkpoint P1**: Comentarios seed no contienen "Seed scorecard"; hoja URLs lista para imprimir.

---

## Phase 4: P1 — Smoke manual flujos P1 (US1–US4)

**Objetivo**: Validar guion completo según `quickstart.md` antes del ensayo general.

**Independent Test**: Cada escenario D1–D4 pasa sin intervención manual en BD.

- [ ] T013 [Prioridad: P1] [US1] Smoke D1 — Staff NFC feedback: `{APP_URL}/s/caribe-staff-maria-g` → Feedback 5★ → confirmación ≤3 s (registrar en checklist mental o nota)

- [ ] T014 [Prioridad: P1] [US2] Smoke D2 — Staff incidencia → bandeja: nueva sesión `maria-g` → incidencia HK → login `supervisor.caribe@tagme.pilot` → `/incidents` visible ≤60 s → "Tomar en progreso"

- [ ] T015 [Prioridad: P1] [US3] Smoke D3 — Room capture: incógnito `{APP_URL}/capture/room/caribe-room-412` → contexto habitación → envío incidencia o feedback OK

- [ ] T016 [Prioridad: P1] [US4] Smoke D4 — Scorecards: supervisor → `/scorecards` → Housekeeping 30d → drill-down María G. → NPS visible (no "Datos insuficientes")

- [ ] T017 [Prioridad: P1] Ejecutar `npm run audit:orphans` y `npx tsx scripts/seed-pilot-users.ts --verify-only` — ambos deben pasar

---

## Phase 5: P2 — Verificaciones opcionales y contingencias

**Objetivo**: Solo ejecutar si el ensayo revela un gap o hay tiempo extra. **No bloquean** demo ready si P0+P1 smoke pasan.

- [ ] T018 [Prioridad: P2] [US5] Smoke D5 opcional — Recepción: login `reception.caribe@tagme.pilot` → `/reception` carga y genera estadía formal sin error

- [ ] T019 [Prioridad: P2] Cronometrar guion `plan.md` §4.1 una vez; si >60 min, recortar acto 5 (recepción) a narración

- [ ] T020 [Prioridad: P2] [US2] Si incidencia en vivo tarda >60 s en bandeja durante ensayo: evaluar polling 15 s en `components/supervisor/IncidentInbox.tsx` — **solo implementar si T014 falla**

- [ ] T021 [Prioridad: P2] [US4] Si scorecards >3 s en red objetivo: documentar en notas; **no** optimizar vistas SQL salvo medición en ensayo

- [ ] T022 [Prioridad: P2] Si smoke incidencias falla repetidamente: añadir E2E mínimo en `tests/e2e/supervisor-incidents.spec.ts` (solo entonces)

---

## Phase 6: Ensayo general — Demo Ready

**Objetivo**: Cumplir criterios `plan.md` §6 y `spec.md` READY-01–READY-08.

- [ ] T023 [Prioridad: P0] Ejecutar `npm run seed:demo` en entorno de demo (InsForge piloto) ≥24 h antes de la presentación

- [ ] T024 [Prioridad: P0] Ensayo general completo (guion §4.1) — **1ª corrida** cronometrada; marcar ítems §6.1–§6.3 de `plan.md`

- [ ] T025 [Prioridad: P0] Ensayo general — **2ª corrida consecutiva** sin fallo bloqueante en flujos P1 (criterio READY-08)

- [ ] T026 [Prioridad: P1] Preparar sala: iPhone + Android con favoritos/QR de `guides/demo-urls.md`; laptop con sesión supervisor precargada; hotspot de respaldo probado

---

## Dependencies & Execution Order

### Grafo de dependencias

```text
T001–T002 (baseline)
    ↓
T003 → T004 (incidencias)
T005 (TR-07, paralelo con T003)
T006 → T007 (depende T003 + seeds existentes)
T008 (docs, paralelo)
    ↓
T009–T012 (P1 polish, opcional tras P0)
    ↓
T013–T017 (smoke, requiere T003–T007)
    ↓
T023–T025 (ensayo, requiere smoke OK)
T018–T022 (P2, condicionales)
T026 (día D)
```

### Orden de implementación recomendado

| Orden | Tareas | Tiempo est. | Por qué primero |
|-------|--------|-------------|-----------------|
| **1** | T001–T002 | 30 min | Confirma baseline estable |
| **2** | T005 | 15 min | Fix más rápido; impacto visual inmediato |
| **3** | T003–T004 | 1.5 h | Desbloquea bandeja demo (mayor brecha perceptiva) |
| **4** | T006–T007 | 45 min | Unifica preparación; evita olvidos |
| **5** | T008 | 15 min | Evita confusión facilitador con slug incorrecto |
| **6** | T023 | 15 min | Aplicar seeds en entorno demo |
| **7** | T013–T017 | 1 h | Smoke manual P1 |
| **8** | T009–T012 | 1 h | Pulido P1 si tiempo |
| **9** | T024–T026 | 2 h | Ensayo + preparación sala |
| **10** | T018–T022 | según necesidad | Solo contingencias |

**MVP demo-ready (mínimo absoluto)**: T001 → T002 → T005 → T003 → T004 → T006 → T007 → T008 → T023 → T013–T016 → T024–T025.

---

## Parallel Execution Examples

### Batch A — Tras T002 (inicio P0 en paralelo)

```bash
# Developer / agent A
T005  # ScorecardDrillDown.tsx

# Developer / agent B
T003 → T004  # seed-demo-incidents.ts + package.json
```

### Batch B — Tras T007 (P1 en paralelo)

```bash
T009  # seed-scorecard-feedbacks.ts
T011  # demo-urls.md
T008  # spec slug fix (si no hecho)
```

### Batch C — Smoke (secuencial recomendado)

```bash
T013 → T014 → T015 → T016 → T017
```

---

## Resumen por prioridad

| Prioridad | Cantidad | IDs | Esfuerzo aprox. |
|-----------|----------|-----|-----------------|
| **P0** | 14 | T001–T008, T023–T025 | **5–7 h** |
| **P1** | 10 | T009–T017, T026 | **3–4 h** |
| **P2** | 5 | T018–T022 | **0–2 h** (condicional) |
| **Total** | **26** | T001–T026 | **8–13 h** |

### Desglose por flujo (user story)

| Story | Flujo | Tareas | P0 |
|-------|-------|--------|-----|
| US1 | Staff NFC → Feedback | T013 | — |
| US2 | Incidencia → Bandeja | T003, T004, T014, T020, T022 | T003, T004 |
| US3 | Room NFC | T015 | — |
| US4 | Scorecards | T005, T009, T010, T016, T021 | T005 |
| US5 | Recepción (opcional) | T018 | — |
| Transversal | Seeds, docs, ensayo | T006–T008, T011–T012, T017, T023–T026 | T006–T008, T023–T025 |

---

## Estimación total

| Escenario | Alcance | Esfuerzo |
|-----------|---------|----------|
| **Mínimo demo-ready** | Solo P0 + smoke + 2 ensayos | **~6–8 h** |
| **Recomendado** | P0 + P1 + ensayo + materiales QR | **~10–12 h** |
| **Con contingencias P2** | + fixes reactivos del ensayo | **+0–2 h** |

**Calendario sugerido** (1 persona):
- **Día A (4 h)**: T001–T008 + T023
- **Día B (3 h)**: T009–T017 + T011–T012
- **Día C (2 h)**: T024–T026 (+ T018–T022 si aplica)

---

## Implementation Strategy

1. **No nuevas funcionalidades** — si una tarea implica endpoint, tabla o flujo nuevo, detener y enmendar spec.
2. **P0 primero** — la demo puede proceder sin P1, pero no sin T003–T007.
3. **Probar tras cada tarea P0** — `npm run seed:demo` y smoke parcial D2/D4.
4. **Congelar código** tras T025 — solo hotfixes P2 permitidos antes del día de la demo.
5. **Entorno** — ejecutar seeds contra InsForge piloto; presentar desde URL producción Vercel.

---

## Notes

- Protagonista guion: **María G.** (`caribe-staff-maria-g`). **Carlos P.** solo backup/E2E.
- Supervisor piloto (HK): incidencias demo HK visibles; Mantenimiento precargada visible con login **manager**.
- Password default: `PilotCaribe2026!` — verificar con `--verify-only` antes del día D.
- No ejecutar E2E en paralelo con ensayo manual (colisión de slugs NFC).
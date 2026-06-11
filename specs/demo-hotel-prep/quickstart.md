# Quickstart: Ensayo Demo Hotel Caribe

**Fecha**: 2026-06-11 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Guía de smoke tests y ensayo general antes de la presentación al hotel. No incluye desarrollo de producto.

---

## Prerrequisitos

| Requisito | Verificación |
|-----------|--------------|
| Fase 3 desplegada | URL pública responde |
| `.env.local` completo | `INSFORGE_*`, `NEXT_PUBLIC_APP_URL` |
| Seeds aplicados | `npm run seed:demo` (o cadena manual §2 plan) |
| Tests verdes en commit desplegado | `npm run test:e2e` flujos P1 |
| Dispositivos | iPhone Safari + Android + laptop |

---

## Paso 0 — Preparar datos (T-48h)

```bash
npm run seed
npm run seed:staff
npm run seed:pilot-users
npm run seed:scorecards
# Tras implementar:
# npm run seed:demo-incidents
# npm run seed:demo

npx tsx scripts/seed-pilot-users.ts --verify-only
npm run audit:orphans
```

**Esperado**: 0 huérfanos; logins piloto OK.

---

## Escenario D1 — Staff NFC → Feedback (P1)

1. Móvil incógnito → `{APP_URL}/s/caribe-staff-maria-g`
2. **Esperado ≤3 s**: nombre "María G.", countdown 5:00, botones Feedback/Incidencia
3. Feedback → 5 estrellas → enviar
4. **Esperado**: "¡Gracias por tu opinión!"

**Pass**: confirmación visible; no error 500.

---

## Escenario D2 — Staff NFC → Incidencia → Bandeja (P1)

1. Nueva sesión → `/s/caribe-staff-maria-g`
2. Incidencia → categoría HK/Limpieza → "Faltan toallas en habitación 412"
3. Laptop supervisor → login → `/incidents`
4. **Esperado ≤60 s**: incidencia `abierta` visible
5. Clic "Tomar en progreso" → estado `en_progreso`

**Pass**: workflow sin error; origen muestra staff o NFC.

---

## Escenario D3 — Room NFC (P1)

1. Incógnito → `{APP_URL}/capture/room/caribe-room-412`
2. **Esperado**: "Habitación 412" / banner room
3. Incidencia → enviar
4. **Esperado**: confirmación incidencia

**Pass**: `origin_type=room_nfc` verificable en bandeja (manager si depto no HK).

---

## Escenario D4 — Scorecards (P1)

1. Supervisor → `/scorecards`
2. Departamento **Housekeeping** → periodo 30d
3. **Esperado**: NPS departamento visible; ranking incluye María G.
4. Clic María G. → **Esperado**: NPS empleado (no "Datos insuficientes")

**Pass**: n≥6; sin etiqueta `(TR-07)` visible.

---

## Escenario D5 — Recepción (P2, opcional)

1. Login recepción → `/reception`
2. Generar estadía formal
3. **Esperado**: flujo completa sin error

---

## Ensayo general (día D-1)

1. Cronometrar guion completo [plan.md §4.1](./plan.md#41-guion-ordenado-45-60-min)
2. Repetir **2 veces consecutivas** sin fallo P1
3. Marcar checklist [plan.md §6](./plan.md#6-criterios-de-demo-ready)

---

## Comandos automatizados pre-ensayo

```bash
npm run test -- tests/contract/003-staff/supervisor-incidents.test.ts
npm run test:e2e -- tests/e2e/staff-nfc-feedback.spec.ts tests/e2e/room-capture.spec.ts tests/e2e/staff-scorecard.spec.ts
```

---

## Fallbacks en sala

| Fallo | Acción |
|-------|--------|
| NFC no abre | QR con URL `/s/caribe-staff-maria-g` |
| WiFi caído | Hotspot 4G |
| Sesión expirada | Reabrir URL staff |
| Bandeja vacía | Botón "Actualizar"; incidencias seed precargadas |
| Scorecard vacío | Re-ejecutar `npm run seed:scorecards` |

---

## Referencias

- [plan.md](./plan.md) — guion y riesgos
- [data-model.md](./data-model.md) — slugs y usuarios
- [specs/003-staff/guides/capacitacion-piso-caribe.md](../003-staff/guides/capacitacion-piso-caribe.md) — post-demo piloto
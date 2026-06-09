# Quickstart: Validación TagMe MVP

**Fecha**: 2026-06-08 | **Plan**: [plan.md](./plan.md) | **Piloto**: Hotel Caribe

Guía para validar el MVP end-to-end tras implementación. No incluye código de implementación.

---

## Prerrequisitos

| Requisito | Verificación |
|-----------|--------------|
| Proyecto InsForge creado y linked | `npx @insforge/cli link` |
| Schema migrado | Tablas en [data-model.md](./data-model.md) |
| Seed Hotel Caribe | 3 tags: `caribe-lobby`, `caribe-restaurant`, `caribe-room-412` |
| Next.js en Vercel (o local) | `npm run dev` → `http://localhost:3000` |
| Variables de entorno | `INSFORGE_URL`, keys, `NEXT_PUBLIC_APP_URL` |
| Tag NFC de prueba (opcional) | Programado con URL `/t/caribe-lobby` |

---

## Escenario 1 — Flujo NFC huésped (US-1, SC-001)

**Objetivo**: Conexión en <3s sin app.

1. Abrir en móvil (o DevTools mobile): `https://{APP_URL}/t/caribe-lobby`
2. **Esperado**: Hub carga con nombre Hotel Caribe, destinos visibles
3. Verificar en InsForge: nueva fila en `touch_events` con `channel=nfc` o `url_direct`
4. Repetir en <60s → segundo evento `deduplicated=true` o sin duplicado según regla

**Pass**: Hub visible <3s en 9/10 intentos.

---

## Escenario 2 — Contexto habitación (US-2 esc.3, SC-010)

1. Abrir `https://{APP_URL}/t/caribe-room-412`
2. **Esperado**: Banner "Habitación 412" (o equivalente)
3. Abrir AVEX (si M5 completo) → preguntar sobre servicio a habitación
4. **Esperado**: Respuesta menciona contexto habitación si está en KB

**Pass**: `room_number=412` en `touch_events` join `nfc_tags`.

---

## Escenario 3 — Destinos y TagMétricas (US-2, US-6, SC-004)

1. Desde hub lobby, tocar "Menú Digital"
2. **Esperado**: Navegación a URL menú; `destination_visits` type=`menu`
3. Repetir para Google y TripAdvisor si configurados
4. Login admin → `/dashboard`
5. **Esperado**: Gráficos toques/día, horas pico, % destinos

**Pass**: Dashboard refleja eventos de pasos 1–3.

---

## Escenario 4 — Staff edita contenido (US-4, SC-003)

1. Login staff Hotel Caribe
2. Cambiar URL destino principal en `/content`
3. Guardar → esperar ≤5 min (o revalidate inmediato)
4. Abrir `/t/caribe-lobby` en ventana incógnito
5. **Esperado**: Nuevo destino visible

**Pass**: Cambio reflejado; entrada en `content_audit_log`.

---

## Escenario 5 — AVEX conversacional (US-3, SC-009)

Preguntas de prueba (≥20 para SC-009):

| # | Pregunta | Respuesta esperada |
|---|----------|-------------------|
| 1 | ¿A qué hora abre el restaurante? | Horario de KB |
| 2 | ¿Hay wifi gratis? | Política de KB o derivación |
| 3 | Quiero reservar mesa para 8pm | Redirect/enlace reservas — **no** confirmación |
| 4 | ¿Cuál es la política de mascotas? | KB o derivación si no existe |
| 5 | ¿Pueden enviar toallas a mi habitación? | Contexto room + KB room_service |

**Pass**: ≥85% respuestas correctas o derivación apropiada.

---

## Escenario 6 — Fallback sin NFC (US-5)

1. Admin → tag `caribe-lobby` → copiar URL fallback
2. Abrir URL en desktop sin simular NFC
3. **Esperado**: Misma experiencia; `channel=url_direct`

---

## Escenario 7 — Piloto producción (SC-005)

| Check | Criterio |
|-------|----------|
| Tags activos | ≥3 en Hotel Caribe físico |
| Duración | 30 días datos reales |
| Disponibilidad | Sin downtime >1h en horario operativo |

---

## Comandos útiles (desarrollo)

```bash
# Instalar y correr local
npm install
npm run dev

# Tests
npm run test          # Vitest unit + contract
npm run test:e2e      # Playwright

# InsForge
npx @insforge/cli link --project-id <id>

# Deploy
vercel --prod
```

---

## Referencias cruzadas

| Artefacto | Uso en validación |
|-----------|-------------------|
| [contracts/guest-experience.md](./contracts/guest-experience.md) | Payload hub |
| [contracts/analytics-events.md](./contracts/analytics-events.md) | Eventos TagMétricas |
| [contracts/avex-chat.md](./contracts/avex-chat.md) | SSE AVEX |
| [contracts/admin-api.md](./contracts/admin-api.md) | Panel staff |
| [spec.md](./spec.md) | Criterios SC-001–SC-010 |

---

## Siguiente paso

Ejecutar `/speckit.tasks` para descomponer milestones M0–M6 en tareas accionables.
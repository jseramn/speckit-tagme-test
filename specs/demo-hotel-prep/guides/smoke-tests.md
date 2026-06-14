# Smoke Tests Manuales — Demo Hotel Caribe (D1–D4)

**Tareas**: T013, T014, T015, T016 | **Fecha**: 2026-06-12  
**Rama**: `demo/preparacion-piloto` | **Duración estimada**: ~45 min

Guía autocontenida para validar los 4 flujos P1 antes del ensayo general (T024).  
Reemplaza `{APP_URL}` por el valor de `NEXT_PUBLIC_APP_URL` (producción piloto o `http://localhost:3000` en local).

---

## Preparación previa

### Checklist antes de empezar

| # | Requisito | Cómo verificar |
|---|-----------|----------------|
| 1 | Seeds aplicados | T023 completado: `npm run seed:demo` sin errores |
| 2 | Auditoría TR-09 | `npm run audit:orphans` → **PASS** (0 huérfanos) |
| 3 | App accesible | `{APP_URL}` carga sin error 500 |
| 4 | Dispositivos listos | Móvil (incógnito) + laptop con navegador |
| 5 | URLs en favoritos | maria-g, room-412, `/login`, `/incidents`, `/scorecards` |

### Credenciales piloto (seed)

| Rol | Email | Contraseña | Rutas |
|-----|-------|------------|-------|
| Supervisor HK | `supervisor.caribe@tagme.pilot` | `PilotCaribe2026!` | `/incidents`, `/scorecards` |
| Manager | `manager.caribe@tagme.pilot` | `PilotCaribe2026!` | fallback bandeja global |
| Recepción | `reception.caribe@tagme.pilot` | `PilotCaribe2026!` | `/reception` |

### URLs canónicas

| Recurso | URL |
|---------|-----|
| Staff NFC (María G.) | `{APP_URL}/s/caribe-staff-maria-g` |
| Room NFC (hab. 412) | `{APP_URL}/capture/room/caribe-room-412` |
| Login | `{APP_URL}/login` |

### Orden recomendado

Ejecutar **D1 → D2 → D3 → D4** en secuencia. D2 requiere una **nueva sesión** (no reutilizar la de D1).

> **Nota**: No ejecutar `npm run test:e2e` en paralelo — los tests E2E consumen los mismos slugs NFC.

---

## D1 — Staff NFC → Feedback (T013)

**Usuario**: Huésped (sin login) · **Dispositivo**: móvil en ventana incógnito  
**Protagonista**: María G. (`caribe-staff-maria-g`)

### Pasos

| # | Acción | Qué observar |
|---|--------|--------------|
| 1 | Abrir `{APP_URL}/s/caribe-staff-maria-g` | Redirect a `/capture/{token}` en **≤3 s** |
| 2 | Verificar pantalla de captura | Nombre **"María G."**, rol/depto (Housekeeping), countdown **~5:00** |
| 3 | Confirmar botones visibles | **Feedback** e **Incidencia** habilitados |
| 4 | Tocar **Feedback** | Formulario de calificación (1–5 estrellas) |
| 5 | Seleccionar **5 estrellas** → enviar | Sin spinner prolongado ni error |
| 6 | Leer confirmación | Título **"¡Gracias por tu opinión!"** |

### Criterio de éxito

- Pantalla carga en ≤3 s.
- Confirmación visible; **sin error 500** ni mensaje de sesión expirada.
- Sesión queda cerrada (no se puede enviar otro feedback en la misma URL).

### Si algo falla

| Síntoma | Acción |
|---------|--------|
| Página en blanco / 404 | Verificar `{APP_URL}` y que `seed:demo` creó el slug `caribe-staff-maria-g` |
| "Sesión expiró" al abrir | Reabrir la URL (genera sesión nueva) |
| Error 500 al enviar | Revisar logs Vercel/terminal; re-ejecutar `npm run seed:demo` |
| NFC físico no abre | Usar QR o URL directa (mismo flujo) |

### Resultados esperados

- [ ] Redirect ≤3 s
- [ ] Nombre "María G." + countdown visible
- [ ] Feedback 5★ enviado
- [ ] Confirmación "¡Gracias por tu opinión!"
- [ ] **PASS / FAIL**: ___________

---

## D2 — Staff NFC → Incidencia → Bandeja Supervisor (T014)

**Usuarios**: Huésped (móvil incógnito) + Supervisor HK (laptop)  
**Protagonista**: María G. · **Supervisor**: `supervisor.caribe@tagme.pilot`

### Pasos — Parte A: Captura (móvil)

| # | Acción | Qué observar |
|---|--------|--------------|
| 1 | **Nueva sesión**: abrir `{APP_URL}/s/caribe-staff-maria-g` en incógnito | Pantalla captura con María G. (no reutilizar sesión D1) |
| 2 | Tocar **Incidencia** | Formulario de reporte |
| 3 | Categoría **Limpieza** | Selector muestra categorías del hotel |
| 4 | Descripción: `Faltan toallas en habitación 412` | Mínimo 3 caracteres aceptado |
| 5 | Tocar **Reportar incidencia** | Confirmación: **"Incidencia registrada. El equipo la atenderá lo antes posible."** |

### Pasos — Parte B: Bandeja (laptop)

| # | Acción | Qué observar |
|---|--------|--------------|
| 6 | Ir a `{APP_URL}/login` | Formulario de login |
| 7 | Login `supervisor.caribe@tagme.pilot` / `PilotCaribe2026!` | Redirect a área supervisor |
| 8 | Navegar a `/incidents` | Bandeja carga; contador de abiertas ≥1 |
| 9 | Buscar la incidencia recién creada | Visible en **≤60 s**; estado **abierta** / badge "Nueva" |
| 10 | Verificar origen | Muestra staff/NFC (ej. "María G." o `staff_nfc`) |
| 11 | Clic **Tomar en progreso** | Estado cambia a **en_progreso** sin error |

### Criterio de éxito

- Incidencia capturada con confirmación en móvil.
- Aparece en bandeja del supervisor HK en ≤60 s.
- Botón "Tomar en progreso" funciona; origen muestra staff/NFC.
- Workflow completo sin error 500.

### Si algo falla

| Síntoma | Acción |
|---------|--------|
| Incidencia no aparece en bandeja | Clic **Actualizar** en `/incidents`; esperar 30 s más |
| Bandeja vacía tras 60 s | Verificar categoría **Limpieza** (rutea a Housekeeping, depto del supervisor piloto) |
| Incidencia de Mantenimiento invisible | Usar categoría Limpieza/Ruido con maria-g, o login como **manager** |
| Login falla | Re-ejecutar `npm run seed:pilot-users`; verificar credenciales |
| Error al cambiar estado | Refrescar página; revisar consola del navegador |

### Resultados esperados

- [ ] Incidencia enviada desde NFC maria-g
- [ ] Confirmación "Incidencia registrada…"
- [ ] Visible en `/incidents` ≤60 s
- [ ] Origen staff/NFC visible
- [ ] Estado `abierta` → `en_progreso` con un clic
- [ ] **PASS / FAIL**: ___________

---

## D3 — Room NFC (habitación 412) (T015)

**Usuario**: Huésped (sin login) · **Dispositivo**: móvil o laptop en ventana incógnito  
**Tag**: `caribe-room-412`

### Pasos

| # | Acción | Qué observar |
|---|--------|--------------|
| 1 | Abrir `{APP_URL}/capture/room/caribe-room-412` | Sin redirect a login |
| 2 | Verificar contexto habitación | Banner "Su estancia" + **"Bienvenido a la habitación 412"** |
| 3 | Verificar encabezado | **"Habitación 412"** / "Captura desde habitación" |
| 4 | Confirmar botones | **Feedback** e **Incidencia** (variante room) |
| 5 | Tocar **Incidencia** | Formulario sin nombre de staff |
| 6 | Categoría **Limpieza** (o **Ruido**) | Cualquiera válida |
| 7 | Descripción: `Ruido en el pasillo, habitación 412` | Mínimo 3 caracteres |
| 8 | Tocar **Reportar incidencia** | Confirmación de incidencia registrada |

### Criterio de éxito

- Contexto de habitación 412 claro y visible.
- Envío de incidencia (o feedback) exitoso con confirmación.
- Sin error 500; sin pantalla de staff (flujo independiente de `/s/`).

### Si algo falla

| Síntoma | Acción |
|---------|--------|
| 404 / tag no encontrado | Verificar `npm run seed` creó `caribe-room-412` |
| Sin banner de habitación | Revisar que la URL es `/capture/room/` (no `/t/`) |
| Error al enviar | Probar feedback en su lugar (también válido para T015) |
| Verificar en bandeja (opcional) | Limpieza → supervisor HK; Ruido → login **manager** |

### Resultados esperados

- [ ] Contexto "Habitación 412" visible
- [ ] Botones Feedback/Incidencia presentes
- [ ] Incidencia (o feedback) enviado con confirmación
- [ ] Sin error 500
- [ ] **PASS / FAIL**: ___________

---

## D4 — Scorecards (T016)

**Usuario**: Supervisor HK · **Dispositivo**: laptop  
**Login**: `supervisor.caribe@tagme.pilot` / `PilotCaribe2026!`

### Pasos

| # | Acción | Qué observar |
|---|--------|--------------|
| 1 | Login en `{APP_URL}/login` (si no hay sesión activa) | Acceso supervisor OK |
| 2 | Navegar a `/scorecards` | Página carga sin error |
| 3 | Selector departamento → **Housekeeping** | Datos del departamento cargan |
| 4 | Periodo → **30 días** (30d) | Métricas visibles |
| 5 | Verificar NPS departamento | Valor numérico visible (no "Datos insuficientes") |
| 6 | Verificar ranking | Lista incluye **María G.** |
| 7 | Clic en **María G.** (drill-down) | Panel de empleado se expande/carga |
| 8 | Verificar NPS empleado | Valor visible; **n ≥ 6** (no mensaje "Datos insuficientes (n=…)") |
| 9 | Revisar turnos (si aparecen) | Sin etiqueta técnica `(TR-07)` visible |

### Criterio de éxito

- NPS departamento Housekeeping visible en periodo 30d.
- María G. aparece en ranking con NPS empleado calculado (n≥6).
- Sin "Datos insuficientes"; sin artefactos de desarrollo visibles.

### Si algo falla

| Síntoma | Acción |
|---------|--------|
| "Datos insuficientes (n=…)" | Re-ejecutar `npm run seed:demo` (paso `seed:scorecards`) |
| María G. no en ranking | Verificar staff activo en seed; refrescar página |
| Error 403 en scorecards | Confirmar login como supervisor (no recepción) |
| `(TR-07)` visible | Registrar para T009/T010; no bloquea smoke si NPS visible |
| Página no carga | Verificar migraciones `006_staff_scorecard_views` aplicadas |

### Resultados esperados

- [ ] Departamento Housekeeping seleccionado
- [ ] Periodo 30d activo
- [ ] NPS departamento visible
- [ ] María G. en ranking
- [ ] Drill-down: NPS empleado visible (n≥6)
- [ ] Sin "Datos insuficientes"
- [ ] **PASS / FAIL**: ___________

---

## Resumen de ejecución

| Smoke | Flujo | Dispositivo | Usuario | Tiempo ~ |
|-------|-------|-------------|---------|----------|
| **D1** T013 | Staff NFC → Feedback | Móvil incógnito | Huésped | 5 min |
| **D2** T014 | Staff NFC → Incidencia → Bandeja | Móvil + laptop | Huésped + supervisor | 10 min |
| **D3** T015 | Room NFC habitación 412 | Incógnito | Huésped | 5 min |
| **D4** T016 | Scorecards Housekeeping → María G. | Laptop | Supervisor | 10 min |

### Criterio global PASS

Los 4 smokes marcados **PASS** → listo para **T024** (ensayo general cronometrado).

Si alguno falla:

1. Anotar síntoma y paso exacto.
2. Aplicar tabla "Si algo falla" del smoke correspondiente.
3. Re-ejecutar solo el smoke afectado.
4. Si persiste tras 2 intentos → escalar antes de T024.

### Comandos de soporte

```bash
# Re-aplicar datos demo
npm run seed:demo

# Verificar integridad
npm run audit:orphans

# Verificar logins piloto
npx tsx scripts/seed-pilot-users.ts --verify-only

# Tests automatizados (opcional, no durante smoke manual)
npm run test:e2e -- tests/e2e/staff-nfc-feedback.spec.ts tests/e2e/room-capture.spec.ts tests/e2e/staff-scorecard.spec.ts
```

---

## Referencias

- [quickstart.md](../quickstart.md) — escenarios D1–D5 y fallbacks en sala
- [data-model.md](../data-model.md) — slugs, usuarios y seed_tags
- [plan.md](../plan.md) — guion §4.1 y checklist demo-ready §6
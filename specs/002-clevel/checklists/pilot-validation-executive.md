# Checklist de validación piloto — Hotel Caribe (SC-G005)

**Objetivo Constitution §8:** El gerente piloto supervisa experiencia y operación durante **1 semana** usando TagMe como fuente primaria, **sin reportes manuales paralelos** para las señales cubiertas.

**Venue:** Hotel Caribe by Faranda Grand  
**Duración sugerida:** 7 días hábiles (semana 2 del piloto, post-calibración)  
**Responsable:** Gerente General piloto + soporte TagMe

---

## Pre-requisitos (antes de día 1)

- [ ] Migraciones Fase 2 aplicadas (`npm run db:migrate`)
- [ ] Seed Hotel Caribe ejecutado (`npm run seed`) — tags, thresholds, KPIs, usuarios demo
- [ ] Usuarios reales del hotel provisionados en InsForge Auth + `user_profiles`
- [ ] Cron de alertas activo en Vercel (`/api/executive/alerts/evaluate`, cada 5 min)
- [ ] Sesión de capacitación 30 min completada (ver `quickstart.md` §5)
- [ ] GG validó umbrales iniciales en `/executive/settings`

---

## Día a día — señales cubiertas

### Interacciones por zona

| # | Verificación | ✓ / ✗ | Notas |
|---|--------------|-------|-------|
| 1 | Pulso muestra actividad por zona (lobby, room, restaurant) en ≤ 60 s | | |
| 2 | GG identifica pico inesperado sin consultar TagMétricas staff | | |
| 3 | Dashboard Operaciones refleja heatmap horario coherente con operación real | | |

### Derivaciones AVEX

| # | Verificación | ✓ / ✗ | Notas |
|---|--------------|-------|-------|
| 4 | Tasa derivación visible en overview y dashboard Recepción | | |
| 5 | Alerta AVEX se dispara cuando umbral configurado se supera | | |
| 6 | GG puede reconocer alerta y registrar acción en audit log | | |

### Tags inactivos

| # | Verificación | ✓ / ✗ | Notas |
|---|--------------|-------|-------|
| 7 | Tag con 0 toques > 24 h (en horario operativo) genera alerta atención | | |
| 8 | Tag recién creado (< 72 h) NO genera alerta inactividad (gracia CL-10) | | |
| 9 | Tag `is_active=false` genera alerta crítica | | |

### Tendencia semanal

| # | Verificación | ✓ / ✗ | Notas |
|---|--------------|-------|-------|
| 10 | Gráfico tendencia 7d coherente con percepción operativa del hotel | | |
| 11 | Reporte CSV exportable sin error (`/executive/reports`) | | |
| 12 | Reporte indica si muestra < 7 días es insuficiente para tendencias | | |

---

## Roles y permisos (muestra)

| # | Verificación | ✓ / ✗ | Notas |
|---|--------------|-------|-------|
| 13 | GG accede a overview, reportes, settings | | |
| 14 | Gerente F&B solo accede a `/executive/fnb` + alertas de su scope | | |
| 15 | Staff TagMétricas (`/dashboard`) NO accede a rutas `/executive/*` | | |

---

## Configuración y auditoría

| # | Verificación | ✓ / ✗ | Notas |
|---|--------------|-------|-------|
| 16 | Cambio de umbral en settings persiste y aparece en `executive_audit_log` | | |
| 17 | Cambio de meta KPI refleja en dashboard tras recarga | | |
| 18 | Exportación de reporte registra `export_report` en audit log | | |

---

## Criterio de éxito SC-G005 (fin de semana)

Marque **APROBADO** solo si todas las condiciones se cumplen:

- [ ] **A1** — GG usó TagMe ≥ 1 vez/día para revisar pulso o overview
- [ ] **A2** — No se generaron reportes manuales paralelos (Excel/WhatsApp) para las 4 señales cubiertas
- [ ] **A3** — ≥ 80% de alertas críticas fueron reconocidas en < 24 h
- [ ] **A4** — GG reporta que entiende el estado del hotel en ≤ 2 min en overview
- [ ] **A5** — Sin incidentes de seguridad (acceso cruzado venue, PII expuesta)

**Resultado piloto:** ☐ APROBADO · ☐ APROBADO CON OBSERVACIONES · ☐ REQUIERE AJUSTES

### Observaciones

```
(fecha, responsable, notas)
```

---

## Escalación si falla un ítem

| Falla | Acción |
|-------|--------|
| Export CSV error FK audit | Verificar usuario real en auth.users; dev usa `resolveAuditUserId` |
| Alertas no aparecen | Verificar cron + `npm run alerts:evaluate` manual |
| KPIs sin semáforo | Normal en semana 1; verificar `venue_baseline.baseline_ready` |
| Rol incorrecto | Actualizar `user_profiles` en InsForge |

---

*Checklist alineado a Constitution §8 y spec SC-G005. Versión M6 — 2026-06-09.*
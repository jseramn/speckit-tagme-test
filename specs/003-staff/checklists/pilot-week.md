# Checklist semana piloto — Hotel Caribe (T114)

**Métricas**: SC-005, SC-011, SC-012  
**Uso**: marcar diariamente durante la semana piloto

## Día 1 — Go-live

- [ ] ≥12 staff con NFC activo verificado en `/organization/staff`
- [ ] Supervisores con `supervisor_department_assignments` correctos
- [ ] Recepción capacitada (guía [capacitacion-piso-caribe.md](../guides/capacitacion-piso-caribe.md))
- [ ] Prueba NFC en ≥1 iOS + ≥1 Android

## Métricas diarias (capturar en hoja operativa)

| Métrica | Meta SC | D1 | D2 | D3 | D4 | D5 | D6 | D7 |
|---------|---------|----|----|----|----|----|----|-----|
| Aperturas NFC ≤3s (%) | SC-001 | | | | | | | |
| Sesiones expiradas 5 min (%) | SC-002 | | | | | | | |
| Config org sin deploy (min) | SC-011 ≤15 | | | | | | | |
| Registros huérfanos (count) | SC-010 = 0 | | | | | | | |
| Feedback con origen completo (%) | SC-012 | | | | | | | |
| Incidencias en bandeja ≤60s (%) | SC-007 | | | | | | | |

## Comandos de verificación diaria

```bash
# Registros huérfanos (debe ser 0)
npx tsx scripts/audit-traceability-orphans.ts

# Tests contrato job_roles
npm run test -- tests/contract/003-staff/supervisor-job-roles.test.ts
```

## Cierre semana

- [ ] Retrospectiva con jefes de área (HK, F&B, Mantenimiento, Recepción)
- [ ] Lista de ajustes post-piloto documentada
- [ ] Decisión go/no-go Fase 4 o extensión piloto
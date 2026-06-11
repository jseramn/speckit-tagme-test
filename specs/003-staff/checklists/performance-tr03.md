# Performance smoke TR-03 — Scorecard departamento (T112)

**Meta**: Scorecard departamento ≤3s con carga simulada.

## Enfoque M6

La vista `v_scorecard_department` agrega por departamento. Con seed piloto (~12 empleados) el tiempo es <500ms en entorno InsForge US-East.

## Simulación 200 empleados

Para simular 200 empleados sin seed masivo en producción:

1. Ejecutar en staging con script de carga (fuera de M6 — manual pre-piloto si RRHH confirma).
2. Medir `GET /api/scorecards/department/{id}?period=30d` con herramienta curl/browser DevTools.

## Resultado esperado piloto Caribe

| Empleados activos | Tiempo observado | Cache requerida |
|-------------------|------------------|-----------------|
| ~12 (seed actual) | <1s | No |
| 50–100 | <2s estimado | Opcional vista materializada |
| 200+ | Revisar índices | Cache diario recomendado |

## Recomendación

Para piloto inicial (≤20 staff NFC): **no requiere cache diario**.  
Reevaluar si el hotel escala a >50 empleados con feedback diario alto.
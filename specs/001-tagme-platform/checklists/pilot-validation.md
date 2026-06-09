# Checklist validación piloto — M6

**Fecha**: 2026-06-08  
**Entorno**: staging / producción Vercel  
**Referencia**: [quickstart.md](../quickstart.md) escenarios 1–7

## Resultados

| # | Escenario | Estado | Notas |
|---|-----------|--------|-------|
| 1 | Flujo NFC huésped (US-1) | ✅ Listo | Hub `/t/caribe-lobby` carga; touch registrado como `url_direct` en browser |
| 2 | Contexto habitación (US-2) | ✅ Listo | `/t/caribe-room-412` muestra banner habitación 412 |
| 3 | Destinos y TagMétricas (US-2, US-6) | ✅ Listo | Dashboard M6 con gráficos completos + filtro por tag |
| 4 | Staff edita contenido (US-4) | ✅ Listo | CMS admin + revalidate 60s en hub guest |
| 5 | AVEX conversacional (US-3) | ✅ Listo | Chat SSE + guardrails + escalación a humano |
| 6 | Fallback sin NFC (US-5) | ✅ Listo | Admin copia URL `?assisted=1` → canal `staff_assisted` |
| 7 | Piloto producción (SC-005) | ⏳ Pendiente operativo | Requiere 30 días datos reales + 3 tags físicos programados |

## Verificaciones técnicas M6

- [x] `GET /api/admin/tags/{id}/fallback` retorna `shortUrl` con `?assisted=1`
- [x] `POST /api/events/touch?assisted=1` persiste `channel=staff_assisted`
- [x] AVEX fallback a recepción en timeout / error / botón "Hablar con recepción"
- [x] Tracking fire-and-forget resiliente (sendBeacon + degradación silenciosa)
- [x] `npm run build` sin errores
- [x] `npm run test` contratos verdes
- [x] Guest hub edge runtime configurado
- [x] README con instrucciones deploy Vercel

## Pendiente operaciones (post-deploy)

- [ ] Vincular dominio piloto en Vercel
- [ ] Programar 3 tags NFC físicos con URLs producción
- [ ] Ejecutar 20+ preguntas AVEX en dispositivo real (SC-009)
- [ ] Monitorear 30 días piloto (SC-005)
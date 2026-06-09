# Revisión seguridad RLS + Auth — M6

**Fecha**: 2026-06-08  
**Proyecto InsForge**: tagme-hotel-caribe  
**Referencia**: `supabase/migrations/002_rls_policies.sql`

## Resumen

| Área | Estado | Evidencia |
|------|--------|-----------|
| Anon no escribe admin | ✅ | Rutas `/api/admin/*` usan `requireStaff` / `requireAdmin` |
| Staff scoped por venue | ✅ | `assertVenueAccess()` en tags, content, knowledge, metrics |
| Anon escribe eventos | ✅ | `touch_events` / `destination_visits` vía service role en API routes |
| Anon lee tags públicos | ✅ | `resolve-tag.ts` usa service role; hub guest sin auth |
| AVEX sin PII | ✅ | Sesiones anónimas con `sessionToken` en localStorage |
| Service key server-only | ✅ | `INSFORGE_SERVICE_KEY` sin prefijo `NEXT_PUBLIC_` |
| Fallback API protegida | ✅ | `GET /api/admin/tags/{id}/fallback` requiere staff |

## Políticas RLS (migración 002)

| Tabla | Anon | Authenticated staff |
|-------|------|---------------------|
| `venues` | SELECT (activos) | SELECT venue propio |
| `nfc_tags` | SELECT (activos) | CRUD venue propio |
| `experience_configs` | SELECT | UPDATE venue propio |
| `knowledge_entries` | SELECT (activos) | CRUD venue propio |
| `touch_events` | INSERT | SELECT venue propio |
| `destination_visits` | INSERT | SELECT venue propio |
| `avex_sessions` | INSERT | SELECT venue propio |
| `avex_messages` | INSERT | SELECT venue propio |
| `user_profiles` | — | SELECT/UPDATE propio |

## Controles API (BFF)

- **Admin routes**: JWT InsForge Auth o `STAFF_DEV_TOKEN` (solo dev)
- **Guest routes**: Sin auth; datos públicos del venue
- **Events routes**: Validación Zod; sin auth (fire-and-forget analítica)
- **AVEX route**: Rate limit por sesión; guardrails post-LLM

## Riesgos residuales (aceptados MVP)

| Riesgo | Mitigación |
|--------|------------|
| Event spam sin auth | Deduplicación 60s + volumen piloto bajo |
| Dev token en producción | No configurar `STAFF_DEV_TOKEN` en Vercel prod |
| KB en system prompt | Corpus acotado por venue; sin PII |

## Acciones pre-lanzamiento

- [x] Verificar `STAFF_DEV_TOKEN` vacío en producción
- [x] Confirmar `INSFORGE_SERVICE_KEY` solo en env servidor Vercel
- [ ] Rotar keys si fueron expuestas en desarrollo
- [ ] Revisar logs InsForge tras primera semana piloto
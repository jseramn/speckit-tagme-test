<!-- SPECKIT START -->
# TagMe — Contexto para agentes

**Proyecto**: TagMe NFC/IoT Guest Experience Platform  
**Feature activa**: `specs/demo-hotel-prep` (Preparación Demo Hotel Caribe)  
**Plan**: [specs/demo-hotel-prep/plan.md](../specs/demo-hotel-prep/plan.md)  
**Spec**: [specs/demo-hotel-prep/spec.md](../specs/demo-hotel-prep/spec.md)  
**Fase 3 base**: [specs/003-staff/spec.md](../specs/003-staff/spec.md) | [constitution](../specs/003-staff/constitution.md)

## Stack

- **Frontend**: Next.js 15 App Router + Tailwind, deploy Vercel
- **Backend**: InsForge (PostgreSQL, Auth, RLS)
- **Fase 1 heredada**: Hub `/t/{tagSlug}`, AVEX, TagMétricas, `venues`, `nfc_tags`
- **Fase 3 nueva**: NFC staff `/s/{tagSlug}`, captura `/capture/{sessionToken}`, cookie `tagme_stay`, scorecards NPS

## Estructura clave Fase 3

- `app/(guest)/s/[tagSlug]` — entry NFC staff → sesión efímera 5 min
- `app/(guest)/capture/[sessionToken]` — UI Feedback/Incidencia huésped
- `app/(guest)/capture/room/[tagSlug]` — captura origen habitación
- `app/(staff)/reception` — estadía formal + consolidación efímera
- `app/(supervisor)/` — scorecards, incidencias, config org
- `app/api/staff|capture|reception|scorecards|supervisor` — BFF APIs
- `lib/staff/`, `lib/stays/`, `lib/capture/`, `lib/scorecards/` — lógica dominio
- `supabase/migrations/004_staff_schema.sql` (+ 005 RLS, 006 views)

## Principios no negociables Fase 3

- Staff inicia con tarjeta NFC; sesión TTL 5 min server-side
- Feedback ≠ Incidencia (tablas, flujos y UI separados)
- Origen obligatorio: `staff_nfc` o `room_nfc` en todo registro
- NPS interno solo si n ≥ 6; turno solo por asignación explícita
- Cookie estadía: formal (Recepción) + efímera auto 48h walk-in

## Artefactos de diseño

- [data-model.md](../specs/003-staff/data-model.md)
- [research.md](../specs/003-staff/research.md)
- [quickstart.md](../specs/003-staff/quickstart.md)
- [contracts/](../specs/003-staff/contracts/)

## Constitución

Leer `specs/003-staff/constitution.md` v1.0.0 antes de implementar Fase 3 (prevalece sobre global para esta fase). Global: `.specify/memory/constitution.md` v1.1.0.

## Milestones Fase 3

M0 Schema → M1 NFC staff+feedback → M2 Cookie estadía → M3 Incidencias → M4 Room NFC → M5 Scorecards → M6 Piloto Caribe
<!-- SPECKIT END -->
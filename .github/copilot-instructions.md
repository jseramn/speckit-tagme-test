<!-- SPECKIT START -->
# TagMe — Contexto para agentes

**Proyecto**: TagMe NFC/IoT Guest Experience Platform  
**Feature activa**: `specs/001-tagme-platform`  
**Plan**: [specs/001-tagme-platform/plan.md](../specs/001-tagme-platform/plan.md)  
**Spec**: [specs/001-tagme-platform/spec.md](../specs/001-tagme-platform/spec.md)

## Stack

- **Frontend**: Next.js 15 App Router + Tailwind, deploy Vercel
- **Backend**: InsForge (PostgreSQL, Auth, Model Gateway)
- **AVEX**: Chat conversacional RAG-lite; sin transacciones en MVP
- **NFC**: URLs `/t/{tagSlug}`; contexto habitación en `nfc_tags` sin PMS

## Estructura clave (a implementar)

- `app/(guest)/t/[tagSlug]` — hub huésped
- `app/(admin)/dashboard` — TagMétricas
- `app/api/events/*` — analítica
- `app/api/avex/chat` — AVEX streaming SSE
- `lib/insforge.ts` — cliente InsForge

## Artefactos de diseño

- [data-model.md](../specs/001-tagme-platform/data-model.md)
- [research.md](../specs/001-tagme-platform/research.md)
- [quickstart.md](../specs/001-tagme-platform/quickstart.md)
- [contracts/](../specs/001-tagme-platform/contracts/)

## Constitución

Leer `.specify/memory/constitution.md` v1.1.0 antes de implementar. Spec-driven; business first; simplicidad para huésped/staff; MVP iterativo.

## Milestones

M0 Fundación → M1 NFC Core → M2 Destinos+métricas → M3 Admin → M4 Habitación → M5 AVEX → M6 Piloto
<!-- SPECKIT END -->
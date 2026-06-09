# Research: TagMe Plataforma NFC/IoT

**Fecha**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

Decisiones consolidadas de Phase 0. Sin marcadores `NEEDS CLARIFICATION` pendientes.

---

## 1. Stack frontend — Next.js App Router en Vercel

**Decision**: Next.js 15 App Router, TypeScript, Tailwind CSS, desplegado en Vercel.

**Rationale**: Constitución fija Next.js + Vercel. App Router permite RSC para hub guest (SEO irrelevante pero TTFB bajo) y Client Components para AVEX chat. Vercel provee geo headers, preview deployments y edge para latencia LATAM.

**Alternatives considered**:
- Remix / Astro — rechazado: no alineado a constitución
- SPA React pura — rechazado: peor TTFB en primer toque NFC (crítico NFR-001)

---

## 2. Backend — InsForge como BaaS

**Decision**: InsForge para PostgreSQL, Auth, Model Gateway (AVEX), opcional Edge Functions para agregaciones.

**Rationale**: Constitución especifica InsForge. SDK `@insforge/sdk` integra con Next.js según [guía oficial](https://docs.insforge.dev/examples/framework-guides/nextjs). Unifica DB + auth + LLM sin gestionar infra separada.

**Alternatives considered**:
- Supabase — capacidades similares pero no es stack acordado
- API custom FastAPI — más control, más ops; viola simplicidad MVP

---

## 3. Resolución de tags NFC

**Decision**: Cada tag NFC se programa con URL `https://{domain}/t/{tagSlug}`. El slug es único globalmente y mapea a fila `nfc_tags`.

**Rationale**: URLs en path son cortas (importante al escribir tags NFC). El slug es estable aunque cambie configuración interna. Q3=B: `room_number` y `zone` son columnas del tag, no parámetros URL visibles al huésped.

**Alternatives considered**:
- UUID en URL — feo para debugging y soporte staff
- Query `?room=412` — expone lógica; más frágil al programar tags

---

## 4. TagMétricas — ingest y agregación

**Decision**: Eventos insertados vía `POST /api/events/*` desde Next.js API Routes con service-role InsForge. Agregaciones vía SQL en dashboard (queries directas o vistas materializadas simples).

**Rationale**: Volumen piloto <2000 toques/día según PDF. Colas (Redis, Kafka) son over-engineering (Principio V, YAGNI).

**Alternatives considered**:
- Vercel Analytics / Plausible — no cubren destinos ni contexto tag
- Edge Function batch — pospuesto a si dashboard es lento

---

## 5. AVEX — RAG-lite vs pgvector full RAG

**Decision**: **RAG-lite** para MVP: cargar todas las `knowledge_entries` del venue en system prompt + contexto habitación. Sin embeddings en v1.

**Rationale**: Hotel Caribe piloto tendrá KB acotada (<50 entradas estimadas). Más simple de implementar y auditar por staff. SC-009 (85% precisión) alcanzable con KB bien curada. InsForge pgvector disponible si falla umbral en M6.

**Alternatives considered**:
- Full RAG pgvector — mejor escala pero más moving parts para MVP
- FAQ keyword-only sin LLM — no cumple Q1=B (conversacional)

---

## 6. AVEX — guardrails y no-transaccional

**Decision**: System prompt + post-procesamiento en `guardrails.ts` que intercepta intenciones de reserva/pago y responde con plantilla + enlace configurado.

**Rationale**: FR-019 explícito. Más confiable que confiar solo en el LLM para rechazar transacciones.

**Alternatives considered**:
- Function calling para reservas — fuera de scope MVP

---

## 7. Autenticación staff/admin

**Decision**: InsForge Auth con roles en tabla `user_profiles` (`staff`, `admin`) vinculados a `venue_id`.

**Rationale**: Un proveedor; RLS en InsForge filtra por venue. Staff solo edita su venue; admin ve TagMétricas global del piloto.

**Alternatives considered**:
- NextAuth + DB propia — duplica auth ya en InsForge

---

## 8. Caching y frescura de contenido

**Decision**: `revalidate: 60` en página guest + `revalidatePath` on-demand cuando staff guarda cambios.

**Rationale**: Spec FR-012 pide cambios visibles en <5 min. ISR 60s cumple; on-demand acerca a tiempo real tras guardado.

**Alternatives considered**:
- Sin cache (SSR puro cada request) — más carga DB; aceptable pero innecesario en piloto

---

## 9. Deduplicación de toques

**Decision**: Ventana 60 segundos; fingerprint = hash(`tag_id` + User-Agent + IP /24).

**Rationale**: Edge case en spec. Evita métricas infladas por toques accidentales dobles.

**Alternatives considered**:
- 30s — más agresivo; 60s balance conservador

---

## 10. Testing strategy

**Decision**:
- **Contract**: validar schemas Zod de API routes vs `contracts/`
- **Integration**: resolución tag, insert eventos, RLS
- **E2E Playwright**: flujo `/t/test-tag` → hub → destino → evento en DB

**Rationale**: Principio IV (calidad pragmática). Tests donde fallan los riesgos de negocio (NFC flow, métricas, AVEX guardrails).

**Alternatives considered**:
- 100% TDD estricto día 1 — desbalanceado para MVP visual; tests en milestones críticos
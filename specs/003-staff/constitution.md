# TagMe Constitution — Fase 3: Staff & Feedback Operativo

**Proyecto:** TagMe — Captura contextual de feedback e incidencias por staff operativo  
**Fase:** `003-tagme-staff` (003-staff)  
**Dominio:** Hospitalidad — LATAM / Colombia (piloto: Hotel Caribe by Faranda Grand)  
**Stack heredado:** Next.js (Vercel) + InsForge Backend  
**Constitución base:** `.specify/memory/constitution.md` v1.1.0 (Fase 1)  
**Versión:** 1.0.0  
**Ratificada:** 2026-06-10  
**Última enmienda:** 2026-06-10

---

## 1. Principios Core

| # | Principio | Descripción | ¿No negociable? |
|---|-----------|-------------|-----------------|
| I | **Spec-Driven Development** | Ninguna funcionalidad de staff, feedback o incidencias se implementa sin especificación aprobada en `specs/003-staff/`. Los cambios de alcance requieren enmienda explícita de la spec de esta fase. | Sí |
| II | **Staff como Actor Central** | El staff operativo — no el huésped ni la gerencia — inicia y contextualiza las interacciones de feedback. Las tarjetas NFC del staff son el punto de partida de sesiones breves, trazables y orientadas a captura de opinión o reporte de problema. | Sí |
| III | **Trazabilidad por Origen** | Todo feedback e incidencia **debe** quedar vinculado a su origen: NFC de staff (empleado + contexto operativo) o NFC fijo de habitación/zona. No se aceptan registros huérfanos sin actor, punto físico o contexto identificable. | Sí |
| IV | **Feedback ≠ Incidencia** | **Feedback** es opinión o calificación sobre una interacción o servicio. **Incidencia** es un problema que requiere acción operativa. Son tipos semánticos distintos con flujos, estados y métricas separadas; nunca se mezclan en un solo formulario o entidad ambigua. | Sí |
| V | **Sesiones Efímeras del Staff** | Las interacciones iniciadas por tarjeta NFC del staff son temporales: duración máxima de **5 minutos**. Pasado ese límite, la sesión expira y el huésped debe reiniciar el flujo con un nuevo toque del staff. No se persisten borradores indefinidos. | Sí |
| VI | **Identidad Persistente de Estadía** | El huésped mantiene una identificación persistente durante su estadía (cookie de estadía, generada principalmente en Recepción). Esta identidad permite múltiples feedbacks en distintos momentos sin re-identificación, sin integrar PMS ni almacenar PII innecesaria. | Sí |
| VII | **Scorecards Jerárquicos** | Las métricas de desempeño se agregan en cascada: **Empleado → Turno → Departamento → Hotel**. Cada nivel debe poder desglosarse hacia abajo y consolidarse hacia arriba con reglas de agregación documentadas. | Sí |
| VIII | **Estructura Organizacional Configurable** | Departamentos, cargos, turnos y asignación de staff deben ser configurables desde el sistema por personal autorizado. No se hardcodean estructuras del hotel en código; el piloto Hotel Caribe se configura, no se programa. | Sí |
| IX | **Captura Interna Antes de Canales Externos** | El objetivo estratégico es interceptar feedback e incidencias **dentro** del hotel antes de que escalen a TripAdvisor, Google u otros canales públicos. Los flujos deben ser más rápidos y menos friccionados que publicar una reseña externa. | Sí |
| X | **Pragmatismo y Entrega Incremental** | Se entregan slices verificables (un flujo NFC staff → feedback, un scorecard de departamento, un workflow de incidencia) antes que una plataforma completa de RRHH o calidad. La calidad pragmática de Fases 1 y 2 sigue vigente. | — |

---

## 2. Contexto del Proyecto y Fuentes de Verdad

### Cambio de enfoque respecto a fases anteriores

| Fase 1 (`001-tagme-platform`) | Fase 2 (`002-tagme-clevel`) | Fase 3 (`003-tagme-staff`) |
|-------------------------------|-----------------------------|----------------------------|
| Conectar huésped por NFC + hub + AVEX | Visibilidad gerencial y alertas para C-Level | **Staff operativo** captura feedback e incidencias en contexto real |
| TagMétricas: toques, destinos, sesiones AVEX | Dashboards ejecutivos, ROI, pulso gerencial | Scorecards jerárquicos, trazabilidad por empleado/turno/departamento |
| Staff edita contenido y asiste conexión NFC | Gerentes supervisan señales agregadas | Staff **inicia** interacciones de opinión y reporte con tarjeta NFC propia |
| Identificación ligera por tag/URL de habitación | Sin PII; agregados por zona/tag | Cookie de estadía persistente + origen NFC staff o habitación |
| Sin modelo de feedback/incidencia | Proxies de experiencia inferidos | **Feedback** e **Incidencia** como entidades de primera clase |

### Fuentes de verdad (en orden de precedencia para esta fase)

1. **Esta Constitution** (`specs/003-staff/constitution.md`) — reglas de gobernanza y alcance de Fase 3.
2. **Spec de Fase 3** (`specs/003-staff/spec.md`, cuando exista) — requisitos funcionales y no funcionales de staff, feedback e incidencias.
3. **Propuesta comercial / presentación TagMe** (`TagMe.pdf` o equivalente) — alineación de valor de negocio y promesa al establecimiento.
4. **Artefactos de Fases 1 y 2** (`specs/001-tagme-platform/`, `specs/002-clevel/`) — entidades venue/tag, eventos, roles, dashboards gerenciales ya implementados.
5. **Constitución global** (`.specify/memory/constitution.md`) — principios transversales no contradichos por esta fase.

### Stakeholders clave

| Rol | Necesidad principal |
|-----|---------------------|
| **Staff operativo** (housekeeping, restaurante, recepción, mantenimiento) | Iniciar feedback con un toque NFC, en segundos, sin interrumpir la operación |
| **Huésped** | Dar opinión o reportar problema de forma rápida, contextual y sin fricción post-interacción con el staff |
| **Jefe de departamento** | Ver scorecards de su equipo, incidencias abiertas y tendencias por turno |
| **Gerente / C-Level** | Consumir agregados jerárquicos (Fase 2 enriquecida con señales de feedback real, no solo proxies) |
| **Recepción / Front Office** | Generar y vincular cookie de estadía; ser punto de entrada de identidad del huésped |
| **RRHH / Calidad** (futuro) | Trazabilidad de desempeño por empleado con contexto, sin depender de reseñas externas |

### Idioma

Documentación de producto, specs y UI operativa en **español**. Código y comentarios técnicos pueden estar en inglés cuando mejore claridad.

---

## 3. Modelo de Feedback e Incidencias

TagMe Fase 3 organiza la captura en **cuatro dimensiones** que deben estar presentes en todo registro válido.

### 3.1 Origen de la interacción

| Origen | Descripción | Datos obligatorios |
|--------|-------------|-------------------|
| **NFC Staff** | Empleado acerca su tarjeta al huésped para iniciar sesión de feedback/incidencia | `staff_id`, `staff_nfc_tag_id`, contexto (zona/servicio), timestamp de inicio |
| **NFC Habitación / Zona fija** | Huésped inicia desde tag fijo en habitación u otra zona sin presencia del staff | `nfc_tag_id`, `zone`, `room_number` (si aplica), timestamp |

> **Regla:** Un registro sin origen identificable es inválido y no debe persistirse.

### 3.2 Tipos semánticos

| Tipo | Definición | Ejemplos | Destino operativo |
|------|------------|----------|-------------------|
| **Feedback** | Opinión, calificación o comentario sobre una interacción o servicio recibido | "Excelente atención en check-in", calificación 5/5 al mesero | Scorecard del empleado/turno/departamento |
| **Incidencia** | Problema que requiere acción correctiva del hotel | Aire acondicionado dañado, ruido excesivo, demora en room service | Workflow de incidencia con estado, prioridad y asignación |

### 3.3 Sesión efímera del staff

- **DEBE** crearse al toque NFC del staff y expirar automáticamente a los **5 minutos** sin envío.
- **DEBE** mostrar al huésped contexto claro: quién atendió (nombre o rol), qué tipo de interacción se evalúa.
- **DEBE** permitir al huésped elegir entre feedback o incidencia (o flujos separados según spec).
- **NO DEBE** requerir login del huésped; la cookie de estadía provee continuidad.
- **PUEDE** permitir múltiples envíos del mismo huésped sobre el mismo empleado en distintas sesiones y contextos.

### 3.4 Identidad de estadía (cookie)

- **DEBE** generarse principalmente en **Recepción** al check-in o primer contacto operativo.
- **DEBE** persistir durante la estadía y asociar feedbacks/incidencias al mismo huésped anónimo (`stay_id`).
- **NO DEBE** almacenar PII innecesaria (nombre, documento, email) salvo que una spec futura lo justifique con consentimiento explícito.
- **DEBE** expirar al checkout o tras TTL configurable por venue.

### 3.5 Scorecards jerárquicos

| Nivel | Métricas típicas | Agregación |
|-------|------------------|------------|
| **Empleado** | Promedio de calificación, volumen de feedbacks, incidencias vinculadas, tendencia | Base atómica |
| **Turno** | Promedio del turno, comparativo vs. otros turnos del mismo departamento | Roll-up de empleados en turno activo |
| **Departamento** | Score consolidado, incidencias abiertas/cerradas, ranking interno | Roll-up de turnos del departamento |
| **Hotel** | NPS interno proxy, tasa de incidencias, cobertura de captura vs. interacciones | Roll-up de departamentos del venue |

> **Regla:** Un mismo huésped **puede** enviar múltiples feedbacks sobre el mismo empleado en diferentes momentos y contextos. Cada registro es independiente y conserva su propio origen y timestamp.

---

## 4. Comportamientos del Sistema a Nivel Operativo

Para ser útil al staff y a la operación del hotel, TagMe Fase 3 **debe** exhibir estos comportamientos:

### 4.1 Inicio de interacción por NFC staff

- **DEBE** abrir flujo de captura en ≤ 3 segundos tras toque del huésped a la tarjeta del staff.
- **DEBE** identificar al empleado y su departamento/cargo desde la tarjeta NFC (sin que el staff tipee su ID).
- **DEBE** registrar el contexto operativo (zona, tipo de servicio, turno activo) automáticamente cuando sea posible.
- **NO DEBE** bloquear al staff con formularios largos; la carga principal recae en el huésped post-toque.

### 4.2 Captura de feedback

- **DEBE** ofrecer escala de calificación simple (ej. 1–5 o emojis) + comentario opcional.
- **DEBE** persistir origen completo: staff, tag NFC, timestamp, `stay_id`, contexto.
- **DEBE** actualizar scorecards en tiempo casi real (objetivo ≤ 60 s) tras envío.
- **NO DEBE** mezclar campos de incidencia (prioridad, categoría de fallo) en el flujo de feedback.

### 4.3 Captura y gestión de incidencias

- **DEBE** permitir categorización del problema (mantenimiento, limpieza, ruido, F&B, otro).
- **DEBE** asignar estado (`abierta`, `en progreso`, `resuelta`, `cerrada`) con trazabilidad de cambios.
- **DEBE** notificar al jefe de departamento o área responsable según categoría.
- **DEBE** conservar origen (staff NFC o habitación) para investigación posterior.
- **NO DEBE** tratar una incidencia como feedback negativo implícito; son pipelines separados.

### 4.4 Configuración organizacional

- **DEBE** permitir CRUD de departamentos, cargos, turnos y asignación staff ↔ departamento.
- **DEBE** permitir asignación de tarjetas NFC a empleados activos.
- **DEBE** soportar cambios de turno y departamento sin perder historial (el histórico conserva el contexto al momento del registro).
- **NO DEBE** requerir despliegue de código para reorganizar equipos del piloto.

### 4.5 Integración con capas anteriores

- **DEBE** enriquecer dashboards de Fase 2 con señales reales de feedback/incidencia (no solo proxies AVEX o toques).
- **DEBE** reutilizar entidades `venues`, `nfc_tags`, `user_profiles` y roles de Fases 1–2.
- **PUEDE** generar alertas gerenciales (Fase 2) ante picos de incidencias o caída de score por departamento.
- **NO DEBE** duplicar infraestructura de eventos si los registros de feedback/incidencia pueden extender el modelo existente.

### 4.6 Privacidad y anonimización

- **DEBE** asociar registros a `stay_id` anónimo, no a identidad personal del huésped.
- **DEBE** mostrar a gerencia agregados por empleado/departamento; comentarios textuales con moderación/filtro según spec.
- **NO DEBE** exponer en scorecards públicos internos qué huésped específico dejó qué comentario, salvo flujo de incidencia que lo requiera operativamente.

---

## 5. Alcance de Fase 3

### 5.1 Dentro del alcance

| Área | Incluido |
|------|----------|
| **Tarjetas NFC de staff** | Asignación, activación y toque → sesión efímera de captura |
| **Flujo huésped post-toque staff** | UI mobile-first para feedback e incidencia en ≤ 5 min |
| **Cookie / identidad de estadía** | Generación en Recepción, persistencia durante estadía, vinculación de registros |
| **Modelo Feedback vs. Incidencia** | Entidades, flujos y métricas separadas con trazabilidad de origen |
| **Origen NFC habitación/zona** | Captura alternativa sin staff presente, con trazabilidad de tag fijo |
| **Scorecards jerárquicos** | Empleado → Turno → Departamento → Hotel con agregaciones documentadas |
| **Configuración organizacional** | Departamentos, cargos, turnos, asignación de staff y tarjetas NFC |
| **Panel staff / supervisor** | Vista de incidencias abiertas, scorecards de equipo, historial por empleado |
| **Enriquecimiento gerencial** | Nuevas señales en capa Fase 2 derivadas de feedback/incidencias reales |
| **Múltiples feedbacks por huésped** | Mismo huésped, mismo empleado, distintos momentos/contextos — registros independientes |
| **Piloto Hotel Caribe** | Configuración de equipos reales, tarjetas staff y validación operativa en piso |

### 5.2 Explícitamente fuera del alcance

| Área | Excluido | Razón |
|------|----------|-------|
| **Integración PMS** | Fuera | Sin sync de check-in/checkout automático; cookie de estadía es mecanismo propio |
| **Publicación automática en TripAdvisor / Google** | Fuera | Objetivo es captura **interna** previa; no empujar a canales externos |
| **Sistema completo de RRHH** | Fuera | No nómina, contratos, evaluaciones de desempeño formales ni disciplina laboral |
| **Gamificación o rankings públicos entre empleados** | Fuera | Scorecards son herramienta operativa/gerencial, no competencia visible al huésped |
| **Sesiones staff > 5 minutos** | Fuera | Principio V; extender requiere enmienda de constitution |
| **Identidad huésped con login obligatorio** | Fuera | Fricción incompatible con captura post-servicio; cookie de estadía es suficiente |
| **Reemplazo de AVEX o hub huésped Fase 1** | Fuera | Complementa; no sustituye hub, menú digital ni chat AVEX |
| **Rediseño completo dashboards C-Level** | Fuera | Fase 2; Fase 3 aporta nuevas señales, no reescribe la capa ejecutiva |
| **App nativa staff** | Fuera | Web mobile-first suficiente para flujo NFC + captura |
| **IA para clasificar sentimiento** | Fuera | Categorización manual/simple en MVP; ML avanzado es post-MVP |

### 5.3 Zona gris — requiere spec antes de implementar

- Integración de **solo lectura** con PMS para auto-expirar cookie de estadía en checkout.
- Notificaciones push/WhatsApp/email al staff cuando se abre incidencia crítica.
- Flujo de **feedback anónimo sin cookie** (huésped walk-in sin check-in previo).
- Vinculación de incidencia con sistema de tickets/mantenimiento externo (ServiceNow, etc.).
- Exportación de scorecards a RRHH o BI externo.
- Fórmula acordada de **NPS interno** vs. promedio simple de calificaciones.

---

## 6. Estándares Técnicos (Fase 3)

Hereda stack de Fases 1–2 con extensiones orientadas a staff y captura operativa:

| Área | Estándar |
|------|----------|
| **Frontend staff/huésped** | Rutas bajo `app/(staff)/` y flujos guest post-NFC staff; mobile-first, ≤ 3 s hasta formulario de captura |
| **Frontend supervisor** | Extensión de `app/(admin)/` o nueva ruta `app/(supervisor)/` según plan; scorecards y bandeja de incidencias |
| **Backend / datos** | InsForge PostgreSQL; tablas `staff_members`, `staff_nfc_tags`, `guest_stays`, `feedback_entries`, `incident_reports`, `departments`, `shifts`; RLS por rol y venue |
| **Sesiones efímeras** | TTL de 5 min enforced server-side; token de sesión staff↔huésped no reutilizable tras expiración |
| **Cookie de estadía** | HttpOnly, Secure, SameSite=Lax; TTL alineado a estadía; generación en flujo Recepción documentado en spec |
| **Contratos** | APIs documentadas en `specs/003-staff/contracts/`; separación clara: APIs staff NFC, APIs captura huésped, APIs scorecard |
| **Trazabilidad** | Todo registro incluye `origin_type` (`staff_nfc` \| `room_nfc`), `origin_id`, `stay_id`, `staff_id` (nullable), `venue_id`, `created_at` |
| **Visual** | Sensibilidad "geek formal + silent luxury" adaptada a **captura rápida**: formularios mínimos, jerarquía clara, CTA evidentes |
| **Rendimiento** | Apertura de sesión staff ≤ 3 s; envío de feedback ≤ 2 s; scorecard departamento carga ≤ 3 s en piloto |
| **Seguridad** | Auth para staff/supervisor; captura huésped vía token de sesión efímera; RLS por venue; sin PII en agregados |

---

## 7. Reglas de Flujo de Trabajo (Cómo Debe Comportarse el Agente)

Al trabajar en la rama `003-tagme-staff` o en artefactos bajo `specs/003-staff/`, el agente **debe**:

1. **Leer esta Constitution primero** — Antes de proponer código o specs, validar alineación con principios II–IX (staff central, trazabilidad, separación feedback/incidencia, scorecards).
2. **Respetar el límite de fase** — No rediseñar dashboards C-Level completos, AVEX transaccional ni integraciones PMS salvo enriquecimiento mínimo acordado. Si el usuario pide lo contrario, proponer enmienda de spec o tarea en fase correspondiente.
3. **Seguir el flujo Spec Kit para Fase 3**:
   - `/speckit.specify` → Spec en `specs/003-staff/spec.md`
   - `/speckit.clarify` → Resolver ambigüedad en flujos NFC, scorecards, cookie de estadía y estados de incidencia antes del plan
   - `/speckit.plan` → Plan técnico en `specs/003-staff/plan.md`
   - `/speckit.tasks` → Tareas en `specs/003-staff/tasks.md`
   - `/speckit.implement` → Solo con spec, plan y tareas claros
4. **Pensar como staff de piso, no como desarrollador** — Cada propuesta debe incluir: interacción física (toque NFC), tiempo del staff (segundos), contexto capturado y criterio de éxito observable en operación real.
5. **Garantizar trazabilidad de origen** — Ningún diseño de datos omite `origin_type`, actor staff o tag NFC. Si no hay origen, el diseño es inválido.
6. **Separar feedback de incidencia** — No unificar en una sola entidad "comentario". Flujos, estados y métricas distintas desde el diseño inicial.
7. **Reutilizar infraestructura de Fases 1–2** — Priorizar extensión de `venues`, `nfc_tags`, `user_profiles`, roles y vistas gerenciales antes de crear pipelines paralelos.
8. **Marcar NEEDS CLARIFICATION** — Especialmente en generación de cookie de estadía, fórmulas de agregación de scorecards, categorías de incidencia, permisos supervisor vs. gerente.
9. **Referenciar propuesta comercial** — Al priorizar features, citar valor de captura interna y retención de reputación del establecimiento.
10. **Comunicar trade-offs** — Ej.: anonimato vs. seguimiento de incidencia, granularidad de scorecard vs. privacidad, sesión 5 min vs. tasa de completitud.
11. **Mantener al humano en el loop** — Decisiones de UX de captura, categorías de incidencia y estructura organizacional del piloto requieren validación explícita.

### Checklist rápido antes de implementar

- [ ] ¿El staff es quien inicia la interacción con su tarjeta NFC?
- [ ] ¿El registro tiene origen trazable (staff NFC o tag habitación)?
- [ ] ¿Feedback e incidencia están modelados como tipos distintos?
- [ ] ¿La sesión staff expira a los 5 minutos?
- [ ] ¿El huésped queda vinculado a `stay_id` sin PII innecesaria?
- [ ] ¿Las métricas agregan correctamente Empleado → Turno → Departamento → Hotel?
- [ ] ¿La estructura de equipos es configurable sin cambio de código?
- [ ] ¿Está dentro del alcance de §5 y no contradice §5.2?

---

## 8. Gobernanza

| Tema | Regla |
|------|-------|
| **Enmienda de esta Constitution** | Requiere justificación explícita y versión semántica actualizada. Usar `/speckit.constitution` con contexto `003-staff`. |
| **Relación con Constitución global** | `.specify/memory/constitution.md` aplica en lo no contradicho. En conflicto, **esta Constitution prevalece para Fase 3**. |
| **Relación con Constitution Fase 2** | `specs/002-clevel/constitution.md` rige dashboards gerenciales; Fase 3 la enriquece con señales de feedback/incidencia, no la reemplaza. |
| **Versionado** | MAJOR: cambio de filosofía o eliminación de principio. MINOR: nuevos principios o secciones materiales. PATCH: clarificaciones. |
| **Propiedad de la spec** | El humano decide prioridades, estructura organizacional del piloto y fórmulas de scorecard; el agente estructura y propone. |
| **Proceso de clarificación** | Flujos NFC, cookie de estadía, categorías de incidencia o agregaciones → `/speckit.clarify` antes de `/speckit.plan`. |
| **Criterio de done de la fase** | Staff del Hotel Caribe puede iniciar captura de feedback con tarjeta NFC, el huésped completa el flujo en ≤ 5 min, el registro aparece en scorecard del empleado y del departamento, y una incidencia abre workflow trazable — todo sin integración PMS, durante una semana piloto en operación real. |

---

## 9. Anti-Patrones (Qué Evitamos en Fase 3)

- Formularios largos que el staff o el huésped abandonan en piso.
- Mezclar feedback e incidencia en un solo tipo "comentario" o "reseña".
- Registros sin origen trazable (ni staff NFC ni tag de habitación).
- Sesiones staff sin TTL que permiten envíos días después fuera de contexto.
- Scorecards que promedian sin considerar volumen mínimo (un 5★ de un solo feedback = "empleado del mes").
- Hardcodear departamentos, turnos o empleados del Hotel Caribe en código.
- Exigir login o datos personales al huésped para dejar feedback post-servicio.
- Duplicar `touch_events` o crear pipelines paralelos ignorando Fases 1–2.
- Gamificar rankings entre empleados de forma visible al huésped.
- Empujar al huésped hacia TripAdvisor/Google en lugar de capturar internamente primero.
- Construir un sistema de RRHH completo disfrazado de "fase de feedback".
- Extender sesiones staff más allá de 5 minutos sin enmienda de constitution.
- Vibe-coding de flujos NFC sin validar la interacción física staff → huésped → captura.

---

## 10. Relación con Entregables de Fase 3

| Artefacto | Ubicación | Estado |
|-----------|-----------|--------|
| Constitution | `specs/003-staff/constitution.md` | ✅ Ratificada v1.0.0 |
| Spec funcional | `specs/003-staff/spec.md` | Pendiente |
| Plan técnico | `specs/003-staff/plan.md` | Pendiente |
| Tareas | `specs/003-staff/tasks.md` | Pendiente |
| Modelo de datos | `specs/003-staff/data-model.md` | Pendiente |
| Contratos API | `specs/003-staff/contracts/` | Pendiente |
| Checklists validación | `specs/003-staff/checklists/` | Pendiente |

---

*Esta Constitution es la fuente de verdad de gobernanza para TagMe Fase 3 — Staff & Feedback Operativo. Todo trabajo en la rama `003-tagme-staff` debe ser coherente con este documento.*
# TagMe Constitution — Fase 2: C-Level Visibility & Control

**Proyecto:** TagMe — Capa de inteligencia y control para gerencia hotelera  
**Fase:** `002-tagme-clevel` (002-clevel)  
**Dominio:** Hospitalidad — LATAM / Colombia (piloto: Hotel Caribe by Faranda Grand)  
**Stack heredado:** Next.js (Vercel) + InsForge Backend  
**Constitución base:** `.specify/memory/constitution.md` v1.1.0 (Fase 1)  
**Versión:** 1.0.0  
**Ratificada:** 2026-06-09  
**Última enmienda:** 2026-06-09

---

## 1. Principios Core

| # | Principio | Descripción | ¿No negociable? |
|---|-----------|-------------|-----------------|
| I | **Spec-Driven Development** | Ninguna funcionalidad gerencial se implementa sin especificación aprobada en `specs/002-clevel/`. Los cambios de alcance requieren enmienda explícita de la spec de esta fase. | Sí |
| II | **Decision-First, Not Data-First** | Cada vista, métrica o alerta debe responder una pregunta de negocio concreta de un gerente o jefe de departamento. Los datos sin contexto ni acción recomendada no cumplen el estándar de esta fase. | Sí |
| III | **Visibilidad sin Supervisión Física** | TagMe debe permitir que la gerencia entienda qué ocurre en el hotel — experiencia del huésped y desempeño operativo — sin estar presente en el piso ni depender de reportes manuales. | Sí |
| IV | **Capa de Inteligencia, No Reemplazo** | TagMe complementa PMS, housekeeping, POS y sistemas operativos existentes. Agrega señales, correlaciones y control gerencial; **no** sustituye check-in, folios, inventario ni workflows nativos de esos sistemas. | Sí |
| V | **Métricas Accionables y ROI Operativo** | Toda métrica expuesta debe vincularse a una decisión posible (ajustar staffing, priorizar incidencias, corregir contenido, escalar un área). El valor se mide en tiempo ahorrado, incidencias anticipadas y mejora medible de la experiencia. | Sí |
| VI | **Claridad Ejecutiva y Visual** | Interfaces gerenciales priorizan lectura rápida: estado actual, tendencias, excepciones y comparativos. La ambigüedad en jerarquía visual, semántica de KPIs o flujos de alerta debe resolverse antes de implementar. | Sí |
| VII | **Pragmatismo y Entrega Incremental** | Se entregan slices de valor gerencial verificables (un dashboard de departamento, un tipo de alerta, un reporte ejecutivo) antes que plataformas analíticas completas. La calidad pragmática de Fase 1 sigue vigente. | — |

---

## 2. Contexto del Proyecto y Fuentes de Verdad

### Cambio de enfoque respecto a Fase 1

| Fase 1 (`001-tagme-platform`) | Fase 2 (`002-tagme-clevel`) |
|--------------------------------|-----------------------------|
| Construir flujo huésped NFC + hub + AVEX | Consumir y enriquecer señales ya capturadas |
| TagMétricas operativo básico (toques, destinos) | Inteligencia gerencial, alertas y control por departamento |
| Staff actualiza contenido y resuelve fricción NFC | Gerentes supervisan, priorizan y deciden con visibilidad en tiempo real |
| Usuario primario: huésped y staff de línea | Usuario primario: **Gerente General, Gerentes de Área, Jefes de Departamento** |

### Fuentes de verdad (en orden de precedencia para esta fase)

1. **Esta Constitution** (`specs/002-clevel/constitution.md`) — reglas de gobernanza y alcance de Fase 2.
2. **Spec de Fase 2** (`specs/002-clevel/spec.md`, cuando exista) — requisitos funcionales y no funcionales gerenciales.
3. **Propuesta comercial / presentación TagMe** (`TagMe.pdf` o equivalente) — alineación de valor de negocio y promesa al cliente.
4. **Spec y artefactos de Fase 1** (`specs/001-tagme-platform/`) — datos, eventos, entidades y contratos ya implementados (TagMétricas, AVEX, touch events, destination visits).
5. **Constitución global** (`.specify/memory/constitution.md`) — principios transversales no contradichos por esta fase.

### Stakeholders clave

| Rol | Necesidad principal |
|-----|---------------------|
| **Gerente General** | Panorama consolidado del hotel: experiencia huésped, riesgos operativos, tendencias y ROI de TagMe |
| **Gerente de Operaciones / Rooms** | Ocupación de demanda digital, picos de interacción, incidencias por zona, correlación habitación–servicio |
| **Gerente de F&B** | Uso de menú digital, horas pico restaurante/bar, demanda de información vs. capacidad |
| **Gerente de Experiencia / Marketing** | Satisfacción inferida, destinos más consultados, efectividad de contenido y AVEX |
| **Jefe de Recepción / Front Office** | Volumen de consultas AVEX, derivaciones a humano, fricción de conexión, tags con bajo rendimiento |
| **Director de TI / Integraciones** | Límites de integración, exportación de datos, seguridad y roles gerenciales |

### Idioma

Documentación de producto, specs y UI gerencial en **español**. Código y comentarios técnicos pueden estar en inglés cuando mejore claridad.

---

## 3. Información que los Gerentes Deben Ver

TagMe Fase 2 organiza la visibilidad en **cuatro capas**. Cada capa debe ser filtrable por venue, departamento, zona/tag y ventana temporal.

### 3.1 Pulso en tiempo real (Now)

Información que responde: *¿Qué está pasando ahora mismo?*

| Señal | Descripción | Ejemplo de decisión |
|-------|-------------|---------------------|
| **Actividad activa por zona** | Toques e interacciones en los últimos 15–60 minutos por tag/área | Reforzar staff en restaurante si hay pico inesperado |
| **Consultas AVEX en curso / recientes** | Temas frecuentes, derivaciones a humano, preguntas sin respuesta | Desplegar agente en recepción si AVEX deriva masivamente |
| **Incidencias y excepciones** | Tags inactivos, destinos caídos, picos anómalos, caída abrupta de actividad | Escalar a mantenimiento o TI |
| **Estado de salud del sistema** | Disponibilidad de hub, latencia percibida, errores de destino | Validar impacto antes de evento o temporada alta |

### 3.2 Rendimiento operativo (Today / This Week)

Información que responde: *¿El equipo y la experiencia están cumpliendo lo esperado?*

| Señal | Descripción | Ejemplo de decisión |
|-------|-------------|---------------------|
| **Volumen y tendencia de interacciones** | Toques por día/semana vs. período anterior y vs. benchmark del venue | Ajustar promociones o staffing |
| **Distribución horaria** | Franjas pico por departamento (lobby, habitación, F&B) | Alinear turnos con demanda real |
| **Rendimiento por punto NFC / zona** | Comparativo entre tags (lobby vs. habitación 412 vs. restaurante) | Reubicar tags o actualizar contenido en zonas débiles |
| **Efectividad AVEX** | Tasa de resolución, derivaciones, temas top, confianza baja | Actualizar base de conocimiento o capacitar staff |
| **Fricción de acceso** | Proporción NFC directo vs. asistido por staff vs. URL fallback | Invertir en capacitación o señalización física |
| **Destinos y contenido** | % menú, reservas, reseñas, AVEX; cambios tras actualizaciones de contenido | Priorizar qué información falta o está desactualizada |

### 3.3 Experiencia del huésped (Quality)

Información que responde: *¿Los huéspedes están teniendo una buena experiencia digital?*

| Señal | Descripción | Ejemplo de decisión |
|-------|-------------|---------------------|
| **Tiempo hasta contenido útil** | Latencia percibida post-toque hasta hub/destino | Investigar tags o zonas con degradación |
| **Abandono y rebote** | Sesiones sin destino visitado, salida temprana del hub | Revisar UX o relevancia del contenido en esa zona |
| **Satisfacción inferida** | Proxy: repetición de consultas AVEX, derivaciones, consultas sobre lo mismo | Corregir gaps de información o proceso operativo |
| **Perfil de demanda** | Dispositivo, origen geográfico agregado, idioma si aplica | Adaptar contenido para segmentos dominantes |
| **Contexto habitación** | Interacciones por habitación/zona sin PII | Detectar habitaciones con demanda atípica de servicio |

> **Privacidad:** Ninguna vista gerencial debe exponer datos personales identificables del huésped. Solo agregados, señales anonimizadas y contexto de zona/habitación como identificador operativo — heredado de NFR-005 de Fase 1.

### 3.4 Valor y control ejecutivo (ROI)

Información que responde: *¿TagMe está generando retorno y dónde invertir?*

| Señal | Descripción | Ejemplo de decisión |
|-------|-------------|---------------------|
| **Impacto operativo estimado** | Consultas resueltas por AVEX sin staff; reducción inferida de carga en recepción | Justificar expansión de puntos NFC o KB |
| **Eficiencia por departamento** | Señales normalizadas por área (no solo conteos brutos) | Reasignar presupuesto o prioridad de mejoras |
| **Cumplimiento de SLAs internos** | Tiempo de respuesta a alertas, tiempo de corrección de contenido caído | Evaluar desempeño de jefes de área |
| **Comparativos y objetivos** | Meta vs. real por KPI acordado con el hotel | Reuniones de desempeño con datos objetivos |

---

## 4. Comportamientos del Sistema a Nivel Gerencial

Para ser útil a gerentes y jefes de departamento, TagMe Fase 2 **debe** exhibir estos comportamientos:

### 4.1 Alertas y excepciones proactivas

- **DEBE** surfacear anomalías sin que el gerente tenga que buscarlas (caída de actividad, pico inusual, tag inactivo, destino externo fallando, pico de derivaciones AVEX).
- **DEBE** clasificar alertas por severidad (informativa, atención, crítica) y área responsable.
- **DEBE** permitir reconocer, asignar o descartar alertas con trazabilidad (quién, cuándo).
- **NO DEBE** inundar con ruido: reglas de deduplicación y umbrales configurables por venue.

### 4.2 Dashboards por rol y por departamento

- **DEBE** ofrecer vistas diferenciadas por rol gerencial (ejecutivo consolidado vs. operaciones vs. F&B).
- **DEBE** mostrar primero el estado actual y excepciones; el detalle histórico es secundario pero accesible en ≤ 2 clics.
- **DEBE** soportar filtros estándar: venue, rango temporal, departamento/zona, tag.
- **DEBE** funcionar en desktop y tablet (gerencia no usa flujos mobile-first de huésped).

### 4.3 Narrativa y contexto, no solo números

- **DEBE** acompañar KPIs con contexto: variación vs. ayer/semana anterior, benchmark del venue, explicación breve del indicador.
- **DEBE** sugerir acciones cuando sea posible ("Actualizar KB de AVEX — 23% derivaciones por horarios de restaurante").
- **DEBE** vincular métricas a entidades operativas conocidas (tag, zona, destino, tema AVEX) para que el gerente sepa **dónde** actuar.

### 4.4 Tiempo real con degradación elegante

- **DEBE** actualizar vistas de pulso con latencia objetivo ≤ 60 segundos en producción (polling, realtime InsForge o híbrido según plan).
- **DEBE** indicar claramente la antigüedad del dato ("Actualizado hace 45 s").
- **DEBE** seguir mostrando últimos datos conocidos si hay interrupción temporal, con banner de estado degradado.

### 4.5 Control sin ejecutar operaciones ajenas

- **DEBE** permitir acciones de **control gerencial** dentro del alcance de TagMe: priorizar alertas, solicitar corrección de contenido, marcar incidencias revisadas, exportar reportes, configurar umbrales de alerta.
- **NO DEBE** ejecutar operaciones de PMS (check-in/out, cargos, asignación de habitaciones) ni de sistemas housekeeping/POS.
- **PUEDE** enlazar o exportar hacia sistemas externos; la integración bidireccional profunda queda fuera de alcance salvo spec explícita.

### 4.6 Auditoría y confianza

- **DEBE** registrar quién vio qué reporte crítico y qué acciones gerenciales se tomaron (audit trail).
- **DEBE** aplicar RBAC: roles gerenciales distintos de staff de línea; principio de mínimo privilegio.
- **DEBE** mantener coherencia con eventos de Fase 1 (touch_events, destination_visits, AVEX sessions) como fuente primaria de verdad analítica.

---

## 5. Alcance de Fase 2

### 5.1 Dentro del alcance

| Área | Incluido |
|------|----------|
| **Dashboard ejecutivo** | Vista consolidada para Gerente General: pulso, KPIs clave, alertas activas, tendencias |
| **Dashboards por departamento** | Operaciones/Rooms, F&B, Front Office, Experiencia — con KPIs y filtros relevantes |
| **Sistema de alertas gerenciales** | Detección, clasificación, bandeja, reconocimiento y asignación básica |
| **Enriquecimiento de TagMétricas** | Nuevas agregaciones, vistas SQL, métricas derivadas y proxies de experiencia |
| **Reportes ejecutivos** | Resumen semanal/mensual exportable (PDF/CSV) para reuniones de gerencia |
| **Roles y permisos gerenciales** | RBAC extendido: gerente, jefe de departamento, ejecutivo (lectura consolidada) |
| **Configuración de umbrales** | Alertas configurables por venue/departamento sin intervención de desarrollo |
| **Señales AVEX gerenciales** | Temas, derivaciones, gaps de conocimiento, efectividad por período |
| **Correlación zona–demanda** | Análisis por tag, habitación, lobby, restaurante usando datos existentes |
| **Piloto Hotel Caribe** | Validación con escenarios gerenciales reales del venue piloto |

### 5.2 Explícitamente fuera del alcance

| Área | Excluido | Razón |
|------|----------|-------|
| **Nuevo flujo huésped NFC** | Fuera | Entregado en Fase 1; esta fase solo consume sus eventos |
| **Rediseño mayor del hub huésped** | Fuera | Salvo cambios mínimos exigidos por nuevas métricas (instrumentación) |
| **AVEX transaccional** | Fuera | Reservas, pagos y acciones PMS siguen excluidos |
| **Integración PMS bidireccional** | Fuera | TagMe no reemplaza PMS; sin sync de huéspedes, folios ni inventario |
| **Integración housekeeping / POS / CRM** | Fuera | Fuera salvo exportación manual o enlaces; no ETL en tiempo real |
| **App móvil nativa gerencial** | Fuera | Web responsive desktop/tablet es suficiente para MVP de Fase 2 |
| **BI externo completo (Power BI, Looker)** | Fuera | Exportación sí; construcción de cubos externos no |
| **Predicción ML avanzada** | Fuera | Reglas, umbrales y tendencias simples sí; modelos predictivos complejos no |
| **Multi-cadena / marketplace** | Fuera | Piloto + arquitectura preparada; foco en un venue gerencialmente maduro |
| **Hardware NFC nuevo** | Fuera | Fase 1; Fase 2 asume tags ya desplegados o configurables vía admin existente |

### 5.3 Zona gris — requiere spec antes de implementar

- Integraciones de **solo lectura** con PMS u otros sistemas (si aportan contexto sin escribir).
- Notificaciones externas (email, WhatsApp, Slack) para alertas críticas.
- Benchmarks entre múltiples venues de la misma cadena.
- Score compuesto de "experiencia huésped" con fórmula acordada con el cliente.

---

## 6. Estándares Técnicos (Fase 2)

Hereda stack de Fase 1 con extensiones orientadas a gerencia:

| Área | Estándar |
|------|----------|
| **Frontend gerencial** | Nuevas rutas bajo `app/(executive)/` o extensión de `app/(admin)/` según plan; componentes reutilizables de visualización (KPI cards, alert feed, trend charts) |
| **Backend / datos** | InsForge PostgreSQL; vistas SQL y agregaciones para dashboards; evitar duplicar eventos raw de Fase 1 |
| **Tiempo real** | InsForge Realtime o polling inteligente según costo/latencia; decisión documentada en `plan.md` |
| **Contratos** | APIs gerenciales documentadas en `specs/002-clevel/contracts/`; separación clara de APIs staff vs. APIs executive |
| **Visual** | Sensibilidad "geek formal + silent luxury" adaptada a **densidad ejecutiva**: más información por pantalla, jerarquía clara, sin ruido decorativo |
| **Rendimiento** | Dashboard principal carga en ≤ 3 s; filtros responden en ≤ 1 s con datos de piloto |
| **Seguridad** | Auth obligatoria; RLS por rol y venue; datos agregados por defecto; audit log de acciones gerenciales |

---

## 7. Reglas de Flujo de Trabajo (Cómo Debe Comportarse el Agente)

Al trabajar en la rama `002-tagme-clevel` o en artefactos bajo `specs/002-clevel/`, el agente **debe**:

1. **Leer esta Constitution primero** — Antes de proponer código o specs, validar alineación con principios II–V (decisión, visibilidad, capa complementaria, ROI).
2. **Respetar el límite de fase** — No extender flujos huésped NFC, AVEX conversacional ni CMS staff salvo instrumentación mínima para nuevas métricas. Si el usuario pide lo contrario, proponer enmienda de spec o tarea en Fase 1.
3. **Seguir el flujo Spec Kit para Fase 2**:
   - `/speckit.specify` → Spec en `specs/002-clevel/spec.md`
   - `/speckit.clarify` → Resolver ambigüedad en KPIs, roles y umbrales antes del plan
   - `/speckit.plan` → Plan técnico en `specs/002-clevel/plan.md`
   - `/speckit.tasks` → Tareas en `specs/002-clevel/tasks.md`
   - `/speckit.implement` → Solo con spec, plan y tareas claros
4. **Pensar como gerente, no como desarrollador** — Cada propuesta debe incluir: pregunta de negocio, KPI, decisión habilitada y criterio de éxito observable.
5. **Reutilizar datos de Fase 1** — Priorizar vistas, agregaciones y APIs sobre `touch_events`, `destination_visits`, sesiones AVEX y entidades venue/tag existentes antes de crear nuevas fuentes.
6. **Marcar NEEDS CLARIFICATION** — Especialmente en definición de KPIs, fórmulas de ROI, umbrales de alerta, roles gerenciales y límites de integración.
7. **Referenciar propuesta comercial** — Al priorizar features, citar valor para establecimiento y gerencia según TagMe.pdf.
8. **Comunicar trade-offs** — Ej.: tiempo real vs. costo, granularidad vs. privacidad, riqueza de dashboard vs. tiempo de carga.
9. **Mantener al humano en el loop** — Decisiones de UX ejecutiva, definición de KPIs y priorización departamental requieren validación explícita.
10. **No asumir integraciones** — Si un KPI requiere datos fuera de TagMe (PMS, POS), declararlo como dependencia o excluirlo hasta spec aprobada.

### Checklist rápido antes de implementar

- [ ] ¿Responde una pregunta de un gerente o jefe de departamento?
- [ ] ¿Permite una decisión o acción concreta sin abrir otro sistema?
- [ ] ¿Usa datos ya capturados en Fase 1 o justifica nueva instrumentación mínima?
- [ ] ¿Respeta privacidad (sin PII en vistas gerenciales)?
- [ ] ¿Está dentro del alcance de §5 y no contradice §5.2?

---

## 8. Gobernanza

| Tema | Regla |
|------|-------|
| **Enmienda de esta Constitution** | Requiere justificación explícita y versión semántica actualizada. Usar `/speckit.constitution` con contexto `002-clevel`. |
| **Relación con Constitución global** | `.specify/memory/constitution.md` aplica en lo no contradicho. En conflicto, **esta Constitution prevalece para Fase 2**. |
| **Versionado** | MAJOR: cambio de filosofía o eliminación de principio. MINOR: nuevos principios o secciones materiales. PATCH: clarificaciones. |
| **Propiedad de la spec** | El humano decide prioridades y KPIs; el agente estructura y propone. |
| **Proceso de clarificación** | KPIs ambiguos, roles o integraciones → `/speckit.clarify` antes de `/speckit.plan`. |
| **Criterio de done de la fase** | Gerente piloto puede supervisar experiencia y operación del Hotel Caribe durante una semana usando TagMe sin reportes manuales paralelos para las señales cubiertas por la spec. |

---

## 9. Anti-Patrones (Qué Evitamos en Fase 2)

- Dashboards que son dump de gráficos sin narrativa ni acción sugerida.
- KPIs que el gerente no puede interpretar en menos de 10 segundos.
- Construir "otro PMS" o duplicar workflows de check-in, housekeeping o POS.
- Ignorar eventos y modelo de datos de Fase 1 y crear pipelines paralelos innecesarios.
- Alertas sin umbrales, sin severidad o sin dueño — alert fatigue garantizado.
- Exponer PII de huéspedes en vistas gerenciales por conveniencia de desarrollo.
- Implementar tiempo real costoso donde polling de 60 s cumple el requisito de negocio.
- Vibe-coding de pantallas ejecutivas sin user stories de gerentes validadas.
- Asumir que más datos equivalen a más valor sin vínculo a ROI operativo.
- Mezclar alcance de Fase 1 (huésped NFC) con Fase 2 sin enmienda de spec.

---

## 10. Relación con Entregables de Fase 2

| Artefacto | Ubicación | Estado |
|-----------|-----------|--------|
| Constitution | `specs/002-clevel/constitution.md` | ✅ Ratificada v1.0.0 |
| Spec funcional | `specs/002-clevel/spec.md` | Pendiente |
| Plan técnico | `specs/002-clevel/plan.md` | Pendiente |
| Tareas | `specs/002-clevel/tasks.md` | Pendiente |
| Contratos API | `specs/002-clevel/contracts/` | Pendiente |
| Checklists validación | `specs/002-clevel/checklists/` | Pendiente |

---

*Esta Constitution es la fuente de verdad de gobernanza para TagMe Fase 2 — C-Level Visibility & Control. Todo trabajo en la rama `002-tagme-clevel` debe ser coherente con este documento.*
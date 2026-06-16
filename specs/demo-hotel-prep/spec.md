# Especificación: Preparación de Demo para el Hotel

**Directorio de spec**: `specs/demo-hotel-prep/`

**Rama de trabajo**: `demo/preparacion-piloto`

**Creado**: 2026-06-11

**Estado**: Borrador (listo para planificación)

**Input del usuario**: Fase posterior a Fase 3 (M0–M6) con tests estables. El objetivo ya no es desarrollar features, sino preparar una demo profesional para Hotel Caribe by Faranda Grand antes de la semana piloto real.

**Fuentes de verdad complementarias**: `specs/003-staff/` (funcionalidad implementada), `specs/003-staff/guides/capacitacion-piso-caribe.md`, `specs/003-staff/quickstart.md`, `specs/test-stability/spec.md`

**Constitución aplicable**: `.specify/memory/constitution.md` v1.1.0, `specs/003-staff/constitution.md` v1.0.0 (las reglas de producto de Fase 3 siguen vigentes; esta fase no las modifica)

---

## Resumen Ejecutivo

TagMe completó la Fase 3 (staff NFC, feedback, incidencias, scorecards, recepción) y estabilizó la suite de tests. El siguiente paso no es ampliar el producto, sino **demostrar valor operativo al hotel** en una sesión presencial o híbrida con jefes de área, recepción y gerencia.

Esta fase define qué flujos presentar, con qué nivel de pulido, qué datos usar y cómo saber que la demo está lista — sin scope creep ni deuda técnica innecesaria.

| Dimensión | Enfoque de esta fase |
|-----------|----------------------|
| **Audiencia** | Supervisores, jefes de departamento, recepción y gerencia del Hotel Caribe |
| **Tipo de demo** | Operativa y orientada a valor en piso — no pitch de inversores ni walkthrough técnico interno |
| **Tipo de trabajo** | Preparación, datos, guion, correcciones de presentación y smoke tests — **no nuevas funcionalidades** |
| **Horizonte** | Entre el cierre de M6 y el inicio de la semana piloto real |

---

## 1. Objetivo de la Demo

### 1.1 ¿Qué queremos lograr?

| ID | Objetivo | Descripción |
|----|----------|-------------|
| **DEMO-OBJ-01** | Generar confianza operativa | Que el hotel vea que TagMe encaja en su operación diaria sin fricción para staff ni huésped |
| **DEMO-OBJ-02** | Hacer tangible la trazabilidad | Demostrar que cada opinión e incidencia queda vinculada a empleado, departamento, turno o habitación |
| **DEMO-OBJ-03** | Mostrar visibilidad gerencial inmediata | Que supervisores y gerencia vean bandeja de incidencias y scorecards sin esperar reseñas externas |
| **DEMO-OBJ-04** | Preparar el terreno para el piloto | Alinear expectativas, roles y flujos antes de la semana real con staff en piso |
| **DEMO-OBJ-05** | Obtener validación explícita | Salir de la sesión con acuerdo verbal o escrito de proceder al piloto (go/no-go informal) |

### 1.2 Mensaje principal al hotel

> **"TagMe convierte cada interacción del staff con el huésped en dato accionable: el empleado solo acerca su tarjeta NFC, el huésped opina o reporta en segundos, y supervisores y gerencia ven el resultado al instante — antes de que el problema llegue a TripAdvisor."**

Mensajes de apoyo (uno por actor):

| Actor | Mensaje clave |
|-------|---------------|
| **Staff operativo** | "Un toque NFC, sin formularios ni interrumpir el servicio" |
| **Huésped** | "Opinar o reportar un problema en contexto, sin apps ni registro" |
| **Supervisor** | "Incidencias en bandeja y scorecards de mi equipo en tiempo real" |
| **Gerencia** | "Visibilidad por departamento sin depender de reseñas tardías ni proxies de uso" |
| **Recepción** | "La estadía del huésped se vincula desde el check-in; los walk-ins se consolidan sin perder datos" |

### 1.3 Duración y formato esperados

| Parámetro | Valor por defecto |
|-----------|-------------------|
| Duración total | 45–60 minutos |
| Demo en vivo | 25–35 minutos |
| Preguntas y alineación | 15–20 minutos |
| Dispositivos | ≥1 iPhone (Safari) + ≥1 Android; opcional proyector para panel supervisor |
| Presentadores | 1 facilitador TagMe + 1 contacto operativo del hotel (recepción o supervisor) |

---

## 2. Alcance de la Demo

### 2.1 Flujos que deben estar listos y presentables (P1 — obligatorios)

| Flujo | Estado base (post-M6) | Nivel requerido en demo |
|-------|----------------------|-------------------------|
| **Staff NFC → Feedback** | Implementado; E2E estable | Presentación principal; debe ejecutarse en vivo sin fallos |
| **Staff NFC → Incidencia** | Implementado | Presentación principal; debe mostrar llegada a bandeja supervisor |
| **Room NFC → Captura** | Implementado; E2E estable | Presentación secundaria fuerte; muestra captura sin staff presente |
| **Bandeja de incidencias (supervisor)** | Implementado | Debe mostrar incidencia creada en vivo ≤60 s |
| **Scorecard empleado** | Implementado | NPS visible con datos suficientes (n≥6) |
| **Scorecard departamento** | Implementado | Drill-down desde vista supervisor |
| **Login y roles** | Implementado | Transiciones limpias entre staff, supervisor y recepción |

### 2.2 Flujos presentables con menor pulido o simplificados (P2 — deseables)

| Flujo | Tratamiento en demo |
|-------|---------------------|
| **Recepción → estadía formal** | Mostrar generación de cookie; narrar beneficio de vinculación |
| **Consolidación efímera → formal** | Explicar con pantalla o captura estática si el flujo en vivo es lento; idealmente 1 min de demo asistida |
| **Configuración org (turnos, NFC)** | Mencionar que es configurable sin desarrollo; mostrar solo si hay tiempo |
| **Scorecard propio del staff** (`/my-scorecard`) | Mostrar en móvil del empleado demo si hay dispositivo extra |
| **Hub huésped Fase 1** (`/t/caribe-lobby`) | Contexto breve de continuidad; no es foco de la demo |

### 2.3 Explícitamente fuera de esta demo

| Área | Excluido | Razón |
|------|----------|-------|
| **Nuevas funcionalidades** | Fuera | Esta fase es preparación, no desarrollo |
| **Dashboards C-Level / ROI Fase 2** | Fuera | Audiencia operativa; evita confusión y scope creep |
| **AVEX / chat IA** | Fuera del guion principal | Complemento Fase 1; mencionar solo si preguntan |
| **Admin de contenido / tags Fase 1** | Fuera | No aporta al mensaje de trazabilidad operativa |
| **Integración PMS** | Fuera | No existe; no prometer |
| **Notificaciones push/WhatsApp/email** | Fuera | Pendiente decisión de negocio |
| **Gamificación o rankings públicos** | Fuera | Scorecards son herramienta gerencial, no competencia |
| **Pulido visual de nivel inversor** | Fuera | Suficiente profesionalismo operativo, no rebranding |
| **Semana piloto completa** | Fuera | La demo precede al piloto; no simular 7 días de operación |
| **Tests RLS con JWT reales en vivo** | Fuera | Validación interna previa; no es espectáculo para el hotel |

### 2.4 Límites de trabajo permitidos en esta fase

Solo se autoriza trabajo que mejore la **presentabilidad** sin ampliar alcance funcional:

| Permitido | No permitido |
|-----------|--------------|
| Corrección de bugs que bloqueen el guion de demo | Nuevos endpoints, tablas o flujos |
| Ajustes de copy/UX que eliminen ambigüedad en pantallas del guion | Rediseño visual amplio |
| Seed o curación de datos demo realistas | Integraciones externas |
| Documentación del guion y checklist pre-demo | Refactors no relacionados |
| Smoke tests manuales y automatizados del guion | Expansión de cobertura E2E fuera del guion |

---

## 3. Flujos Prioritarios

Los flujos están ordenados como **guion narrativo** para la sesión con el hotel. Cada uno es independientemente demostrable.

---

### Flujo 1 — Staff NFC → Feedback (Prioridad: P1) 🎯 Apertura de la demo

Como **mesero o camarista del Hotel Caribe**, quiero **acercar mi tarjeta NFC al móvil del huésped para que deje una calificación en segundos**, para **demostrar que el staff convierte la interacción en dato trazable sin interrumpir el servicio**.

**Por qué esta prioridad**: Es el cambio de paradigma central de TagMe Fase 3 y el momento más memorable para la audiencia.

**Prueba independiente**: Abrir URL de staff demo → elegir Feedback → calificar → ver confirmación; verificar que el scorecard del empleado refleja el nuevo registro.

**Escenarios de aceptación**:

1. **Dado** un empleado piloto con NFC activo (ej. María G.), **Cuando** se abre `/s/caribe-staff-maria-g` en móvil, **Entonces** aparece pantalla de captura con nombre del empleado y temporizador de 5 minutos en ≤3 segundos.
2. **Dado** la sesión activa, **Cuando** el huésped envía feedback con calificación 1–5, **Entonces** ve confirmación clara y la sesión queda cerrada.
3. **Dado** el feedback enviado, **Cuando** el supervisor consulta scorecards, **Entonces** el nuevo registro impacta la métrica del empleado en ≤60 segundos.

**Empleados demo sugeridos**: `caribe-staff-maria-g` (Housekeeping), `caribe-staff-carlos-p` (Housekeeping) — slugs del seed Hotel Caribe.

---

### Flujo 2 — Staff NFC → Incidencia → Bandeja Supervisor (Prioridad: P1)

Como **huésped**, quiero **reportar un problema operativo tras la interacción con el staff**, para **que el hotel lo atienda antes de que escale a canales públicos**. Como **supervisor**, quiero **ver la incidencia en mi bandeja de inmediato**, para **asignar y cerrar el caso con trazabilidad**.

**Por qué esta prioridad**: Demuestra el valor diferencial Feedback ≠ Incidencia y la visibilidad para supervisores.

**Prueba independiente**: Crear incidencia vía NFC staff → login supervisor del departamento → ver en `/incidents` → avanzar al menos a estado `en_progreso` o `resuelta`.

**Escenarios de aceptación**:

1. **Dado** una sesión staff activa, **Cuando** el huésped elige Incidencia y completa categoría + descripción, **Entonces** no se solicita calificación numérica (flujo separado de feedback).
2. **Dado** la incidencia enviada, **Cuando** el supervisor del departamento ruteado abre `/incidents`, **Entonces** la incidencia aparece con estado `abierta` en ≤60 segundos.
3. **Dado** la incidencia visible, **Cuando** el supervisor cambia su estado, **Entonces** el historial de estados queda registrado sin errores visibles.

**Categoría demo sugerida**: Mantenimiento (prioridad alta) o Ruido — según narrativa con el hotel.

---

### Flujo 3 — Room NFC → Captura desde habitación (Prioridad: P1)

Como **huésped en habitación**, quiero **reportar un problema o dejar opinión desde el tag fijo de la habitación sin esperar al staff**, para **mostrar captura contextual cuando no hay empleado presente**.

**Por qué esta prioridad**: Complementa el flujo staff-led y demuestra trazabilidad por origen `room_nfc`.

**Prueba independiente**: Abrir `/capture/room/caribe-room-412` en incógnito → ver contexto "Habitación 412" → enviar incidencia o feedback → verificar origen habitación en bandeja o métricas.

**Escenarios de aceptación**:

1. **Dado** el tag `caribe-room-412`, **Cuando** el huésped abre la URL de captura, **Entonces** ve contexto de habitación claro (número/zona) y opciones Feedback/Incidencia.
2. **Dado** el envío desde habitación, **Cuando** se consulta el registro, **Entonces** el origen es habitación/zona, sin `staff_member_id` obligatorio.
3. **Dado** el hub de habitación `/t/caribe-room-412`, **Cuando** el huésped navega al CTA de captura, **Entonces** llega al mismo flujo sin colisión con URLs de staff `/s/`.

**Habitación demo**: `caribe-room-412` (seed piloto).

---

### Flujo 4 — Scorecards básicos: Empleado y Departamento (Prioridad: P1)

Como **supervisor**, quiero **ver el desempeño de mi equipo por empleado y por departamento**, para **tomar decisiones operativas con datos directos del huésped, no solo proxies de uso**.

**Por qué esta prioridad**: Cierra el arco narrativo "captura → visibilidad" que más importa a gerencia.

**Prueba independiente**: Login supervisor → `/scorecards` → seleccionar periodo → drill-down a empleado con NPS visible (n≥6).

**Escenarios de aceptación**:

1. **Dado** ≥6 feedbacks para un empleado piloto en el periodo, **Cuando** el supervisor abre scorecard del empleado, **Entonces** el NPS interno es visible (no muestra "datos insuficientes").
2. **Dado** la vista de departamento, **Cuando** el supervisor explora el periodo demo, **Entonces** ve agregación coherente con los feedbacks capturados en la sesión.
3. **Dado** un usuario staff operativo, **Cuando** accede a `/my-scorecard`, **Entonces** ve su propia métrica sin comentarios textuales de huéspedes (privacidad).

**Datos**: Ejecutar `seed-scorecard-feedbacks.ts` antes de la demo para garantizar n≥6 en empleados piloto.

---

### Flujo 5 — Recepción + Consolidación (Prioridad: P2)

Como **recepcionista**, quiero **generar la estadía formal del huésped y consolidar walk-ins**, para **que todos los registros queden bajo una misma identidad de estadía**.

**Por qué esta prioridad**: Importante para el piloto real, pero secundario en la narrativa de demo si el tiempo apremia.

**Prueba independiente**: Login recepción → `/reception` genera estadía → (opcional) `/reception/consolidate` vincula efímera previa.

**Escenarios de aceptación**:

1. **Dado** usuario de recepción autenticado, **Cuando** accede a `/reception`, **Entonces** puede generar estadía formal sin errores.
2. **Dado** una estadía efímera creada por walk-in, **Cuando** recepción consolida, **Entonces** los registros previos se preservan bajo la estadía formal.
3. **Dado** tiempo limitado en demo, **Cuando** el facilitador opta por narración asistida, **Entonces** al menos la pantalla de recepción carga correctamente y el concepto queda explicado.

---

### Edge cases relevantes para la demo

| Situación | Comportamiento esperado en demo |
|-----------|--------------------------------|
| Tag NFC inválido o revocado | Mensaje claro "no encontrado"; facilitador no usa tags rotos en el guion |
| Sesión staff expirada (5 min) | Mensaje comprensible; facilitador reinicia con nuevo toque |
| Sin conectividad en el salón | Tener hotspot de respaldo; URLs precargadas en favoritos |
| iOS Safari NFC | Probar previamente según `specs/003-staff/checklists/ios-nfc-tr08.md` |
| Empleado sin turno asignado | Feedback se registra; scorecard muestra "sin turno" — mencionar como configuración pendiente, no como fallo |
| NPS con n<6 | No usar ese empleado como protagonista del scorecard en vivo |

---

## 4. Criterios de Calidad para la Demo

### 4.1 ¿Qué es "suficientemente presentable"?

Un flujo se considera **demo-ready** cuando cumple **todas** las condiciones:

| Criterio | Umbral |
|----------|--------|
| **Carga inicial** | Pantalla útil en ≤3 s en red 4G/WiFi del venue |
| **Sin errores visibles** | Cero pantallas de error 500, stack traces o mensajes técnicos en el guion |
| **Copy en español claro** | Sin placeholders, "Próximamente" ni textos de desarrollo en flujos del guion |
| **Confirmación al huésped** | Toda captura termina con pantalla de agradecimiento o confirmación inequívoca |
| **Trazabilidad verificable** | Cada captura demo aparece en bandeja o scorecard sin intervención manual en BD |
| **Roles correctos** | Cada login muestra solo lo que ese rol debe ver (supervisor no ve otros departamentos) |
| **Repetibilidad** | El guion completo se puede ejecutar 2 veces seguidas sin degradación |

### 4.2 Nivel de pulido visual y UX

| Aspecto | Expectativa demo | No requerido |
|---------|------------------|--------------|
| **Mobile-first** | Todos los flujos huésped probados en pantalla de móvil real | Responsive perfecto en tablet/desktop |
| **Identidad visual** | Coherente con TagMe actual; logos y colores del hotel donde ya existan | Rediseño de marca o animaciones nuevas |
| **Jerarquía de información** | Nombre del empleado, habitación y temporizador visibles sin scroll | Micro-interacciones o ilustraciones custom |
| **Formularios** | Campos mínimos, etiquetas claras, botones con verbo de acción | Validación avanzada o autocompletado nuevo |
| **Panel supervisor** | Tablas legibles, estados de incidencia comprensibles | Gráficos ejecutivos o exportación PDF |
| **Accesibilidad** | Contraste legible en proyector; tamaño táctil adecuado | Auditoría WCAG completa |

### 4.3 Estrategia de datos

| Capa | Enfoque recomendado |
|------|---------------------|
| **Estructura organizacional** | Seed actual `seed-hotel-caribe-staff.ts` — departamentos reales (Recepción, HK, F&B, Mantenimiento) |
| **Scorecards** | Seed `seed-scorecard-feedbacks.ts` **más** capturas en vivo durante la demo para mostrar actualización en tiempo real |
| **Incidencias abiertas** | 2–3 incidencias precargadas en estados distintos (`abierta`, `en_progreso`) para que la bandeja no arranque vacía |
| **Comentarios de feedback** | Textos realistas en español colombiano ("Excelente atención en el desayuno", "Demora en el room service") — no lorem ipsum |
| **Huéspedes** | Sin PII real; usar narrativa ficticia ("huésped habitación 412") |
| **Reset** | Procedimiento documentado para limpiar capturas de prueba post-demo sin afectar seed base |

**Regla**: Los datos precargados sirven de **contexto**; la demo debe incluir al menos **una captura en vivo** por flujo principal (feedback, incidencia, room) para demostrar que el sistema funciona en el momento.

### 4.4 Guion de demo (orden sugerido)

| Paso | Duración | Actor | Acción |
|------|----------|-------|--------|
| 1 | 3 min | Facilitador | Contexto: problema de reseñas tardías + propuesta TagMe |
| 2 | 7 min | Staff demo | NFC → Feedback en vivo → confirmación |
| 3 | 7 min | Staff demo | NFC → Incidencia → cambio a panel supervisor |
| 4 | 5 min | Huésped demo | Room NFC habitación 412 → incidencia o feedback |
| 5 | 7 min | Supervisor | Scorecards empleado + departamento con drill-down |
| 6 | 5 min | Recepción | Estadía formal (+ consolidación si hay tiempo) |
| 7 | 5 min | Todos | Preguntas, alineación piloto, próximos pasos |

---

## 5. Riesgos y Suposiciones

### 5.1 Riesgos

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| **R-01** | NFC no funciona en iOS Safari del dispositivo del hotel | Alto — flujo principal falla | Prueba previa TR-08; tener QR impreso como fallback; dispositivo TagMe de respaldo |
| **R-02** | Red WiFi del hotel bloquea o ralentiza la app | Alto | Hotspot dedicado; demo en URL de producción/staging estable; precargar páginas |
| **R-03** | Scorecard sin n≥6 en empleado protagonista | Medio — anticlimax en scorecards | Ejecutar seed de feedbacks 24 h antes; verificar NPS visible |
| **R-04** | Incidencia no aparece en bandeja en vivo | Alto — pierde credibilidad supervisor | Smoke test mismo día; verificar `supervisor_department_assignments` |
| **R-05** | Credenciales demo expiradas o RLS bloquea rol | Alto | Validar logins supervisor/recepción/staff 1 h antes |
| **R-06** | Scope creep durante preparación ("solo una feature más") | Medio — retrasa demo | Esta spec es límite; cambios requieren enmienda explícita |
| **R-07** | Datos de prueba con comentarios inapropiados | Bajo | Curar seeds; moderar textos demo |
| **R-08** | Sesión staff expira durante explicación del facilitador | Medio | Mantener segunda tarjeta/URL lista; reiniciar sin narrar el error como bug |

### 5.2 Suposiciones

| ID | Suposición |
|----|------------|
| **A-01** | Fase 3 M0–M6 está desplegada en el entorno que se usará para la demo (producción piloto o staging equivalente) |
| **A-02** | La suite Vitest + Playwright está verde en el commit desplegado |
| **A-03** | El seed Hotel Caribe (`hotel-caribe`) está aplicado con ≥3 empleados NFC activos |
| **A-04** | Existen usuarios autenticables para supervisor, recepción y al menos un staff demo |
| **A-05** | El hotel proveerá ≥1 persona de operaciones (supervisor o jefe de área) en la sesión |
| **A-06** | La demo ocurre antes de la semana piloto; no reemplaza la capacitación de piso documentada en `capacitacion-piso-caribe.md` |
| **A-07** | No habrá integración PMS demostrada ni prometida en esta sesión |
| **A-08** | Correcciones permitidas en esta fase se limitan a bugs de presentación, no a nuevas features |
| **A-09** | El facilitador TagMe domina el guion y tiene acceso a InsForge/URLs de admin si necesita verificación rápida |

---

## 6. Criterios de Éxito

### 6.1 La demo está lista para presentarse cuando:

| ID | Criterio | Verificación |
|----|----------|--------------|
| **READY-01** | Guion completo ejecutado sin errores en ensayo general ≤48 h antes | Checklist pre-demo firmado por facilitador |
| **READY-02** | Los 4 flujos P1 completan captura en vivo + visibilidad en panel | Smoke manual siguiendo §4.4 |
| **READY-03** | Scorecard de ≥1 empleado piloto muestra NPS (n≥6) | Pantalla `/scorecards` verificada |
| **READY-04** | Bandeja `/incidents` muestra incidencias precargadas + la creada en ensayo | Supervisor del depto correcto |
| **READY-05** | Logins de supervisor, recepción y staff funcionan | 3 accesos verificados mismo día |
| **READY-06** | Dispositivos iOS + Android probados con URLs del guion | Registro en checklist pre-demo |
| **READY-07** | Datos demo curados (sin lorem ni PII real) | Revisión visual de bandeja y scorecards |
| **READY-08** | Ensayo ≤60 min total | Cronometrado en ensayo |

### 6.2 La demo fue exitosa con el hotel cuando:

| ID | Criterio | Señal |
|----|----------|-------|
| **SUCCESS-01** | El hotel articula el valor de trazabilidad con sus propias palabras | Retroalimentación verbal en sesión |
| **SUCCESS-02** | Supervisores/gerencia validan que la bandeja y scorecards son útiles para su operación | Preguntas operativas, no solo técnicas |
| **SUCCESS-03** | No hubo fallos bloqueantes en flujos P1 durante la sesión | Cero recuperaciones de "esto normalmente funciona" |
| **SUCCESS-04** | Acuerdo de proceder a semana piloto o fecha propuesta | Compromiso explícito al cierre |
| **SUCCESS-05** | Lista corta de ajustes pre-piloto capturada (≤5 ítems) | Documento o notas post-demo |

### 6.3 Criterios medibles (tecnología-agnósticos)

| ID | Métrica | Objetivo |
|----|---------|----------|
| **SC-D01** | Tiempo de apertura de captura staff | ≤3 s en 9/10 intentos del ensayo |
| **SC-D02** | Tiempo de aparición de incidencia en bandeja | ≤60 s tras envío |
| **SC-D03** | Tiempo de actualización de scorecard post-feedback | ≤60 s |
| **SC-D04** | Duración del guion en ensayo | ≤60 min |
| **SC-D05** | Flujos P1 completados en ensayo general | 4/4 sin intervención manual en base de datos |
| **SC-D06** | Repetibilidad del guion | 2 ejecuciones consecutivas exitosas |

---

## Requisitos Funcionales (preparación de demo)

Requisitos de **esta fase** — no de producto nuevo. Cada uno es verificable.

| ID | Requisito |
|----|-----------|
| **FR-D01** | Debe existir un guion de demo documentado con orden, duración, URLs y credenciales de respaldo |
| **FR-D02** | Los flujos P1 deben tener checklist de smoke pre-demo ejecutable en ≤30 min |
| **FR-D03** | Los datos demo deben incluir estructura organizacional Hotel Caribe y ≥6 feedbacks por empleado protagonista |
| **FR-D04** | La bandeja de incidencias debe mostrar al menos 2 incidencias en estados distintos antes de la sesión |
| **FR-D05** | Debe existir procedimiento de reset de capturas de prueba post-ensayo sin destruir seed base |
| **FR-D06** | Los textos visibles en flujos del guion deben estar en español sin placeholders de desarrollo |
| **FR-D07** | Debe verificarse fallback QR/NFC para cada empleado protagonista del guion |
| **FR-D08** | Solo se permiten correcciones de bugs que afecten flujos del guion; toda corrección se documenta |
| **FR-D09** | El facilitador debe tener acceso a guía de capacitación `capacitacion-piso-caribe.md` impresa o offline |
| **FR-D10** | La demo debe poder realizarse sin explicar detalles técnicos (InsForge, RLS, stack) al hotel |

---

## Entidades Clave (contexto de demo)

| Entidad | Rol en la demo |
|---------|----------------|
| **Empleado staff + NFC** | Punto de inicio del flujo principal; rostro humano de la trazabilidad |
| **Sesión de captura efímera** | Ventana de 5 min que el facilitador debe narrar |
| **Feedback** | Calificación + comentario opcional → alimenta scorecard |
| **Incidencia** | Problema operativo → bandeja supervisor con workflow de estados |
| **Estadía de huésped** | Cookie que vincula capturas; formal vs efímera |
| **Scorecard jerárquico** | Empleado y departamento como vistas demo |
| **Departamento / turno** | Contexto organizacional que el hotel reconoce |

---

## Dependencias

| Dependencia | Estado esperado |
|-------------|-----------------|
| Fase 3 M0–M6 implementada | Completa |
| Tests estables (`specs/test-stability`) | Vitest + Playwright verdes |
| Seed Hotel Caribe | Aplicado en entorno demo |
| Usuarios piloto (supervisor, recepción, staff) | Creados vía `seed-pilot-users.ts` |
| Guía capacitación piso | Disponible en `specs/003-staff/guides/` |
| Checklist semana piloto | Referencia post-demo, no sustituto de esta fase |

---

## Próximos pasos sugeridos

1. `/speckit.plan` — plan técnico de preparación (guion, seeds, smoke tests, correcciones mínimas)
2. `/speckit.tasks` — tareas accionables con due dates antes de la fecha de demo
3. Ensayo general con checklist `checklists/requirements.md` completado
4. Tras demo exitosa → iniciar semana piloto según `specs/003-staff/checklists/pilot-week.md`
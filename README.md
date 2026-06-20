TagMe Platform — Documento tecnico para hackathon de InsForge
=================================================================
Proyecto: plataforma NFC/IoT para hospitalidad (piloto Hotel Caribe by Faranda Grand)
Stack: Next.js 15 (App Router), TypeScript, React 19, Tailwind, Zod, Vitest, Playwright
Backend: InsForge (BaaS Postgres + Auth + RLS + Storage listo + AI listo)

Resumen ejecutivo
-----------------
TagMe convierte tags NFC en experiencias digitales para hoteles:
- Huésped: abre el hub por tag, navega destinos, chatea con AVEX AI, deja feedback o reporta incidencias.
- Staff/recepcion: abre capturas asistidas, gestiona estadías y consolida estancias.
- Supervisor: administra incidencias, scorecards y organizacion del equipo.
- Ejecutivo: visualiza pulso del hotel, alertas, ROI, KPIs y exporta reportes.
- Admin: configura tags NFC, experiencia del hub, base de conocimiento AVEX y métricas.

Este documento cubre router por router, feature por feature, y mapea explicitamente la relacion
con InsForge para que los duenos de la plataforma vean el uso real de su tecnologia.

1. Stack tecnologico completo
-----------------------------
Frontend/Runtime
- Next.js 15.5 con App Router y Turbopack.
- React 19.
- Tailwind CSS 3.4.
- Zod 3.24 para validacion de payloads.

Backend/BaaS
- InsForge como backend unico (DB, Auth, RLS, Storage, AI, Realtime listos).
- SDK oficial @insforge/sdk para server y @insforge/sdk/ssr para SSR.
- OpenRouter solo para streaming de AVEX en MVP (OpenAI GPT-4o-mini).

Pruebas y calidad
- Vitest para unit y contract tests.
- Playwright para e2e.
- 14 archivos de migracion SQL versionadas.

Infraestructura
- Vercel como hosting (frontend edge SSR + API routes).
- Variables publicas/prefixed NEXT_PUBLIC_* para browser client.

2. Estructura del repositorio
------------------------------
app/                           # Next.js App Router
  (admin)/                    # Panel staff/admin
    layout.tsx
    dashboard/page.tsx         # Metricas (TagMetricas M6)
    tags/page.tsx              # Admin de tags NFC
    content/page.tsx           # Experiencia del hub y destinos
    knowledge/page.tsx         # Base de conocimiento AVEX
    simulator/page.tsx         # Simulador NFC para demo
  (executive)/                # Panel ejecutivo
    layout.tsx
    executive/
      overview/page.tsx        # Panorama general del hotel
      alerts/page.tsx          # Bandeja de alertas gerenciales
      reports/page.tsx         # Reportes exportables CSV
      roi/page.tsx             # ROI operativo
      kpis/page.tsx            # KPIs y umbrales
      experience/page.tsx      # Vista experiencia (scope)
      fnb/page.tsx             # Vista F&B (scope)
      front-office/page.tsx    # Vista Front Office (scope)
      operations/page.tsx      # Vista Operaciones (scope)
      settings/page.tsx        # Ajustes ejecutivos
  (guest)/                    # Experiencia del huesped
    layout.tsx
    s/[tagSlug]/page.tsx       # Entrada staff simulada para capture
    t/[tagSlug]/page.tsx       # Hub publico por tag NFC (Edge runtime)
    capture/[sessionToken]/page.tsx  # Captura feedback/incidente por staff
    capture/room/[tagSlug]/page.tsx  # Captura directa desde habitacion/zona
  (staff)/                    # Panel staff
    layout.tsx
    my-scorecard/page.tsx      # Mi scorecard
    reception/                 # Recepcion
      layout.tsx
      page.tsx                 # Gestion de estadias
      consolidate/page.tsx     # Consolidacion de estancias
  (supervisor)/               # Panel supervisor
    layout.tsx
    incidents/page.tsx         # Bandeja de incidencias
    scorecards/page.tsx        # Scorecards y drill-down
    pulse/page.tsx             # Pulso del hotel
    organization/              # Organigram/CRUD
      page.tsx, departments/, job-roles/, shifts/, staff/, settings/
  api/                        # BFF routes (Next.js Route Handlers)
    admin/*                    # Tags, knowledge, experience, me
    auth/*                     # Sign-in, sign-out, refresh token
    avex/chat/route.ts         # Streaming chat AVEX
    capture/*                  # Submit feedback e incidentes
    events/*                   # Touch events y destination events
    executive/*                # Alerts, KPIs, overview, ROI, reports, pulse
    metrics/*                  # Summary y feedback-summary
    reception/stays/*          # CRUD stays y close
    scorecards/*               # Hotel, department, employee
    staff/sessions/*           # Open and read staff capture sessions
    supervisor/*               # Incidents, departments, staff, shifts, etc.
  login/page.tsx
  page.tsx                    # Home / preview

components/                   # UI components (guest, staff, supervisor, executive, admin)
lib/                           # Core logic (server-safe)
  insforge.ts                 # Cliente generico InsForge
  insforge-browser.ts         # Cliente browser InsForge (browser SPA)
  insforge-server.ts          # Cliente server/service role
  insforge-ssr.ts             # Cliente SSR por request (cookies)
  auth/session.ts             # Sesiones extendidas + helpers de autorizacion
  analytics/*                 # Tracking y metrics
  admin/*                     # Simulador, tags, venue config
  avex/*                      # Chat AI, guardrails, knowledge, prompt, session
  capture/*                   # Submit feedback/incident, room capture
  executive/*                 # Alerts, baselines, KPIs, ROI, reports, scope, audit
  scorecards/*                # NPS, query hotel/department/employee, aggregates
  staff/*                     # Capture sessions, shifts, tags, stays, venue settings
  stays/*                     # Ephemeral/formal stays, consolidate, cookie, token
  supervisor/*                # Incidents, org CRUD, routing, transitions, scope
  tags/*                      # Resolve tag por slug
  validators/*                # Schemas Zod por dominio

migrations/                   # Schema + RLS + vistas versionadas (Postgres)
scripts/                      # Seeds y migraciones programaticas
tests/                        # Unit, contract y e2e
specs/                        # Product specs legacy (referencia historica)

3. Modelo de datos InsForge (tables)
--------------------------------------
Tablas base (core)
- venues
- nfc_tags
- experience_configs
- user_profiles

Staff y organizacion
- staff_members
- departments
- job_roles
- shifts
- supervisor_department_assignments
- staff_shift_assignments
- staff_nfc_tags
- venue_staff_settings
- venue_incident_categories

Guest experiencia
- guest_stays
- staff_capture_sessions
- touch_events
- destination_visits
- feedback_entries
- incident_reports
- incident_status_history

Executive
- executive_alerts
- executive_audit_log
- executive_settings
- kpi_targets
- venue_baseline

AVEX
- avex_sessions
- avex_messages
- knowledge_entries
- content_audit_log

4. Servicios de InsForge utilizados
------------------------------------
4.1 @insforge/sdk (server)
- Cliente service-role para bypass RLS en API routes y scripts.
- Base URL desde INSFORGE_URL, service key desde INSFORGE_SERVICE_KEY.

4.2 @insforge/sdk/ssr
- createServerClient() para SSR con cookies del request.
- setAuthCookies / clearAuthCookies en ruta sign-in/sign-out.
- createRefreshAuthRouter() en POST /api/auth/refresh.
- Cookies HTTP-only en producción.

4.3 Base de datos
- Lecturas y escrituras a 20+ tablas.
- Relaciones con joins en selects (relaciones tipo "inner / left").
- insert([...]) batch, upsert([...]), eq/maybeSingle/order/select.

4.4 Auth
- signInWithPassword para login con credenciales.
- getCurrentUser para resolver sesion en SSR.
- auth.users(id) en RLS helpers (FK hacia auth.users).

4.5 RLS (Row Level Security)
- Políticas versionadas en SQL + helpers STABLE SECURITY DEFINER.
- Control de acceso por rol, venue y scope de departamento.

4.6 Storage
- Preparado por CLI/skill InsForge; en el codigo analizado no hay uploads directos.

4.7 Realtime
- No se detectaron suscripciones en runtime.

4.8 Edge Functions
- No se usa runtime de InsForge; el proyecto usa Vercel Edge para /t/*.

4.9 AI Gateway
- No se usa el modulo AI de InsForge en runtime; AVEX consume OpenRouter.

4.10 Payments/stripe
- No se usa.

Resumen: se usa InsForge como backend persistente y auth-first. No se usan payments ni realtime ni edge functions de InsForge; las piezas que no encajan en InsForge (SSR streaming, Vercel Edge) se implementan con Next.js runtime.

5. Flujo de autenticacion y sesion
-----------------------------------
5.1 Login (Password)
Ruta: app/api/auth/sign-in/route.ts
- Recibe credenciales validadas con Zod.
- Crea cliente SSR InsForge.
- Llama signInWithPassword.
- Pone cookies insforge_access_token e insforge_refresh_token.
- No persiste sesion propia; confia en el token InsForge.

5.2 Refresh automatico
Ruta: app/api/auth/refresh/route.ts
- Delegado a createRefreshAuthRouter() del SDK.
- Sin custom logic.

5.3 Sesion extendida (StaffSession / ExecutiveSession)
Archivo: lib/auth/session.ts
- getSession/getSessionFromRequest consultan auth.getCurrentUser() y luego user_profiles.
- Mapean roles: staff, admin, ops, supervisor, manager, department_head, executive.
- Ejecutivos agregan executive_scope (operations/fnb/experience/front_office).
- Staff agrega staffMemberId desde staff_members.
- Bypass dev por bearer token STAFF_DEV_TOKEN.

5.4 Proteccion de rutas
- Middleware (middleware.ts) revisa cookie insforge_access_token.
- Protege rutas de admin, executive, staff, supervisor.
- Layouts aplican redirects adicionales por rol.
- Helpers exportados: requireStaff, requireAdmin, requireEditor, requireExecutive,
  requireSupervisor, requireSupervisorPanel, requireManager, requireReception.

5.5 Variables de entorno
- INSFORGE_URL
- INSFORGE_ANON_KEY
- INSFORGE_SERVICE_KEY
- NEXT_PUBLIC_INSFORGE_URL
- NEXT_PUBLIC_INSFORGE_ANON_KEY
- NEXT_PUBLIC_APP_URL
- OPENROUTER_API_KEY (AVEX)
- STAFF_DEV_TOKEN (opcional dev)
- STAFF_DEV_ROLE, STAFF_DEV_NAME, STAFF_DEV_VENUE_SLUG, STAFF_DEV_STAFF_MEMBER_ID
- STAFF_DEV_EXECUTIVE_ROLE (opcional dev)
- STAFF_DEV_EXECUTIVE_SCOPE (opcional dev)
- STAFF_SEED_PILOT_PASSWORD (seed)

6. Seguridad y autorizacion por rol y scope
--------------------------------------------
6.1 Staff y Admin
- Venue access control por user_profiles.venue_id.
- Admin tiene acceso a todos los venues piloto.
- Rol ops = solo lectura en contenido.

6.2 Supervisor
- scope por departamento: supervisor_department_assignments asigna IDs de department.
- Manager = scope por venue.
- Admin = sin restriccion de departamento.

6.3 Ejecutivo
- Roles: executive, manager, department_head.
- Scope por dominio: operations, fnb, experience, front_office.
- getAccessibleDashboards() habilita/deshabilita dashboards.

6.4 Helpers SQL (RLS)
- current_user_profile(), user_venue_id(), user_role()
- is_venue_staff(target_venue_id)
- is_admin()
- can_access_pilot_venue()
- can_read_venue_metrics()
- supervisor_department_ids()
- staff_member_id_for_user()
- is_manager()
- is_reception_staff()

7. Guest flows (Frontstage)
----------------------------
7.1 Hub publico por tag (Edge runtime)
Ruta: app/(guest)/t/[tagSlug]/page.tsx
- Ejecuta en Vercel Edge (runtime=edge) para baja latencia.
- resolveTag consulta nfc_tags + venues + experience_configs.
- Renderiza GuestHub con: titulo, mensaje bienvenida, destinos, AVEX opcional, contexto de habitacion.
- Revalida cada 60s (revalidate=60).

7.2 Entrada staff / simulación
Ruta: app/(guest)/s/[tagSlug]/page.tsx
- Genera fingerprint del servidor (user-agent + x-forwarded-for).
- openCaptureSession crea staff_capture_sessions con TTL y dedup.
- Redirige a /capture/[sessionToken].

7.3 Capture desde staff
Ruta: app/(guest)/capture/[sessionToken]/page.tsx
- Valida token UUID v4.
- validateSession consulta staff_capture_sessions.
- Renderiza CaptureFlow (Feedback o Incident).
- SessionExpired si expiro.
- Polling a /api/staff/sessions/[sessionToken] para countdown.

7.4 Capture desde habitacion/zona
Ruta: app/(guest)/capture/room/[tagSlug]/page.tsx
- resolveRoomCapture incluye roomContext (habitacion o zona publica).
- Incidentos y feedback se envian con origen room_nfc y room metadata.
- Sin necesidad de sesion previa.

7.5 AVEX Chat (AI concierge en el hub)
Archivos: lib/avex/*
- Se renderiza en GuestHub solo si experience_config.avex_enabled=true.
- Contexto: tag NFC, informacion de contacto del venue.
- Base de conocimiento: knowledge_entries activas inyectadas en el prompt.
- Guardrails: bloquea datos sensibles, detecta reservas/pagos, deriva a humano.
- Streaming: SSE hacia el cliente desde OpenRouter.
- Rate limit por sesion: 20 msgs/hora en avex_sessions.
- Sin embeddings en MVP; el corpus se inyecta como texto plano en el prompt del sistema.

8. Staff y Supervisor flows (Backstage)
----------------------------------------
8.1 Sesiones de captura (staff)
Archivo: lib/staff/open-capture-session.ts
- apertura valida tag NFC staff, aplica TTL, deduplica por client fingerprint.
- crea touch_event tipo staff_capture_open con metadata de dedup.
- Resuelve shift activo delstaff para trazabilidad.

8.2 Feedback
- Submit via /api/capture/feedback.
- completa staff_capture_sessions a status=completed y guarda guest_stay_id.
- origen: staff_nfc o room_nfc.

8.3 Incidentes
- Submit via /api/capture/incident.
- Crea incident_reports y vincula sesion/room tag.
- Supervisor cambia estados (abierta -> en_progreso -> resuelta -> cerrada) con historial.

8.4 Estancias
- Ephemeral stay (cookie), formal stay (reception) y consolidacion.
- Token de stay vincula feedbacks de un huesped en la misma visita.
- closeGuestStay cierra formalmente la estancia.

8.5 Scorecards
- Scorecard por hotel, departamento y empleado.
- Solo considera origin_type = staff_nfc por diseño.
- NPS calculado sobre feedbacks con umbral configurable.
- Drill-down permite ver comentarios de huéspedes.

8.6 Organizacion (supervisor CRUD)
- CRUD de departments, job_roles, shifts.
- Staff members y asignaciones NFC.
- Venue settings (TTLs, categorias, umbrales).
- Scope por departamento del supervisor en todas las consultas.

9. Executive visibility layer
------------------------------
9.1 Overview
- KPIs (occupancy-like proxy via touches), tendencia 7d/30d, ROI, resumen por departamento.
- CalibrationBanner explica umbrales (14 dias + 100 toques).

9.2 Alertas
- Motor de reglas: lib/executive/alerts/rules/* + evaluate.ts.
- Tipos: activity_drop, tag_inactive, tag_disabled, avex_derivation, avex_critical,
  unusual_spike, destination_failure, system_health, abandonment_high.
- Severidad: info/warning/critical.
- Estados: active/acknowledged/assigned/dismissed.
- Horario operativo: solo generacion critica fuera de America/Bogota 06:00-23:00.
- Queries soportan filtros por departamento, entidad, estado.
- Audit log en executive_audit_log.

9.3 Reports
- Weekly summary CSV generado con SQL/TS.
- Export via /api/executive/reports/export.

9.4 ROI
- ROI simple basado en metricas de touches y visitas vs objetivo baseline.

9.5 Baselines y settings
- venue_baseline calculado desde metricas historicas.
- executive_settings persisten KPIs targets y configuracion de scope.

10. Admin surfaces
-------------------
10.1 Dashboard (TagMetricas)
- Filtros por fecha y tag.
- Vistas/dashboards: metricas.summary, feedback-summary.
- Vistas SQL: v_touches_daily, v_touches_hourly, v_destination_breakdown.

10.2 Tags NFC
- CRUD de nfc_tags (zona, room_number, experience_config, active).
- Fallback staff: copiar URL = staff_assisted channel.

10.3 Experiencia / Hub
- Edita titulo, welcome_message, avex_enabled y destinos ordenados.
- Se refleja en hub en <=5 minutos.

10.4 Base de conocimiento AVEX
- CRUD knowledge_entries por venue (categorias validadas).
- Sin embeddings en MVP; todo se inyecta en el prompt del LLM.

10.5 Simulador NFC
- Activa tags staff y room tags para abrir rutas de capture reales en demo.

11. API surface (BFF endpoints)
--------------------------------
Auth
- POST /api/auth/sign-in              login con credenciales
- POST /api/auth/sign-out             logout (cookie clear)
- POST /api/auth/refresh              refresh automatico via SDK

Admin
- GET/POST  /api/admin/tags
- GET/PUT/DELETE /api/admin/tags/[id]
- GET/POST  /api/admin/knowledge
- GET/PUT/DELETE /api/admin/knowledge/[id]
- GET/PUT   /api/admin/experience/[id]
- GET       /api/admin/me

Capture
- POST /api/capture/feedback
- POST /api/capture/incident

Events/Tracking
- POST /api/events/touch
- POST /api/events/destination

Executive
- GET  /api/executive/overview
- GET  /api/executive/pulse
- GET/POST /api/executive/alerts
- POST /api/executive/alerts/evaluate
- GET/PUT  /api/executive/alerts/[id]
- POST /api/executive/reports/export
- GET/POST  /api/executive/kpis
- GET/POST  /api/executive/thresholds
- GET/POST  /api/executive/roi
- POST /api/executive/content-correction

Metrics
- GET  /api/metrics/summary
- GET  /api/metrics/feedback-summary

Reception
- GET/POST  /api/reception/stays
- POST /api/reception/stays/[stayId]/close
- POST /api/reception/stays/consolidate
- GET  /api/reception/stays/lookup

Scorecards
- GET /api/scorecards/hotel
- GET /api/scorecards/department/[departmentId]
- GET /api/scorecards/employee/[staffMemberId]

Staff Sessions
- POST /api/staff/sessions/open
- GET  /api/staff/sessions/[sessionToken]

Supervisor
- GET/POST /api/supervisor/incidents
- PUT /api/supervisor/incidents/[id]
- GET/POST /api/supervisor/departments
- PUT /api/supervisor/departments/[id]
- GET/POST /api/supervisor/job-roles
- PUT /api/supervisor/job-roles/[id]
- GET/POST /api/supervisor/shifts
- PUT /api/supervisor/shifts/[id]
- GET/POST /api/supervisor/staff-members
- PUT /api/supervisor/staff-members/[id]
- PUT /api/supervisor/staff-members/[id]/nfc-tag
- PUT /api/supervisor/staff-members/[id]/shift-assignment
- GET /api/supervisor/staff-members/[id]/history
- GET/PUT /api/supervisor/venue-settings
- GET/POST /api/supervisor/feedback-comments
- GET/POST /api/supervisor/incident-categories

AVEX
- POST /api/avex/chat              streaming SSE a OpenRouter

12. Analytics y tracking
-------------------------
Archivos: lib/analytics/track.ts, client-track.ts, client-track.js
Evento touch: insert en touch_events con dedup, device_type, country via x-vercel-ip-country.
Evento destination visit: insert en destination_visits desde cliente.
Features: dedup por client fingerprint en staff capture sessions, no en guest navegacion.

13. AI / AVEX
--------------
- Prompt builder: lib/avex/build-prompt.ts
- Guardrails: bloqueo de sensibles + deteccion de intenciones transaccionales.
- Session: lib/avex/session.ts (avex_sessions, avex_messages, rate limit 20 msg/hora).
- Knowledge: lib/avex/knowledge.ts (knowledge_entries activas por venue).
- Streaming: lib/avex/stream-chat.ts (OpenRouter OpenAI GPT-4o-mini).

14. Validadores
---------------
Zod schemas por dominio:
- feedback, incident, events (touch/destination), experience, knowledge, tags,
  supervisor-incident, supervisor-org, scorecards, staff-session, guest-stay,
  executive, avex.

Uso: todas las rutas de submit validan en server antes de escribir DB.

15. Pruebas
-----------
Unit (Vitest): ~35 archivos.
- Ejecutivos: alerts/scope/queries/baseline/roi/reports/audit
- Staff: session stays ephemeral/consolidation, build-room-context
- AVEX: guardrails, build-prompt
- Scorecards: NPS, shift null, aggregation
- Incident transitions, stay consolidation

Contract (003-staff) (Vitest, InsForge client real o mock):
- guest-stay, capture-feedback, capture-incident
- reception-auth
- rls: capture-sessions, permission-matrix, staff/supervisor role
- scorecards, supervisor-incidents/job-roles
- traceability: room y feedback
- staff-nfc-session

E2E (Playwright):
- home, guest-nfc-flow, staff-nfc-feedback, staff-scorecard
- executive-overview, reception-stay, room-capture, room-context

16. Migraciones y seeders
--------------------------
Migraciones: migrations/*.sql (8 archivos)
- 001 initial schema
- 002 rls policies
- 003 metrics views
- 004 executive layer
- 005 kpi department executive
- 006 content correction audit
- 007 staff schema
- 008 staff rls
- 009 staff scorecard views
- 010 scorecard origin filter
- 011 fix incident history rls

Migracion programatica: scripts/apply-migrations.ts (usa INSFORGE_SERVICE_KEY).

Seeds:
- seed-hotel-caribe.ts        venues, experience_configs, nfc_tags (piloto)
- seed-hotel-caribe-staff.ts  staff, departments, job_roles, shifts, venue settings
- seed-pilot-users.ts         pilotUsers en auth.users y user_profiles
- seed-scorecard-feedbacks.ts scorecards demo (feedback_entries)
- seed-demo-incidents.ts      incidentes demo
- seed-demo-all.ts            corrida completa para demo

17. Deploy en Vercel (production-ready)
-----------------------------------------
Pasos:
1) Crear proyecto Vercel y vincular repo.
2) Configurar env vars en Vercel (Production + Preview):
   - INSFORGE_URL / INSFORGE_ANON_KEY / INSFORGE_SERVICE_KEY
   - NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY
   - NEXT_PUBLIC_APP_URL
   - OPENROUTER_API_KEY / OPENROUTER_CHAT_MODEL (si AVEX esta activo)
3) Build: npm run build (detecta Next.js automaticamente).
4) vercel --prod

Validacion post-deploy:
- Probar /t/[tagSlug] en Edge.
- Confirmar cookies HTTP-only y refresh token rotation.
- Validar 8 quickstart scenarios del spec.
- Medir metricas de pais solo en Vercel (x-vercel-ip-country).

18. Variables de entorno (lista completa)
------------------------------------------
Servidor InsForge
- INSFORGE_URL (obligatorio)
- INSFORGE_ANON_KEY (publico)
- INSFORGE_SERVICE_KEY (solo server)

Browser InsForge
- NEXT_PUBLIC_INSFORGE_URL
- NEXT_PUBLIC_INSFORGE_ANON_KEY

App
- NEXT_PUBLIC_APP_URL

AI (AVEX)
- OPENROUTER_API_KEY
- OPENROUTER_CHAT_MODEL (default: openai/gpt-4o-mini)

Dev bypass
- STAFF_DEV_TOKEN
- STAFF_DEV_ROLE
- STAFF_DEV_NAME
- STAFF_DEV_VENUE_SLUG
- STAFF_DEV_STAFF_MEMBER_ID
- STAFF_DEV_EXECUTIVE_ROLE
- STAFF_DEV_EXECUTIVE_SCOPE

Seed
- STAFF_SEED_PILOT_PASSWORD
- STAFF_SEED_SUPERVISOR_EMAIL
- STAFF_SEED_MANAGER_EMAIL
- STAFF_SEED_RECEPTION_EMAIL

19. Convenciones y patrones de codigo
---------------------------------------
- Server Components por defecto; "use client" solo en componentes interactivos.
- APIs usan helpers @/lib/insforge-server para evitar fugas del service key.
- Cookies de sesion gestionadas por @insforge/sdk/ssr (setAuthCookies).
- Validaciones Zod en todas las boundaries de entrada (API routes, seeders).
- Roles como string literal unions + ReadonlySet en auth helpers.
- Rutas protegidas con 3 capas: middleware (cookie), layout (redirect por rol), helper (assert).
- Dominios separados en carpetas lib/<domain>/ para evitar god objects.

20. Uso de capabilities de InsForge por feature
------------------------------------------------
Feature                            | InsForge feature used
-----------------------------------|------------------------------------------
Login y auth                       | Auth: signInWithPassword, getCurrentUser
Sesion extendida                   | Auth + DB: user_profiles, staff_members
RLS y seguridad                    | DB RLS, SECURITY DEFINER SQL helpers
Tags y experiencia                 | DB: nfc_tags, experience_configs, venues
Metricas y vistas                  | DB: views v_touches_daily, v_touches_hourly, v_destination_breakdown
Alertas ejecutivas                 | DB: executive_alerts, executive_audit_log, kpi_targets, venue_baseline
Supervisor incidents               | DB: incident_reports, incident_status_history
Supervisor org                     | DB: departments/job_roles/shifts/staff_members y relaciones
Capturas staff                     | DB: staff_capture_sessions, touch_events
Stays                              | DB: guest_stays, cookie-based stay tokens
Feedback/Incident                  | DB: feedback_entries, incident_reports
AVEX knowledge                     | DB: knowledge_entries
Content audit                      | DB: content_audit_log
Scorecards                         | DB: feedback_entries, staff_members, departments
Track analytics                    | DB: touch_events, destination_visits
Seeders                            | Auth + DB
Migraciones SQL                    | DB (Postgres en InsForge)

21. Roadmap y milestones reflejados en codigo
----------------------------------------------
- M0: Fundacion (schema inicial, RLS, metrics views).
- M1: Hub huesped (/t/[tagSlug], AVEX chat básico, room context).
- M2: Pulso ejecutivo (overview, baselines, KPIs).
- M3: Panel admin y metrics (dashboard admin, tags, experience).
- M4: Conocimiento AVEX y correcciones de contenido.
- M6: Piloto producción (tag NFC físicos, scorecards, incidents, ejecutivo, consolidacion stays).
  (El repo incluye M3..M6 completo; M0..M1 estan en rutas y docs)

22. Comandos esenciales
------------------------
- npm install
- npm run dev                  # dev local en http://localhost:3000
- npm run test                 # unit + contract (Vitest)
- npm run test:e2e             # Playwright
- npm run lint                 # ESLint (Next.js 15)
- npm run build                # build produccion
- npm run seed                 # seed piloto Hotel Caribe
- npm run seed:staff           # seed organizacion y staff
- npm run seed:scorecards      # seed scorecards demo
- npm run seed:demo-incidents  # seed incidentes demo
- npm run seed:demo            # seed completa para demo
- npm run db:migrate           # aplica migraciones SQL
- npm run audit:orphans        # auditoria de trazabilidad

23. Consideraciones de diseno relevantes
------------------------------------------
- No hay integracion PMS; la estadia es entidad propia con token/cookie (stay token).
- No hay pagos ni stripe en esta etapa.
- Sin embeddings para AVEX en MVP; el corpus se inyecta en contexto del LLM.
- Dedup NFC staff por client fingerprint server-side.
- Vercel Edge para /t/* pero Node.js para flujos de captura.
- Variables NEXT_PUBLIC_* son para browser client InsForge y URL publica.
- RLS es la capa de seguridad principal; service role solo server-side.
- En desarrollo existe bypass por token fijoSTAFF_DEV_TOKEN}}) para acelerar demo.
- Las politicas RLS usan SECURITY DEFINER para evaluar roles sin leaks.
- Las alertas ejecutivas se generan en batch via evaluador programable o cron.
- Los reportes exportables son CSV generados desde consultas agregadas.

24. Archivos criticos para entender el proyecto
------------------------------------------------
- lib/insforge-server.ts          cliente service role (server)
- lib/insforge-ssr.ts             cliente SSR por request
- lib/auth/session.ts             modelos StaffSession/ExecutiveSession + guards
- middleware.ts                   proteccion de rutas por cookie
- migrations/                     schema, RLS y vistas versionadas
- lib/executive/alerts/evaluate.ts motor de evaluacion de alertas
- lib/staff/open-capture-session.ts apertura y dedup de captura staff
- lib/avex/stream-chat.ts         integracion streaming LLM (OpenRouter)
- lib/stays/*                     ciclo de vida de estadias
- app/(guest)/t/[tagSlug]/page.tsx  hub publico Edge
- app/(guest)/capture/room/[tagSlug]/page.tsx captura habitacion/zona

25. Contacto / rama actual
----------------------------
- Rama: master
- Proyecto InsForge: tagme-hotel-caribe
- API base: https://sj6it9e9.us-east.insforge.app
- Owner repo: Rase (rioplatense, local-first, Vercel target)
- Licencia/ownership no explicitada en el repo

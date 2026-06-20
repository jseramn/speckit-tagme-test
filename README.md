TagMe Platform — Technical Document for InsForge Hackathon
=================================================================
Project: NFC/IoT platform for hospitality (pilot Hotel Caribe by Faranda Grand)
Stack: Next.js 15 (App Router), TypeScript, React 19, Tailwind, Zod, Vitest, Playwright
Backend: InsForge (BaaS Postgres + Auth + RLS + Storage ready + AI ready)
Executive Summary
-----------------
TagMe turns NFC tags into digital experiences for hotels:
- Guest: opens the hub via tag, navigates destinations, chats with AVEX AI, leaves feedback or reports incidents.
- Staff/reception: opens assisted captures, manages stays and consolidates stays.
- Supervisor: manages incidents, scorecards and team organization.
- Executive: visualizes hotel pulse, alerts, ROI, KPIs and exports reports.
- Admin: configures NFC tags, hub experience, AVEX knowledge base and metrics.
This document covers router by router, feature by feature, and explicitly maps the relationship with InsForge so that the platform owners see the real use of their technology.
1. Complete Technological Stack
-----------------------------
Frontend/Runtime
- Next.js 15.5 with App Router and Turbopack.
- React 19.
- Tailwind CSS 3.4.
- Zod 3.24 for payload validation.
Backend/BaaS
- InsForge as the single backend (DB, Auth, RLS, Storage, AI, Realtime ready).
- Official SDK @insforge/sdk for server and @insforge/sdk/ssr for SSR.
- OpenRouter only for AVEX streaming in MVP (OpenAI GPT-4o-mini).
Tests and quality
- Vitest for unit and contract tests.
- Playwright for e2e.
- 14 versioned SQL migration files.
Infrastructure
- Vercel as hosting (frontend edge SSR + API routes).
- Public/prefixed NEXT_PUBLIC_* variables for browser client.
2. Repository Structure
------------------------------
app/ # Next.js App Router
  (admin)/ # Staff/admin panel
    layout.tsx
    dashboard/page.tsx # Metrics (TagMetricas M6)
    tags/page.tsx # NFC tags admin
    content/page.tsx # Hub experience and destinations
    knowledge/page.tsx # AVEX knowledge base
    simulator/page.tsx # NFC simulator for demo
  (executive)/ # Executive panel
    layout.tsx
    executive/
      overview/page.tsx # General hotel overview
      alerts/page.tsx # Management alerts tray
      reports/page.tsx # Exportable CSV reports
      roi/page.tsx # Operational ROI
      kpis/page.tsx # KPIs and thresholds
      experience/page.tsx # Experience view (scope)
      fnb/page.tsx # F&B view (scope)
      front-office/page.tsx # Front Office view (scope)
      operations/page.tsx # Operations view (scope)
      settings/page.tsx # Executive settings
  (guest)/ # Guest experience
    layout.tsx
    s/[tagSlug]/page.tsx # Simulated staff entry for capture
    t/[tagSlug]/page.tsx # Public hub by NFC tag (Edge runtime)
    capture/[sessionToken]/page.tsx # Feedback/incident capture by staff
    capture/room/[tagSlug]/page.tsx # Direct capture from room/zone
  (staff)/ # Staff panel
    layout.tsx
    my-scorecard/page.tsx # My scorecard
    reception/ # Reception
      layout.tsx
      page.tsx # Stay management
      consolidate/page.tsx # Stay consolidation
  (supervisor)/ # Supervisor panel
    layout.tsx
    incidents/page.tsx # Incidents tray
    scorecards/page.tsx # Scorecards and drill-down
    pulse/page.tsx # Hotel pulse
    organization/ # Org chart/CRUD
      page.tsx, departments/, job-roles/, shifts/, staff/, settings/
  api/ # BFF routes (Next.js Route Handlers)
    admin/* # Tags, knowledge, experience, me
    auth/* # Sign-in, sign-out, refresh token
    avex/chat/route.ts # AVEX streaming chat
    capture/* # Submit feedback and incidents
    events/* # Touch events and destination events
    executive/* # Alerts, KPIs, overview, ROI, reports, pulse
    metrics/* # Summary and feedback-summary
    reception/stays/* # CRUD stays and close
    scorecards/* # Hotel, department, employee
    staff/sessions/* # Open and read staff capture sessions
    supervisor/* # Incidents, departments, staff, shifts, etc.
  login/page.tsx
  page.tsx # Home / preview
components/ # UI components (guest, staff, supervisor, executive, admin)
lib/ # Core logic (server-safe)
  insforge.ts # Generic InsForge client
  insforge-browser.ts # Browser InsForge client (browser SPA)
  insforge-server.ts # Server/service role client
  insforge-ssr.ts # SSR client per request (cookies)
  auth/session.ts # Extended sessions + authorization helpers
  analytics/* # Tracking and metrics
  admin/* # Simulator, tags, venue config
  avex/* # AI chat, guardrails, knowledge, prompt, session
  capture/* # Submit feedback/incident, room capture
  executive/* # Alerts, baselines, KPIs, ROI, reports, scope, audit
  scorecards/* # NPS, query hotel/department/employee, aggregates
  staff/* # Capture sessions, shifts, tags, stays, venue settings
  stays/* # Ephemeral/formal stays, consolidate, cookie, token
  supervisor/* # Incidents, org CRUD, routing, transitions, scope
  tags/* # Resolve tag by slug
  validators/* # Zod schemas per domain
migrations/ # Versioned schema + RLS + views (Postgres)
scripts/ # Seeds and programmatic migrations
tests/ # Unit, contract and e2e
specs/ # Legacy product specs (historical reference)
3. InsForge Data Model (tables)
--------------------------------------
Base tables (core)
- venues
- nfc_tags
- experience_configs
- user_profiles
Staff and organization
- staff_members
- departments
- job_roles
- shifts
- supervisor_department_assignments
- staff_shift_assignments
- staff_nfc_tags
- venue_staff_settings
- venue_incident_categories
Guest experience
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
4. InsForge Services Used
------------------------------------
4.1 @insforge/sdk (server)
- Service-role client to bypass RLS in API routes and scripts.
- Base URL from INSFORGE_URL, service key from INSFORGE_SERVICE_KEY.
4.2 @insforge/sdk/ssr
- createServerClient() for SSR with request cookies.
- setAuthCookies / clearAuthCookies on sign-in/sign-out route.
- createRefreshAuthRouter() on POST /api/auth/refresh.
- HTTP-only cookies in production.
4.3 Database
- Reads and writes to 20+ tables.
- Relationships with joins in selects ( "inner / left" type relationships).
- insert([...]) batch, upsert([...]), eq/maybeSingle/order/select.
4.4 Auth
- signInWithPassword for login with credentials.
- getCurrentUser to resolve session in SSR.
- auth.users(id) in RLS helpers (FK to auth.users).
4.5 RLS (Row Level Security)
- Versioned policies in SQL + STABLE SECURITY DEFINER helpers.
- Access control by role, venue and department scope.
4.6 Storage
- Prepared by InsForge CLI/skill; in the analyzed code there are no direct uploads.
4.7 Realtime
- No subscriptions detected at runtime.
4.8 Edge Functions
- InsForge runtime is not used; the project uses Vercel Edge for /t/*.
4.9 AI Gateway
- InsForge AI module is not used at runtime; AVEX consumes OpenRouter.
4.10 Payments/stripe
- Not used.
Summary: InsForge is used as persistent backend and auth-first. Payments nor realtime nor InsForge edge functions are used; the pieces that do not fit in InsForge (SSR streaming, Vercel Edge) are implemented with Next.js runtime.
5. Authentication and Session Flow
-----------------------------------
5.1 Login (Password)
Route: app/api/auth/sign-in/route.ts
- Receives credentials validated with Zod.
- Creates SSR InsForge client.
- Calls signInWithPassword.
- Sets insforge_access_token and insforge_refresh_token cookies.
- Does not persist its own session; relies on InsForge token.
5.2 Automatic Refresh
Route: app/api/auth/refresh/route.ts
- Delegated to createRefreshAuthRouter() from the SDK.
- No custom logic.
5.3 Extended Session (StaffSession / ExecutiveSession)
File: lib/auth/session.ts
- getSession/getSessionFromRequest query auth.getCurrentUser() and then user_profiles.
- Map roles: staff, admin, ops, supervisor, manager, department_head, executive.
- Executives add executive_scope (operations/fnb/experience/front_office).
- Staff adds staffMemberId from staff_members.
- Dev bypass via bearer token STAFF_DEV_TOKEN.
5.4 Route Protection
- Middleware (middleware.ts) checks insforge_access_token cookie.
- Protects admin, executive, staff, supervisor routes.
- Layouts apply additional redirects by role.
- Exported helpers: requireStaff, requireAdmin, requireEditor, requireExecutive,
  requireSupervisor, requireSupervisorPanel, requireManager, requireReception.
5.5 Environment Variables
- INSFORGE_URL
- INSFORGE_ANON_KEY
- INSFORGE_SERVICE_KEY
- NEXT_PUBLIC_INSFORGE_URL
- NEXT_PUBLIC_INSFORGE_ANON_KEY
- NEXT_PUBLIC_APP_URL
- OPENROUTER_API_KEY (AVEX)
- STAFF_DEV_TOKEN (optional dev)
- STAFF_DEV_ROLE, STAFF_DEV_NAME, STAFF_DEV_VENUE_SLUG, STAFF_DEV_STAFF_MEMBER_ID
- STAFF_DEV_EXECUTIVE_ROLE (optional dev)
- STAFF_DEV_EXECUTIVE_SCOPE (optional dev)
- STAFF_SEED_PILOT_PASSWORD (seed)
6. Security and Authorization by Role and Scope
--------------------------------------------
6.1 Staff and Admin
- Venue access control via user_profiles.venue_id.
- Admin has access to all pilot venues.
- Role ops = read-only on content.
6.2 Supervisor
- Scope by department: supervisor_department_assignments assigns department IDs.
- Manager = scope by venue.
- Admin = no department restriction.
6.3 Executive
- Roles: executive, manager, department_head.
- Scope by domain: operations, fnb, experience, front_office.
- getAccessibleDashboards() enables/disables dashboards.
6.4 SQL Helpers (RLS)
- current_user_profile(), user_venue_id(), user_role()
- is_venue_staff(target_venue_id)
- is_admin()
- can_access_pilot_venue()
- can_read_venue_metrics()
- supervisor_department_ids()
- staff_member_id_for_user()
- is_manager()
- is_reception_staff()
7. Guest Flows (Frontstage)
----------------------------
7.1 Public Hub by Tag (Edge runtime)
Route: app/(guest)/t/[tagSlug]/page.tsx
- Runs on Vercel Edge (runtime=edge) for low latency.
- resolveTag queries nfc_tags + venues + experience_configs.
- Renders GuestHub with: title, welcome message, destinations, optional AVEX, room context.
- Revalidates every 60s (revalidate=60).
7.2 Staff Entry / Simulation
Route: app/(guest)/s/[tagSlug]/page.tsx
- Generates server fingerprint (user-agent + x-forwarded-for).
- openCaptureSession creates staff_capture_sessions with TTL and dedup.
- Redirects to /capture/[sessionToken].
7.3 Capture from Staff
Route: app/(guest)/capture/[sessionToken]/page.tsx
- Validates UUID v4 token.
- validateSession queries staff_capture_sessions.
- Renders CaptureFlow (Feedback or Incident).
- SessionExpired if expired.
- Polling to /api/staff/sessions/[sessionToken] for countdown.
7.4 Capture from Room/Zone
Route: app/(guest)/capture/room/[tagSlug]/page.tsx
- resolveRoomCapture includes roomContext (room or public zone).
- Incidents and feedback are sent with origin room_nfc and room metadata.
- No prior session required.
7.5 AVEX Chat (AI Concierge in the Hub)
Files: lib/avex/*
- Rendered in GuestHub only if experience_config.avex_enabled=true.
- Context: NFC tag, venue contact information.
- Knowledge base: active knowledge_entries injected into the prompt.
- Guardrails: blocks sensitive data, detects reservations/payments, derives to human.
- Streaming: SSE to the client from OpenRouter.
- Rate limit per session: 20 msgs/hour in avex_sessions.
- No embeddings in MVP; the corpus is injected as plain text in the system prompt.
8. Staff and Supervisor Flows (Backstage)
----------------------------------------
8.1 Capture Sessions (staff)
File: lib/staff/open-capture-session.ts
- Opening validates staff NFC tag, applies TTL, deduplicates by client fingerprint.
- Creates touch_event of type staff_capture_open with dedup metadata.
- Resolves active staff shift for traceability.
8.2 Feedback
- Submit via /api/capture/feedback.
- Completes staff_capture_sessions to status=completed and saves guest_stay_id.
- Origin: staff_nfc or room_nfc.
8.3 Incidents
- Submit via /api/capture/incident.
- Creates incident_reports and links session/room tag.
- Supervisor changes states (open -> in_progress -> resolved -> closed) with history.
8.4 Stays
- Ephemeral stay (cookie), formal stay (reception) and consolidation.
- Stay token links feedbacks from one guest in the same visit.
- closeGuestStay formally closes the stay.
8.5 Scorecards
- Scorecard by hotel, department and employee.
- Only considers origin_type = staff_nfc by design.
- NPS calculated on feedbacks with configurable threshold.
- Drill-down allows viewing guest comments.
8.6 Organization (supervisor CRUD)
- CRUD of departments, job_roles, shifts.
- Staff members and NFC assignments.
- Venue settings (TTLs, categories, thresholds).
- Scope by supervisor's department in all queries.
9. Executive Visibility Layer
------------------------------
9.1 Overview
- KPIs (occupancy-like proxy via touches), 7d/30d trend, ROI, summary by department.
- CalibrationBanner explains thresholds (14 days + 100 touches).
9.2 Alerts
- Rules engine: lib/executive/alerts/rules/* + evaluate.ts.
- Types: activity_drop, tag_inactive, tag_disabled, avex_derivation, avex_critical,
  unusual_spike, destination_failure, system_health, abandonment_high.
- Severity: info/warning/critical.
- States: active/acknowledged/assigned/dismissed.
- Operational schedule: only critical generation outside America/Bogota 06:00-23:00.
- Queries support filters by department, entity, state.
- Audit log in executive_audit_log.
9.3 Reports
- Weekly summary CSV generated with SQL/TS.
- Export via /api/executive/reports/export.
9.4 ROI
- Simple ROI based on touches and visits metrics vs baseline target.
9.5 Baselines and Settings
- venue_baseline calculated from historical metrics.
- executive_settings persist KPIs targets and scope configuration.
10. Admin Surfaces
-------------------
10.1 Dashboard (TagMetricas)
- Filters by date and tag.
- Views/dashboards: metrics.summary, feedback-summary.
- SQL views: v_touches_daily, v_touches_hourly, v_destination_breakdown.
10.2 NFC Tags
- CRUD of nfc_tags (zone, room_number, experience_config, active).
- Staff fallback: copy URL = staff_assisted channel.
10.3 Experience / Hub
- Edits title, welcome_message, avex_enabled and ordered destinations.
- Reflected in hub in <=5 minutes.
10.4 AVEX Knowledge Base
- CRUD knowledge_entries per venue (validated categories).
- No embeddings in MVP; everything is injected into the LLM prompt.
10.5 NFC Simulator
- Activates staff tags and room tags to open real capture routes in demo.
11. API Surface (BFF Endpoints)
--------------------------------
Auth
- POST /api/auth/sign-in login with credentials
- POST /api/auth/sign-out logout (cookie clear)
- POST /api/auth/refresh automatic refresh via SDK
Admin
- GET/POST /api/admin/tags
- GET/PUT/DELETE /api/admin/tags/[id]
- GET/POST /api/admin/knowledge
- GET/PUT/DELETE /api/admin/knowledge/[id]
- GET/PUT /api/admin/experience/[id]
- GET /api/admin/me
Capture
- POST /api/capture/feedback
- POST /api/capture/incident
Events/Tracking
- POST /api/events/touch
- POST /api/events/destination
Executive
- GET /api/executive/overview
- GET /api/executive/pulse
- GET/POST /api/executive/alerts
- POST /api/executive/alerts/evaluate
- GET/PUT /api/executive/alerts/[id]
- POST /api/executive/reports/export
- GET/POST /api/executive/kpis
- GET/POST /api/executive/thresholds
- GET/POST /api/executive/roi
- POST /api/executive/content-correction
Metrics
- GET /api/metrics/summary
- GET /api/metrics/feedback-summary
Reception
- GET/POST /api/reception/stays
- POST /api/reception/stays/[stayId]/close
- POST /api/reception/stays/consolidate
- GET /api/reception/stays/lookup
Scorecards
- GET /api/scorecards/hotel
- GET /api/scorecards/department/[departmentId]
- GET /api/scorecards/employee/[staffMemberId]
Staff Sessions
- POST /api/staff/sessions/open
- GET /api/staff/sessions/[sessionToken]
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
- POST /api/avex/chat streaming SSE to OpenRouter
12. Analytics and Tracking
-------------------------
Files: lib/analytics/track.ts, client-track.ts, client-track.js
Touch event: insert into touch_events with dedup, device_type, country via x-vercel-ip-country.
Destination visit event: insert into destination_visits from client.
Features: dedup by client fingerprint in staff capture sessions, not in guest navigation.
13. AI / AVEX
--------------
- Prompt builder: lib/avex/build-prompt.ts
- Guardrails: blocking of sensitive data + detection of transactional intentions.
- Session: lib/avex/session.ts (avex_sessions, avex_messages, rate limit 20 msg/hour).
- Knowledge: lib/avex/knowledge.ts (active knowledge_entries per venue).
- Streaming: lib/avex/stream-chat.ts (OpenRouter OpenAI GPT-4o-mini).
14. Validators
---------------
Zod schemas per domain:
- feedback, incident, events (touch/destination), experience, knowledge, tags,
  supervisor-incident, supervisor-org, scorecards, staff-session, guest-stay,
  executive, avex.
Usage: all submit routes validate on server before writing to DB.
15. Tests
-----------
Unit (Vitest): ~35 files.
- Executives: alerts/scope/queries/baseline/roi/reports/audit
- Staff: session stays ephemeral/consolidation, build-room-context
- AVEX: guardrails, build-prompt
- Scorecards: NPS, shift null, aggregation
- Incident transitions, stay consolidation
Contract (003-staff) (Vitest, real or mock InsForge client):
- guest-stay, capture-feedback, capture-incident
- reception-auth
- rls: capture-sessions, permission-matrix, staff/supervisor role
- scorecards, supervisor-incidents/job-roles
- traceability: room and feedback
- staff-nfc-session
E2E (Playwright):
- home, guest-nfc-flow, staff-nfc-feedback, staff-scorecard
- executive-overview, reception-stay, room-capture, room-context
16. Migrations and Seeders
--------------------------
Migrations: migrations/*.sql (8 files)
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
Programmatic migration: scripts/apply-migrations.ts (uses INSFORGE_SERVICE_KEY).
Seeds:
- seed-hotel-caribe.ts venues, experience_configs, nfc_tags (pilot)
- seed-hotel-caribe-staff.ts staff, departments, job_roles, shifts, venue settings
- seed-pilot-users.ts pilotUsers in auth.users and user_profiles
- seed-scorecard-feedbacks.ts demo scorecards (feedback_entries)
- seed-demo-incidents.ts demo incidents
- seed-demo-all.ts full run for demo
17. Deploy on Vercel (production-ready)
-----------------------------------------
Steps:
1) Create Vercel project and link repo.
2) Configure env vars in Vercel (Production + Preview):
   - INSFORGE_URL / INSFORGE_ANON_KEY / INSFORGE_SERVICE_KEY
   - NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY
   - NEXT_PUBLIC_APP_URL
   - OPENROUTER_API_KEY / OPENROUTER_CHAT_MODEL (if AVEX is active)
3) Build: npm run build (automatically detects Next.js).
4) vercel --prod
Post-deploy validation:
- Test /t/[tagSlug] on Edge.
- Confirm HTTP-only cookies and refresh token rotation.
- Validate 8 quickstart scenarios from the spec.
- Measure country metrics only on Vercel (x-vercel-ip-country).
18. Environment Variables (complete list)
------------------------------------------
InsForge Server
- INSFORGE_URL (mandatory)
- INSFORGE_ANON_KEY (public)
- INSFORGE_SERVICE_KEY (server only)
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
19. Code Conventions and Patterns
---------------------------------------
- Server Components by default; "use client" only in interactive components.
- APIs use @/lib/insforge-server helpers to avoid service key leaks.
- Session cookies managed by @insforge/sdk/ssr (setAuthCookies).
- Zod validations on all input boundaries (API routes, seeders).
- Roles as string literal unions + ReadonlySet in auth helpers.
- Protected routes with 3 layers: middleware (cookie), layout (redirect by role), helper (assert).
- Domains separated in lib/<domain>/ folders to avoid god objects.
20. Use of InsForge Capabilities by Feature
------------------------------------------------
Feature | InsForge feature used
-----------------------------------|------------------------------------------
Login and auth | Auth: signInWithPassword, getCurrentUser
Extended session | Auth + DB: user_profiles, staff_members
RLS and security | DB RLS, SECURITY DEFINER SQL helpers
Tags and experience | DB: nfc_tags, experience_configs, venues
Metrics and views | DB: views v_touches_daily, v_touches_hourly, v_destination_breakdown
Executive alerts | DB: executive_alerts, executive_audit_log, kpi_targets, venue_baseline
Supervisor incidents | DB: incident_reports, incident_status_history
Supervisor org | DB: departments/job_roles/shifts/staff_members and relationships
Staff captures | DB: staff_capture_sessions, touch_events
Stays | DB: guest_stays, cookie-based stay tokens
Feedback/Incident | DB: feedback_entries, incident_reports
AVEX knowledge | DB: knowledge_entries
Content audit | DB: content_audit_log
Scorecards | DB: feedback_entries, staff_members, departments
Track analytics | DB: touch_events, destination_visits
Seeders | Auth + DB
SQL Migrations | DB (Postgres on InsForge)
21. Roadmap and Milestones Reflected in Code
----------------------------------------------
- M0: Foundation (initial schema, RLS, metrics views).
- M1: Guest hub (/t/[tagSlug], basic AVEX chat, room context).
- M2: Executive pulse (overview, baselines, KPIs).
- M3: Admin panel and metrics (admin dashboard, tags, experience).
- M4: AVEX knowledge and content corrections.
- M6: Production pilot (physical NFC tags, scorecards, incidents, executive, stay consolidation).
  (The repo includes M3..M6 complete; M0..M1 are in routes and docs)
22. Essential Commands
------------------------
- npm install
- npm run dev # local dev at http://localhost:3000
- npm run test # unit + contract (Vitest)
- npm run test:e2e # Playwright
- npm run lint # ESLint (Next.js 15)
- npm run build # production build
- npm run seed # seed pilot Hotel Caribe
- npm run seed:staff # seed organization and staff
- npm run seed:scorecards # seed demo scorecards
- npm run seed:demo-incidents # seed demo incidents
- npm run seed:demo # full seed for demo
- npm run db:migrate # apply SQL migrations
- npm run audit:orphans # traceability audit
23. Relevant Design Considerations
------------------------------------------
- No PMS integration; the stay is its own entity with token/cookie (stay token).
- No payments or stripe at this stage.
- No embeddings for AVEX in MVP; the corpus is injected into the LLM context.
- Staff NFC dedup by server-side client fingerprint.
- Vercel Edge for /t/* but Node.js for capture flows.
- NEXT_PUBLIC_* variables are for browser client InsForge and public URL.
- RLS is the main security layer; service role only server-side.
- In development there is bypass via fixed token STAFF_DEV_TOKEN for demo acceleration.
- RLS policies use SECURITY DEFINER to evaluate roles without leaks.
- Executive alerts are generated in batch via programmable evaluator or cron.
- Exportable reports are CSV generated from aggregated queries.
24. Critical Files to Understand the Project
------------------------------------------------
- lib/insforge-server.ts service role client (server)
- lib/insforge-ssr.ts SSR client per request
- lib/auth/session.ts StaffSession/ExecutiveSession models + guards
- middleware.ts route protection by cookie
- migrations/ versioned schema, RLS and views
- lib/executive/alerts/evaluate.ts alert evaluation engine
- lib/staff/open-capture-session.ts staff capture opening and dedup
- lib/avex/stream-chat.ts LLM streaming integration (OpenRouter)
- lib/stays/* stay lifecycle
- app/(guest)/t/[tagSlug]/page.tsx public Edge hub
- app/(guest)/capture/room/[tagSlug]/page.tsx room/zone capture
25. Contact / Current Branch
----------------------------
- Branch: master
- InsForge Project: tagme-hotel-caribe
- Base API: https://sj6it9e9.us-east.insforge.app
- Repo Owner: Rase (rioplatense, local-first, Vercel target)
- License/ownership not explicitly stated in the repo

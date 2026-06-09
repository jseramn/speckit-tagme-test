# TagMe — Plataforma NFC/IoT

Experiencia para huéspedes en hospitalidad (NFC + TagMétricas + AVEX AI).

**Feature activa**: `specs/001-tagme-platform` · Rama: `001-tagme-platform`

## Setup (M0 Fundación)

### 1. Dependencias

```bash
npm install
```

### 2. InsForge

1. Crear proyecto en [insforge.dev](https://insforge.dev)
2. Vincular CLI:

```bash
npx @insforge/cli login
npx @insforge/cli link
```

El **project-id** queda en `.insforge/` tras el link (T005).

3. Copiar variables:

```bash
cp .env.local.example .env.local
```

Completar en `.env.local`:

| Variable | Uso |
|----------|-----|
| `INSFORGE_URL` | URL del proyecto InsForge |
| `INSFORGE_ANON_KEY` | Clave anon (pública) |
| `INSFORGE_SERVICE_KEY` | Service role (solo servidor/scripts) |
| `NEXT_PUBLIC_INSFORGE_URL` | Misma URL para cliente browser |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Misma anon key para browser |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en dev |

### 3. Base de datos

Aplicar migraciones en orden (InsForge SQL Editor o CLI):

```bash
npm run db:migrate          # instrucciones + listado
npm run db:migrate -- --cli   # si InsForge CLI soporta import
```

Archivos: `supabase/migrations/001_initial_schema.sql` → `002_rls_policies.sql` → `003_metrics_views.sql`

### 4. Seed Hotel Caribe

```bash
npm run seed
```

Verifica: venue `hotel-caribe`, 3 tags NFC, `avex_enabled: true`.

### 5. Desarrollo

```bash
npm run dev      # http://localhost:3000
npm run test     # Vitest (validators)
npm run build    # Build producción
```

## Estructura (plan M0+)

```text
app/(guest)/     # Hub huésped (M1)
app/(admin)/     # Panel staff (M3)
app/api/         # BFF routes
components/      # guest, avex, admin, ui
lib/             # insforge, validators, analytics (M1+)
supabase/migrations/
scripts/         # seed, migrate
specs/001-tagme-platform/  # spec, plan, tasks
```

## Deploy en Vercel (M6 — Piloto producción)

### 1. Crear proyecto Vercel

```bash
npm i -g vercel
vercel login
vercel link
```

Conectar el repositorio Git o desplegar desde CLI. Rama recomendada: `001-tagme-platform`.

### 2. Variables de entorno (Production + Preview)

Configurar en **Vercel → Settings → Environment Variables**:

| Variable | Entorno | Notas |
|----------|---------|-------|
| `INSFORGE_URL` | Production, Preview | URL del proyecto InsForge |
| `INSFORGE_ANON_KEY` | Production, Preview | Clave anon |
| `INSFORGE_SERVICE_KEY` | Production, Preview | Solo servidor — **nunca** exponer al cliente |
| `NEXT_PUBLIC_INSFORGE_URL` | Production, Preview | Misma URL que `INSFORGE_URL` |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Production, Preview | Misma anon key |
| `NEXT_PUBLIC_APP_URL` | Production | URL producción (ej. `https://tagme.vercel.app`) |
| `OPENROUTER_API_KEY` | Production, Preview | AVEX — `npx @insforge/cli ai setup` |
| `OPENROUTER_CHAT_MODEL` | Production, Preview | ej. `openai/gpt-4o-mini` |

`NEXT_PUBLIC_APP_URL` en Preview debe coincidir con la URL de preview de Vercel para URLs fallback staff.

### 3. Build settings

Vercel detecta Next.js automáticamente:

- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Node.js**: 20.x (ver `package.json` engines)

Runtime configurado en código:

- Guest hub `/t/[tagSlug]` → Edge (baja latencia)
- AVEX `/api/avex/chat` → Node.js (streaming SSE)

### 4. Desplegar

```bash
vercel          # preview
vercel --prod   # producción
```

### 5. Tags NFC físicos — Hotel Caribe (piloto)

Programar 3 tags con estas URLs (reemplazar `{APP_URL}` por dominio producción):

| Tag slug | URL NFC | Zona |
|----------|---------|------|
| `caribe-lobby` | `{APP_URL}/t/caribe-lobby` | Lobby |
| `caribe-restaurant` | `{APP_URL}/t/caribe-restaurant` | Restaurante |
| `caribe-room-412` | `{APP_URL}/t/caribe-room-412` | Habitación 412 |

**Fallback staff** (sin NFC): Admin → Tags → **Copiar URL** genera `{APP_URL}/t/{slug}?assisted=1` con canal `staff_assisted`.

### 6. Validación post-deploy

Ejecutar escenarios 1–7 de [quickstart.md](specs/001-tagme-platform/quickstart.md). Registrar resultados en `specs/001-tagme-platform/checklists/pilot-validation.md`.

> **Nota**: Métricas de país (`x-vercel-ip-country`) solo funcionan en Vercel, no en `localhost`.

## Documentación

- [Spec](specs/001-tagme-platform/spec.md)
- [Plan](specs/001-tagme-platform/plan.md)
- [Tasks](specs/001-tagme-platform/tasks.md)
- [Quickstart piloto](specs/001-tagme-platform/quickstart.md)
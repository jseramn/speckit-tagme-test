# Test Stability (E2E + Integration)

## Problem

Playwright and Vitest suites drifted from M3–M5 product behavior: strict-mode selector collisions, stale copy expectations, dev auto-auth masking login redirects, and under-provisioned timeouts on InsForge integration paths. Integration tests also ran in parallel across files, overwhelming the shared remote backend and causing flaky timeouts.

## Principles

1. **Selectors**: prefer `getByRole` with accessible names; use `data-testid` only on stable shell labels (zone, room banner). Avoid bare `getByText(/regex/)` when copy repeats on the page.
2. **Navigation**: `domcontentloaded` for guest hubs; wait for route or API response, not fixed sleeps.
3. **Auth E2E**: disable `STAFF_DEV_TOKEN` auto-session in Playwright `webServer.env`; assert login redirect via `login?next=` query.
4. **Integration Vitest**: shared env load via `setup-env.ts`; JWT refresh once in `global-setup.ts` (cached in `node_modules/.cache/vitest/`).
5. **NFC capture sessions**: one staff slug per E2E spec that submits feedback in parallel (`maria-g` vs `carlos-p`). Completing a session returns `SESSION_EXPIRED` (410); `submitStaffFeedback` may retry once after reopening the tag URL.

## Integration test rules

### Execution model

| Setting | Value | Rationale |
|---------|-------|-----------|
| `fileParallelism` | `false` | All Vitest files share one InsForge project — parallel files cause latency spikes and timeouts |
| `testTimeout` (default) | 45s | Single remote round-trip budget |
| `hookTimeout` | 60s | `beforeAll` venue lookups |
| Per-test overrides | `INTEGRATION_TIMEOUT` in `tests/helpers/integration.ts` | Only multi-step flows get 60s |

### Data isolation

1. **Fingerprints**: always use `uniqueFingerprint(label)` — never bare `test-${Date.now()}`.
2. **Staff slugs**: import `STAFF_SLUG` from `tests/helpers/integration.ts`:
   - `primary` (`maria-g`): feedback, incident, session-open flows
   - `secondary` (`carlos-p`): ephemeral / multi-feedback / parallel E2E isolation
   - `maintenance` (`roberto-h`): supervisor incident workflow (Mantenimiento dept)
3. **Sessions**: use `openTestSession({ label, slug? })` instead of calling `openCaptureSession` directly.
4. **Venue ID**: use cached `getPilotVenueId()` — do not query `venues` in every test.
5. **Sequential suites**: multi-step stay flows use `describe.sequential` to avoid cross-test interference within a file.
6. **Cleanup**: tests that insert rows directly (expired sessions, past-TTL stays) must delete them in the same test.

### Timeouts (`INTEGRATION_TIMEOUT`)

| Constant | ms | Use when |
|----------|-----|----------|
| `captureFlow` | 45_000 | open session + submit + 1–2 DB reads |
| `stayFlow` | 60_000 | formal stay lifecycle, consolidation, multi-feedback |
| `supervisorFlow` | 60_000 | list + 3+ incident transitions |
| `sessionTtl` | 45_000 | session open + TTL boundary checks |

Do **not** add per-file `testTimeout` overrides outside these constants.

### Auth / RLS setup

- Role JWTs refresh **once** in `tests/global-setup.ts`.
- Workers read the cache in `tests/setup-env.ts` — no per-file `signInWithPassword` storms.
- RLS tests use `INSFORGE_TEST_*_JWT` from env or cache; skip admin tests when `INSFORGE_TEST_ADMIN_JWT` is unset.

### Seeds

Integration tests assume pilot seed data exists (`npm run seed && npm run seed:staff`). Tests create ephemeral data (stays, sessions) with unique fingerprints; they do not truncate shared tables.

## Contracts

| Surface | Stable assertion |
|---------|------------------|
| Lobby hub | `data-testid=guest-hub-zone` exact "Lobby" |
| Room hub | `heading` "Bienvenido a la habitación {n}" |
| Staff capture | buttons Feedback + Incidencia (no "Próximamente") |
| Protected staff pages | unauthenticated → `/login?next=…` |
| Feedback submit | POST `/api/capture/feedback` 200 → heading thanks |
| Session TTL | assert TTL from `openedAt`, not wall-clock remaining (tolerates network latency) |

## Out of scope

- Full `data-testid` coverage of every component.
- CI matrix expansion beyond Mobile Chrome + Mobile Safari.
- Local InsForge emulator — tests target the shared pilot project.
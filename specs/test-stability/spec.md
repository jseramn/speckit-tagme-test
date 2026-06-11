# Test Stability (E2E + Integration)

## Problem

Playwright and Vitest suites drifted from M3–M5 product behavior: strict-mode selector collisions, stale copy expectations, dev auto-auth masking login redirects, and under-provisioned timeouts on InsForge integration paths.

## Principles

1. **Selectors**: prefer `getByRole` with accessible names; use `data-testid` only on stable shell labels (zone, room banner). Avoid bare `getByText(/regex/)` when copy repeats on the page.
2. **Navigation**: `domcontentloaded` for guest hubs; wait for route or API response, not fixed sleeps.
3. **Auth E2E**: disable `STAFF_DEV_TOKEN` auto-session in Playwright `webServer.env`; assert login redirect via `login?next=` query.
4. **Integration Vitest**: default `testTimeout` 30s; 60s for multi-step stay flows; shared env load via `setup-env.ts`.
5. **NFC capture sessions**: one staff slug per E2E spec that submits feedback in parallel (`maria-g` vs `carlos-p`). Completing a session returns `SESSION_EXPIRED` (410); `submitStaffFeedback` may retry once after reopening the tag URL.

## Contracts

| Surface | Stable assertion |
|---------|------------------|
| Lobby hub | `data-testid=guest-hub-zone` exact "Lobby" |
| Room hub | `heading` "Bienvenido a la habitación {n}" |
| Staff capture | buttons Feedback + Incidencia (no "Próximamente") |
| Protected staff pages | unauthenticated → `/login?next=…` |
| Feedback submit | POST `/api/capture/feedback` 200 → heading thanks |

## Out of scope

- Full `data-testid` coverage of every component.
- CI matrix expansion beyond Mobile Chrome + Mobile Safari.
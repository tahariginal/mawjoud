# Implementation Plan — MAWJOOd

Work is delivered phase by phase. A phase is **done** only when its exit criteria pass; the next phase does not start on a red build.

## Phase checklist (run at the end of every phase)

1. Typecheck — 2. Lint — 3. Tests — 4. Build — 5. Inspect and fix errors — 6. Architecture review (boundaries, sources of truth) — 7. UX review (states, a11y, copy) — 8. Docs/ADRs updated — 9. Clean milestone commit(s) using Conventional Commits (`feat(orders): …`, `fix(inventory): …`).

## Phases

| Phase | Scope | Exit criteria | Blocked by |
|---|---|---|---|
| **1. Architecture** | Docs, ADRs, design system spec | Client approval of this documentation | D5, D6 for final design sign-off |
| **2. Foundation** | Monorepo (pnpm, Turborepo), shared configs, `packages/contracts`, NestJS skeleton (config validation, logging, request id, error filter, health), Kysely + first migrations, Docker Compose, CI pipeline, Expo app skeleton (router, theme tokens, i18n, query client, API client), **auth end-to-end** (register, verify, login, refresh rotation, logout, reset, delete account), seed script | CI green; auth tests incl. CS-17; app signs in on a device; `README` setup works from a clean clone | D5 (bundle ids) |
| **3. Merchants & offers** | Businesses, members, locations (PostGIS), hours, categories, offers, inventory, media uploads | Offer CRUD with constraints; CS-14; geo indexes verified with `EXPLAIN` | — |
| **4. Discovery** | Home feed, explore list + map (clustering), filters/sort server-side, search, offer details, store page, favorites (basic) | All screens have loading/empty/error/offline states; p95 targets on seeded data | Maps API key |
| **5. Orders & payments** | Quote, reservation with hold, payment provider adapter, webhooks, reconciliation, order history, cancellation, refunds | CS-1…CS-9, CS-13, CS-19, CS-20 pass; payment sandbox E2E | **D1, D2, D3, D7** |
| **6. Pickup** | Pickup pass, QR/code validation, offline manifest + sync, no-show job | CS-10…CS-12, CS-16 pass; scan result < 1 s on device | — |
| **7. Favorites, notifications, impact** | Notification preferences, quiet hours, dedupe, push/email adapters, reminders, impact factors + records | No duplicate notifications under retries; impact shows methodology | D8 |
| **8. Merchant app** | Merchant mode tabs, offer management UI, today view, insights, staff invites | Merchant journeys E2E | — |
| **9. Admin** | Admin web: users, merchants, moderation, categories, orders, refunds, disputes, audit, flags, config | Every mutation audited; MFA enforced | — |
| **10. Quality** | Full test pass, security review, UX audit of every screen, performance and load tests, observability dashboards and alerts | Security: no open Critical/High; UX audit issues P0/P1 fixed; load test at 3× peak | — |
| **11. Production hardening** | Production infra, backups + restore drill, runbooks, store listings, compliance items | Launch checklist (DEPLOYMENT.md §6) complete | D4, D9 |

## Definition of done (any feature)

- Contract defined in `packages/contracts`; API and mobile compile against it
- Authorization rules implemented **and** tested (own vs other resource)
- Loading, empty, error, retry and offline states implemented
- Strings in translation files; layout checked at largest text size and in RTL
- Logs, metrics and error codes in place for failure paths
- Tests at the right layer; critical scenarios automated
- Docs updated when behavior or architecture changed

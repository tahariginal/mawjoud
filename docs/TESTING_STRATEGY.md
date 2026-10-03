# Testing Strategy — Mazal

Testing is a release gate, not an afterthought. Money, stock and pickups are tested against a **real PostgreSQL/PostGIS and Redis** (Testcontainers), never mocks.

## 1. Layers

| Layer | Scope | Tools | Runs |
|---|---|---|---|
| Unit | Domain logic: pricing, state machines, policies, permission rules, ranking, impact math, cursor encoding | Jest | Every PR |
| Integration (API) | Repositories, transactions, migrations, use cases, webhooks, jobs | Jest + Testcontainers (`postgis/postgis:18-3.6`, `redis:8`) | Every PR |
| HTTP / E2E (API) | Full request path incl. auth, validation, error envelope | Jest + supertest against the Nest app + containers | Every PR |
| Contract | Shared Zod contracts compile in all apps; OpenAPI breaking-change diff vs `main`; responses parse with contract schemas | tsc, OpenAPI diff tool (e.g. oasdiff), Jest | Every PR |
| Mobile unit/component | Hooks, formatters, components, screen states (loading/empty/error/offline) | jest-expo + React Native Testing Library | Every PR |
| Mobile E2E | Critical journeys on a real build | Maestro on Android emulator (CI) and iOS simulator (release) | Main branch + release |
| Load | Discovery queries, checkout contention | k6 | Before launch and before major releases |
| Security | Authorization matrix, dependency scan, secret scan, SAST | Jest, `pnpm audit`/OSV, gitleaks, CodeQL | Every PR |

Coverage targets (enforced on changed code): domain ≥ 90% lines/branches for `orders`, `inventory`, `payments`, `pickups`; overall API ≥ 80%. Coverage is a floor, not a goal; scenario tests below are mandatory regardless.

## 2. Mandatory critical scenarios

Each is an automated integration test against real PostgreSQL, using concurrent connections.

| # | Scenario | Expected |
|---|---|---|
| CS-1 | 50 concurrent customers try to reserve the **last unit** | Exactly 1 order created; 49 × `OFFER_SOLD_OUT`; `quantity_available = 0`; never negative |
| CS-2 | Offer with 10 units, 30 concurrent buyers of 1 | Exactly 10 orders; stock 0 |
| CS-3 | Same `POST /orders` sent twice (sequential and concurrent) with the same key | One order; identical responses |
| CS-4 | Same key, different body | `409 IDEMPOTENCY_KEY_REUSED`; no second order |
| CS-5 | Payment succeeds, client never calls back (simulated crash) | Webhook → `CONFIRMED`; `GET /orders/:id` returns pass |
| CS-6 | Webhook delivered 3 times, also out of order | Processed once; final state correct |
| CS-7 | Webhook never arrives | Reconciliation job confirms from provider status |
| CS-8 | Payment succeeds after hold expired, stock gone | Automatic refund; order not confirmed; customer notified |
| CS-9 | Payment succeeds after hold expired, stock available | Re-reserved; `CONFIRMED` |
| CS-10 | Same pickup QR scanned twice (sequential and concurrent, two devices) | Exactly 1 `PICKED_UP`; second → `PICKUP_ALREADY_COMPLETED` |
| CS-11 | Pickup code from business A scanned at business B | `PICKUP_CODE_INVALID`; attempt logged |
| CS-12 | Pickup of cancelled / expired / no-show order | Rejected with the specific code |
| CS-13 | Hold expiry job and customer payment race | Exactly one wins; stock restored at most once |
| CS-14 | Merchant reduces quantity below reserved | Rejected |
| CS-15 | Invalid order transition attempts (all non-listed pairs) | Rejected; no history row |
| CS-16 | Offline pickup sync conflict (validated offline, cancelled online meanwhile) | Conflict flagged; no silent success |
| CS-17 | Refresh token reuse | Whole session family revoked |
| CS-18 | IDOR: user B reads/cancels user A's order; staff of business B validates business A's order | `404` / rejected |
| CS-19 | Server killed between reservation commit and payment creation | Retry with same key resumes; or hold expires and stock returns |
| CS-20 | Redis down during order confirmation | Order confirmed; notification delivered after Redis returns (outbox) |

## 3. Mobile E2E journeys (Maestro)

1. Sign up → verify email → sign in
2. Discover (home) → offer details
3. Explore list → filter → map → preview
4. Reserve → pay (provider sandbox) → confirmation → pass visible offline
5. Order history → cancel (within policy)
6. Merchant: create offer → scan pickup → already-collected result
7. Offline: airplane mode shows offline states, no blank screens

## 4. Test data

- Deterministic seed script (`pnpm db:seed`) with realistic data in Casablanca coordinates: businesses, locations, offers across time windows, users of every role.
- Factories for tests; each integration test runs in an isolated schema or transaction-per-test where possible; concurrency tests use real separate connections.

## 5. CI gates

A pull request **cannot merge** if any of these fail:

1. Install with frozen lockfile
2. Lint (ESLint + Prettier check + module-boundary rules)
3. Typecheck (all workspaces)
4. Unit tests
5. Integration + HTTP tests (Testcontainers)
6. Migrations: apply from zero on a fresh DB; generated DB types match committed types; `down` of the newest migration works in CI
7. Contract: OpenAPI breaking-change diff
8. Build (API image, admin; mobile `expo export` / typecheck)
9. Security: gitleaks, dependency audit (fail on High/Critical with available fix), CodeQL

Mobile E2E and load tests run on `main` and release branches.

## 6. Status (2026-10-02)

- API: Vitest 4 + Testcontainers (real PostGIS and Redis), 100 tests. Automated critical scenarios: CS-1, CS-2, CS-3, CS-4, CS-10 (sequential and concurrent), CS-11, CS-12, CS-14, CS-17, CS-18; plus rate limits, schema drift, full migration rollback, worker delivery through real BullMQ.
- Contract: the mobile app's HTTP client is exercised against the API for every screen call.
- Mobile: Jest (jest-expo, Testing Library 14), 31 tests.
- Not yet: Maestro E2E on devices, k6 load tests, scenarios tied to online payment (CS-5…CS-9, CS-13, CS-19) and to the outbox (CS-20), offline pickup sync (CS-16).

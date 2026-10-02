# System Architecture — MAWJOOd

## 1. Repository assessment (2026-10-02)

Empty git repository (`main`, no commits). No framework, dependencies, environment variables, database, auth, UI system, navigation, tests, CI/CD, linting, formatting or deployment config exist. Architecture is established from scratch.

Local machine: Node 24 (current LTS line), pnpm 10, Docker 29 + Compose, Java 21, Expo CLI, EAS CLI. **Missing:** Android SDK/emulator (needed for local Android builds and Maestro E2E; EAS cloud builds or a physical device work without it).

## 2. Stack

Latest versions checked on npm on 2026-10-02. Exact versions are pinned in Phase 2 (`npx expo install` resolves Expo-compatible versions for mobile).

| Layer | Choice | Checked version | Why |
|---|---|---|---|
| Runtime | Node.js LTS | 24.x | Current LTS |
| Language | TypeScript | 6.0 (Expo SDK 57 template) | TS 7.0 (native compiler) is out, but `@nestjs/swagger` peers only on TS 5.5–6.x; TS 6 defaults `types` to `[]`, so test types are listed explicitly |
| Monorepo | pnpm workspaces + Turborepo | turbo 2.11 | Shared contracts, cached builds (ADR-008) |
| Mobile | Expo + React Native + Expo Router | expo 57, RN 0.86.3 (pinned by Expo; npm `latest` is 0.87) | Brief requirement; development builds via EAS (ADR-014) |
| Server state (mobile) | TanStack Query | 5.104 | Caching, dedup, retries |
| UI state (mobile) | Zustand (small slices only) | 5.0 | Lightweight |
| Forms / validation | React Hook Form + Zod | 7.89 / 4.6 | Same Zod schemas as the API |
| Secure storage | expo-secure-store | SDK 57 | Keychain / Keystore for refresh token |
| Local cache | react-native-mmkv (not yet installed) | 4.3 | Planned for persisted query cache; the checkout attempt key currently lives in SecureStore |
| Lists | @shopify/flash-list | 2.3 | Virtualized lists |
| Images | expo-image | SDK 57 | Caching, blurhash placeholders |
| Maps | react-native-maps | 1.27.2 (pinned by Expo) | Apple Maps on iOS, Google Maps on Android (API key required); server-side clustering planned; `expo-maps` kept as an alternative |
| Camera / QR | expo-camera | SDK 57 | Barcode scanning |
| Push | expo-notifications + Expo Push Service | SDK 57 / expo-server-sdk 7.2 | Behind a `PushSender` port; FCM/APNs direct possible later |
| i18n | i18next + react-i18next + expo-localization | 26 / 17 / SDK 57 | Keys + RTL |
| Backend | NestJS (modular monolith) | 12.1 | Brief requirement. 12.0 shipped 2026-08-27; official packages we need already support it |
| Validation (API) | Zod 4 through NestJS 12's built-in `StandardSchemaValidationPipe` (`@Body({ schema })`) | NestJS 12.1 | Native Standard Schema support made a custom pipe unnecessary; `nestjs-zod` does not support NestJS 12 |
| OpenAPI | @asteasolutions/zod-to-openapi | 9.1 | Generates the spec from the shared Zod contracts |
| Database | PostgreSQL + PostGIS | 18 + 3.6 (image `postgis/postgis:18-3.6`) | ADR-002; PG 18 also provides native `uuidv7()`. Fallback PG 17 if the chosen host lacks 18 |
| Data access | Kysely + kysely-codegen; SQL migrations | 0.29 / 0.20 | ADR-007 |
| Cache / queues | Redis 8 + BullMQ (+ @nestjs/bullmq) | 8.x / 6.3 / 12.0 | ADR-003 |
| Logging | pino + nestjs-pino | 10 / 5.2 | Structured JSON logs |
| Errors | Sentry (@sentry/nestjs, @sentry/react-native) | 11.2 / 8.29 | Error tracking |
| Health | @nestjs/terminus | 12.1 | Liveness / readiness |
| Rate limit | @nestjs/throttler with Redis storage | 6.7 | Per-endpoint limits |
| Password hashing | argon2 (argon2id) | 0.45 | OWASP-recommended algorithm |
| Object storage | S3-compatible + CDN | — | Images; presigned uploads |
| Image processing | sharp (in worker) | 0.35 | Variants, EXIF stripping |
| Payments | `PaymentProvider` port; provider pending **D1** | — | Stripe unsupported in Morocco (ADR-006) |
| Tests | Jest (+ jest-expo, RN Testing Library 14), Testcontainers, supertest, Maestro, k6 | jest 29 (pinned by jest-expo 57) | TESTING_STRATEGY.md |
| Lint | ESLint 9 + eslint-config-expo, Prettier | eslint 9.39 | ESLint 10 is out but `eslint-plugin-react` 7.37 still calls an API ESLint 10 removed |
| Icons | Ionicons via @expo/vector-icons | 15.1 | MIT licence, bundled with Expo, outline + filled pairs for selected states |
| Admin web (Phase 9) | React SPA (Vite) reusing contracts | — | ADR-013 |

## 3. Monorepo layout

```
mawjoud/
├─ apps/
│  ├─ mobile/            Expo app (customer + merchant modes)
│  ├─ api/               NestJS — two entrypoints: main.ts (HTTP) and worker.ts (jobs)
│  └─ admin/             Web admin (Phase 9)
├─ packages/
│  ├─ contracts/         Zod schemas, inferred types, error codes, enums (shared by all apps)
│  ├─ tsconfig/          Shared TS configs
│  └─ eslint-config/     Shared lint rules
├─ infra/
│  └─ docker/            docker-compose for local Postgres/PostGIS, Redis, Mailpit, MinIO
├─ docs/
├─ .github/workflows/
└─ turbo.json, pnpm-workspace.yaml, .env.example
```

### 3.1 API internal structure

```
apps/api/src/
├─ modules/
│  ├─ auth/ users/ profiles/ businesses/ locations/ offers/ inventory/
│  ├─ orders/ payments/ pickups/ favorites/ notifications/ reviews/
│  ├─ impact/ search/ admin/ analytics/ media/ config/
│  └─ <module>/
│     ├─ <module>.module.ts
│     ├─ api/            controllers + request/response mapping (thin)
│     ├─ application/    use cases (one class per use case), ports (interfaces)
│     ├─ domain/         entities, value objects, state machines, policies — no framework imports
│     ├─ infrastructure/ repositories (Kysely), provider adapters
│     └─ <module>.public.ts   the ONLY file other modules may import
├─ shared/
│  ├─ database/  (Kysely instance, transaction helper, generated DB types)
│  ├─ cache/  events/ (outbox)  logging/  errors/  security/  config/  utils/
├─ main.ts       HTTP process
└─ worker.ts     BullMQ consumers, schedulers, outbox relay
```

**Boundary rules (enforced by an ESLint import rule in CI):**
1. A module imports another module only through its `*.public.ts` facade.
2. `domain/` imports nothing from NestJS, Kysely or other modules.
3. Only a module's own repositories touch its tables. Cross-module reads go through the owning module's facade. (Read-optimized feed queries in `search` are the one documented exception — they read offers/locations/inventory views read-only.)
4. Cross-module side effects (notify, impact, analytics) go through **domain events** written to the outbox, not direct calls.

## 4. Module map

| Module | Owns (tables) | Depends on (facade) | Emits events |
|---|---|---|---|
| auth | sessions, auth_identities, verification_tokens | users | `user.registered`, `user.email_verified` |
| users | users | — | `user.deleted` |
| profiles | profiles, notification_preferences | users | — |
| businesses | businesses, business_members | users, media | `business.approved` |
| locations | business_locations, business_hours | businesses | — |
| offers | offers | businesses, locations, inventory, media | `offer.published`, `offer.paused`, `offer.ended` |
| inventory | offer_inventory | — | `inventory.sold_out` |
| orders | orders, order_items, order_status_history, idempotency_keys | offers, inventory, payments | `order.confirmed`, `order.cancelled`, `order.no_show` |
| payments | payments, refunds, webhook_events | — (port to provider) | `payment.succeeded`, `payment.failed`, `refund.completed` |
| pickups | pickups, pickup_attempts | orders, businesses | `order.picked_up` |
| favorites | favorites | locations | — |
| notifications | notifications, devices | profiles | — |
| reviews | reviews | orders | — |
| impact | impact_factors, impact_records | orders | — |
| search | (read models / indexes) | — | — |
| media | images | — | — |
| admin | audit_logs (shared writer), disputes | all facades | — |
| config | feature_flags, app_config | — | — |
| analytics | analytics sink (adapter) | — | — |

## 5. Runtime topology

```
                ┌────────────── Mobile app (iOS / Android) ──────────────┐
                │ Expo Router · TanStack Query · SecureStore · Sentry    │
                └───────┬───────────────────────────┬────────────────────┘
                        │ HTTPS /api/v1             │ payment UI / hosted page
                        ▼                           ▼
   Admin web ──▶ ┌───────────────┐          ┌──────────────────┐
                 │ Load balancer │          │ Payment provider │
                 │ (TLS)         │          └───────┬──────────┘
                 └──────┬────────┘                  │ webhooks (signed)
                        ▼                           │
                 ┌──────────────────────────────────▼─┐
                 │ API process(es) — NestJS (stateless)│──▶ Sentry / metrics / logs
                 └──────┬─────────────┬───────────────┘
                        │             │
             ┌──────────▼───┐   ┌─────▼──────────────┐
             │ PostgreSQL + │   │ Redis              │
             │ PostGIS      │   │ cache · rate limit │
             │ SOURCE OF    │   │ BullMQ queues      │
             │ TRUTH        │   └─────▲──────────────┘
             └──────▲───────┘         │
                    │          ┌──────┴──────────────────────────┐
                    └──────────│ Worker process(es) — NestJS      │──▶ Expo Push / Email / S3
                               │ outbox relay · jobs · schedulers │
                               └──────────────────────────────────┘
       Images: client ──presigned PUT──▶ S3 bucket ──▶ worker (sharp) ──▶ CDN
```

The API and the worker are the **same codebase and image** with different entrypoints, so they scale independently.

## 6. Critical flows

### 6.1 Reserve and pay

```mermaid
sequenceDiagram
  participant App
  participant API
  participant DB as PostgreSQL
  participant PSP as Payment provider
  participant W as Worker
  App->>API: POST /orders {offerId, qty} + Idempotency-Key
  API->>DB: claim idempotency key (IN_PROGRESS, 60 s lock) — committed
  API->>DB: BEGIN; conditional stock decrement; insert order (CREATED) + items + history + outbox; set recovery point; COMMIT
  API->>PSP: create payment (provider idempotency key = order id), timeout 10 s
  API->>DB: order → PAYMENT_PENDING; payment row PENDING
  API-->>App: 201 {order, payment client params}
  App->>PSP: customer authorizes payment (3-D Secure if required)
  PSP-->>API: webhook payment.succeeded (signed)
  API->>DB: insert webhook_events (unique event id) → enqueue
  W->>DB: BEGIN; payment → PAID; order PAYMENT_PENDING → CONFIRMED; outbox; COMMIT
  App->>API: GET /orders/:id (polling while "Checking payment…")
  API-->>App: CONFIRMED + pickup pass
```

Failure handling:

| Failure | Behavior |
|---|---|
| Double tap / retry | Same `Idempotency-Key` → same stored response; one order |
| Same key, different body | `409 IDEMPOTENCY_KEY_REUSED` |
| Two buyers, last unit | Conditional `UPDATE … WHERE quantity_available >= $qty` — exactly one row updated; the other gets `409 OFFER_SOLD_OUT` |
| Provider unreachable on create | Order stays `CREATED` with hold; app shows retry; `POST /orders/:id/payment` retries idempotently; hold expiry releases stock |
| App killed after paying | Webhook confirms server-side; app re-opens on the order id stored locally and reads the real status |
| Webhook lost / delayed | Reconciliation job polls the provider for payments `PENDING`/`PROCESSING` older than 2 min |
| Payment succeeds after hold expired | Worker tries to re-reserve atomically; if stock remains → `CONFIRMED`; else automatic full refund + clear notification |
| Server restart mid-request | Uncommitted work is rolled back by PostgreSQL. Checkout runs in committed phases with a recovery point stored on the idempotency key; a retry with the same key resumes from the last completed phase once the 60 s lock lapses (ADR-005) |

### 6.2 Pickup validation

`POST /pickups/validate` (merchant staff) → one transaction: resolve token hash → check business membership → check state and window → `INSERT INTO pickups` (unique `order_id`) + conditional order update → audit. A second scan hits the unique constraint / state check and returns `PICKUP_ALREADY_COMPLETED` with the original time. See ADR-012.

### 6.3 Domain events (transactional outbox)

Business writes and their events are committed in the **same** PostgreSQL transaction (`outbox_events`). The worker relays unpublished rows to BullMQ (`SELECT … FOR UPDATE SKIP LOCKED`), so a Redis outage delays side effects but never loses them. Consumers are idempotent (ADR-010).

## 7. Background jobs

| Queue / job | Trigger | Idempotency guard | Retries / backoff |
|---|---|---|---|
| `orders.expire-holds` | every 30 s | conditional `UPDATE … WHERE status IN ('CREATED','PAYMENT_PENDING') AND hold_expires_at < now()` | n/a (scheduled) |
| `orders.mark-ready` | every minute | `WHERE status='CONFIRMED' AND pickup_start <= now()` | n/a |
| `orders.mark-no-show` | every 5 min | `WHERE status IN ('CONFIRMED','READY_FOR_PICKUP') AND pickup_end + grace < now()` | n/a |
| `offers.end-expired` | every minute | conditional status update | n/a |
| `payments.process-webhook` | webhook received | `webhook_events.processed_at IS NULL` + state-machine guards | 8 attempts, exponential 2 s → ~4 min |
| `payments.reconcile` | every 2 min | provider status is authoritative; transitions are guarded | 5 |
| `notifications.send` | outbox events | `notifications (user_id, dedupe_key)` unique | 5, exponential |
| `notifications.pickup-reminder` | scheduled per order | dedupe key `pickup-reminder:{orderId}` | 3 |
| `media.process-image` | upload completed | image status `PENDING` → `READY` | 3 |
| `impact.record` | `order.picked_up` | `impact_records.order_id` unique | 5 |
| `outbox.relay` | every 1 s | `published_at IS NULL` + `SKIP LOCKED` | continuous |
| `maintenance.cleanup` | hourly | deletes expired tokens / idempotency keys | 3 |

Final failures move to a `*.dead-letter` queue, raise a metric, and alert; an admin can inspect and replay.

## 8. Sources of truth

| Data | Source of truth | Copies (non-authoritative) |
|---|---|---|
| Inventory | PostgreSQL `offer_inventory` | Client cache (display only, may be stale) |
| Prices, totals, fees | PostgreSQL + server pricing logic | Displayed values on the client |
| Order status | PostgreSQL `orders` (state machine) | Client cache |
| Payment status | Payment provider, reconciled into `payments` by webhook + polling | — |
| Identity / sessions | PostgreSQL (auth module) | Access token claims (short-lived) |
| Feature flags / config | PostgreSQL | Redis cache (TTL 30 s), client copy |
| Offer search results | PostgreSQL | Redis cache (short TTL), client cache |
| Device push tokens | PostgreSQL `devices` | — |
| Impact numbers | `impact_records` computed with versioned `impact_factors` | — |

## 9. Mobile architecture rules

- **Server state** lives only in TanStack Query. **UI state** (filters being edited, sheet open) is local component state or a small Zustand slice. No global store mirroring server data.
- API client generated from `packages/contracts` (typed fetch wrapper): adds auth, `X-Request-Id`, `X-App-Version`, timeouts (10 s default, 20 s for checkout), and maps the error envelope to typed errors.
- Queries retry only on network errors / 5xx, max 2, exponential backoff; **mutations never auto-retry** unless they carry an idempotency key.
- Checkout persists `{idempotencyKey, orderId}` in MMKV before calling the API, so a killed app resumes safely.
- Access token kept in memory; refresh token in SecureStore; single-flight refresh on 401.
- `App version gate`: `GET /app-config` returns `minSupportedVersion`; older apps show an update screen.

## 10. Configuration

All configuration through environment variables, validated at boot with Zod (`shared/config`). The process **refuses to start** if a required variable is missing, or if a development adapter (fake payments, console email) is enabled while `APP_ENV=production`.

## 11. As implemented (2026-10-02)

| Area | Implementation |
|---|---|
| Module system | ESM (`"type": "module"`), TypeScript `NodeNext` with `.ts` imports rewritten by `tsc` (`rewriteRelativeImportExtensions`). NestJS 12 core ships as ESM |
| API tests | Vitest 4 with `unplugin-swc` (decorator metadata), Testcontainers PostGIS 18-3.6 + Redis 8.8, one database cloned from a migrated template per test file |
| Queues | BullMQ 6.3 on ioredis 5.11; queues `email` and `maintenance` (job schedulers), prefix configurable per environment |
| Email | nodemailer 10 over SMTP (Mailpit locally); a log-only sender exists for development without SMTP |
| Modules | `identity` (auth, sessions, codes, /me), `merchants` (+ offers, admin review), `discovery` (feed, offers, stores, search, favorites), `orders` (reservations, pickups, insights, impact), `platform`, `jobs` (worker) |
| Outbox | Not implemented yet: the only async side effect today is email, enqueued after commit (a failed enqueue is logged and the user can request a new code). The transactional outbox (ADR-010) is required before notifications |
| Payments | Not implemented (ADR-015): reservations are confirmed in one transaction and paid at pickup |

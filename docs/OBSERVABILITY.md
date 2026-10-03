# Observability — Mazal

Goal: know something is broken **before** users report it, and find the cause from one request id.

## 1. MVP vs later

| Capability | MVP (Phase 2–10) | Later (when justified) |
|---|---|---|
| Structured logs | pino JSON → platform log store | Central log search with retention tiers |
| Request correlation | `X-Request-Id` through API, jobs, outbox, logs, Sentry | W3C `traceparent` propagation |
| Errors | Sentry (API, worker, mobile) with PII scrubbing | — |
| Metrics | `prom-client` `/metrics` (internal only) | Prometheus + Grafana, or managed equivalent |
| Tracing | — (hooks prepared) | OpenTelemetry SDK + collector |
| Uptime | External uptime check on `/health/ready` | Multi-region checks |

## 2. Logging rules

- One JSON line per event; fields: `time`, `level`, `msg`, `requestId`, `userId` (internal uuid), `route`, `status`, `durationMs`, `module`, `jobId`.
- Levels: `error` (needs action), `warn` (unexpected but handled), `info` (business events, request summary), `debug` (off in production).
- Redaction (pino `redact`): `req.headers.authorization`, `*.password`, `*.token`, `*.refreshToken`, `*.code`, `*.pickupToken`, card-like numbers. Emails are hashed; coordinates rounded to 2 decimals.
- Never log full request/response bodies for auth, payments or webhooks.

## 3. Metrics

HTTP / infrastructure:
- `http_request_duration_seconds{route,method,status}` (histogram)
- `db_query_duration_seconds{op}` · `db_pool_in_use` · `db_pool_waiting`
- `redis_command_errors_total`
- `queue_jobs_total{queue,result}` · `queue_waiting{queue}` · `queue_dead_letter_total{queue}`
- `outbox_unpublished_events` · `outbox_oldest_unpublished_seconds`

Business:
- `orders_created_total` · `orders_confirmed_total` · `orders_expired_total` · `orders_no_show_total`
- `inventory_conflicts_total` (sold-out at reserve)
- `payments_total{provider,result}` · `payment_webhook_lag_seconds` · `payments_reconciled_total{outcome}`
- `pickup_validations_total{result}` (valid, already_completed, invalid, window_closed, offline_synced, conflict)
- `notifications_total{channel,type,result}` (sent, skipped_quiet_hours, skipped_dedupe, failed)
- `refunds_total{reason}`

## 4. Alerts (initial)

| Alert | Condition | Severity |
|---|---|---|
| API error rate | 5xx > 2% for 5 min | Page |
| API latency | p95 > 1 s for 10 min on discovery or checkout routes | Page |
| Readiness failing | Any instance not ready > 2 min | Page |
| Payment failures | Failure ratio > 2× 7-day baseline for 15 min | Page |
| Webhook lag | Oldest unprocessed webhook > 5 min | Page |
| Outbox stuck | Oldest unpublished event > 2 min | Page |
| Dead letters | Any new dead-letter job | Ticket |
| Pickup fraud signal | ≥ 10 invalid codes / 5 min at one location | Ticket |
| Backups | Last successful backup > 26 h | Page |

## 5. SLOs (initial targets)

- API availability 99.9% monthly (excluding planned maintenance announced in advance).
- `GET /offers` and `/feed/home` p95 < 400 ms server time.
- `POST /orders` p95 < 1.5 s (includes provider call).
- Webhook-to-`CONFIRMED` p95 < 30 s.

## 6. Health endpoints

| Endpoint | Checks | Used by |
|---|---|---|
| `GET /health/live` | Event loop responsive | Liveness probe (restart if failing) |
| `GET /health/ready` | DB query, migration version, Redis (worker), not shutting down | Readiness probe / load balancer |
| `GET /metrics` | Prometheus exposition | Internal network only |

## 7. Mobile

- Sentry React Native: crashes, JS errors, slow screens; user id only (no email); breadcrumbs exclude tokens and codes.
- Performance marks: app start → first offer rendered (north-star metric), checkout duration.
- Product analytics (separate from monitoring): events listed in PRODUCT_REQUIREMENTS.md, sent asynchronously, never blocking a transaction, with no personal data in properties.

## 8. Product analytics events

`app_opened`, `offer_viewed`, `offer_favorited`, `search_performed`, `filter_used`, `checkout_started`, `payment_started`, `payment_completed`, `order_cancelled`, `pickup_completed`, `offer_sold_out`, `notification_opened`.

Sent through an `AnalyticsSink` port (initial adapter: first-party ingestion endpoint into a separate table/stream; vendor adapter possible later). Consent and opt-out respected. Server-side business events are emitted from the outbox, so analytics failures never affect orders or payments.

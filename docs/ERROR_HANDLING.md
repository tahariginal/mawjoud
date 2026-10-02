# Error Handling & Resilience — MAWJOOd

## 1. Error envelope (every API error)

```json
{
  "error": {
    "code": "OFFER_SOLD_OUT",
    "message": "This offer is no longer available.",
    "requestId": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
    "timestamp": "2026-10-02T15:02:11.204Z",
    "details": { "offerId": "0192…" }
  }
}
```

- `code` — stable, machine-readable, from the catalog in `packages/contracts/src/errors.ts`. The app maps codes to translated copy; it never shows `message` raw except as a last-resort fallback.
- `message` — safe English text for developers and fallback.
- `details` — optional, safe, schema-defined per code (e.g. validation field errors).
- **Never** included: stack traces, SQL, constraint names, hostnames, provider raw errors, secrets.

## 2. Server implementation

- Domain and application code throw typed `AppError(code, httpStatus, details?)` subclasses.
- Repositories translate known database errors into domain errors (e.g. unique violation on `favorites` PK → idempotent success; check violation on inventory → `OFFER_SOLD_OUT`). Unknown database errors become `INTERNAL_ERROR`.
- One global exception filter builds the envelope, attaches `requestId`, logs once (warn for 4xx, error for 5xx), reports 5xx to Sentry.
- Validation errors → `400 VALIDATION_FAILED` with `details.fields: [{path, rule}]`.

## 3. Error code catalog (initial)

| Code | HTTP | Meaning / client behavior |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Show field errors |
| `INVALID_CURSOR` | 400 | Restart the list from the first page |
| `AUTH_REQUIRED` | 401 | Go to sign-in, then return |
| `AUTH_TOKEN_EXPIRED` | 401 | Refresh once (single-flight), retry |
| `AUTH_INVALID_CREDENTIALS` | 401 | Generic "email or password is incorrect" |
| `AUTH_SESSION_REVOKED` | 401 | Sign out locally; explain |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Show verify-email step |
| `AUTH_EMAIL_TAKEN` | 409 | "An account with this email already exists." |
| `AUTH_CODE_INVALID` | 400 | Wrong or expired 6-digit code; allow retry / resend |
| `FORBIDDEN` | 403 | Show "not allowed" |
| `NOT_FOUND` / `OFFER_NOT_FOUND` / `ORDER_NOT_FOUND` | 404 | Show gone state with alternatives |
| `CONFLICT_STALE_VERSION` | 409 | Merchant edit conflict: reload and re-apply |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Client bug — report; new key |
| `IDEMPOTENCY_IN_PROGRESS` | 409 | Wait 1–2 s, retry with the same key |
| `OFFER_SOLD_OUT` | 409 | "This rescue has already been claimed." |
| `OFFER_NOT_AVAILABLE` | 409 | Paused / ended / removed |
| `OFFER_QUANTITY_LIMIT` | 422 | Adjust quantity |
| `PRICE_CHANGED` | 409 | Show new total, ask to confirm |
| `ORDER_INVALID_TRANSITION` | 409 | Refresh order |
| `ORDER_CANCELLATION_CLOSED` | 409 | Explain policy |
| `PAYMENT_HOLD_EXPIRED` | 409 | Offer a new attempt if stock remains |
| `PAYMENT_FAILED` | 402 | "You weren't charged." Retry |
| `PAYMENT_PROVIDER_UNAVAILABLE` | 503 | Retry later; hold kept until expiry |
| `PICKUP_CODE_INVALID` | 404 | Merchant: "Code not recognized for this store" |
| `PICKUP_ALREADY_COMPLETED` | 409 | Merchant: "Already collected at HH:MM" |
| `PICKUP_NOT_YET_OPEN` | 409 | Show window start |
| `PICKUP_WINDOW_CLOSED` | 409 | Offer override with reason (if allowed) |
| `PICKUP_ORDER_CANCELLED` | 409 | Do not hand over |
| `RATE_LIMITED` | 429 | Respect `Retry-After` |
| `APP_VERSION_UNSUPPORTED` | 426 | Update screen |
| `INTERNAL_ERROR` | 500 | Generic error + retry |
| `SERVICE_UNAVAILABLE` | 503 | Generic error + retry with backoff |

New codes are added to the contracts package first; removing a code is a breaking change.

## 4. Resilience rules

| Dependency | Timeout | Retry | Fallback |
|---|---|---|---|
| PostgreSQL | statement timeout 5 s (API), 60 s (jobs); pool acquire 2 s | Retry only serialization/deadlock errors (max 3, jittered) inside idempotent units | Readiness probe fails → load balancer stops routing |
| Redis | 500 ms | 1 | Cache miss → DB; rate limits on auth/checkout fail closed with in-memory fallback; outbox absorbs queue outages |
| Payment provider | 10 s create, 5 s status | Only with provider idempotency key; exponential + jitter | `PAYMENT_PROVIDER_UNAVAILABLE`; reconciliation job; circuit breaker opens after repeated failures |
| Push / email | 5 s | Job retries (5, exponential) | Dead-letter + metric; in-app notification still recorded |
| Maps (client) | — | — | List view; address text + "Open in Maps" |
| Object storage | 5 s | 3 | Placeholder image |

Principles:
- **Never retry blindly.** A non-idempotent operation is retried only when protected by an idempotency key or a state-machine guard.
- Exponential backoff with full jitter; capped attempts; retry budgets to avoid storms.
- Circuit breakers on outbound provider calls (open → fail fast with a clear code; half-open probes).
- Graceful shutdown: on `SIGTERM`, stop accepting requests, finish in-flight requests (≤ 25 s), close workers after their current job, close pools.
- Health: `/health/live` (process responsive) and `/health/ready` (DB reachable, migrations at expected version, Redis reachable for the worker).

## 5. Mobile error handling

| Situation | Behavior |
|---|---|
| No network | Offline banner; cached data shown with "last updated" time; actions that need the server are disabled with an explanation |
| Timeout | Error state with retry; mutations without idempotency are **not** auto-retried |
| 401 | One single-flight refresh, then replay; refresh failure → sign-in |
| 5xx on reads | Up to 2 automatic retries with backoff, then error state |
| Render crash | Per-route error boundary with "Try again" + report to Sentry; app never shows a blank screen |
| Unknown payment result | "Checking payment…" → poll order status (backoff up to 60 s) → if still unknown, "We're confirming your payment. We'll notify you." Never fake success or failure |
| Duplicate taps | Buttons disable on press; mutations deduplicated by key |
| Stale data | Offer screens refetch on focus; stock shown as "updated just now / x min ago"; final truth checked at checkout |

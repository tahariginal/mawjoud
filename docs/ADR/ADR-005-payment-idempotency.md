# ADR-005 — Payment and checkout idempotency strategy

Status: Proposed · 2026-10-02

## Context
Mobile networks drop responses, users double-tap, apps get killed mid-checkout, servers restart. Any of these must not produce two orders, two charges, or a charge without an order.

## Decision
Four layers of protection:

1. **Client idempotency key.** The app generates a UUID per checkout attempt, persists it locally *before* sending, and reuses it on every retry of that attempt.
2. **Server idempotency record with recovery points** (`idempotency_keys`, PK `(user_id, key)`). Checkout runs as committed phases:
   - Phase A — claim the key: insert `IN_PROGRESS` with a 60 s lock and the request hash. Existing key: different hash → `409 IDEMPOTENCY_KEY_REUSED`; completed → replay the stored response; locked → `409 IDEMPOTENCY_IN_PROGRESS`; lock lapsed → re-claim and resume.
   - Phase B — one DB transaction: reserve stock, create the order (`CREATED`), write history and outbox, set `recovery_point = 'ORDER_CREATED'` and `order_id`.
   - Phase C — call the provider to create the payment, passing **the order id as the provider-side idempotency key** (if the provider supports one; otherwise look up an existing payment for the order first).
   - Phase D — one DB transaction: store the payment, order → `PAYMENT_PENDING`, mark the key `COMPLETED` with the response.
   A retry resumes from the stored recovery point; it never repeats a completed phase.
3. **Database uniqueness.** `payments (provider, provider_payment_id)` unique; at most one live payment per order (partial unique index); `webhook_events (provider, provider_event_id)` unique.
4. **State-machine guards.** Every transition is a conditional update (`WHERE status = ANY(allowed)`), so replays and out-of-order webhooks cannot move an order backward or confirm it twice.

Payment confirmation comes from **signed webhooks**, backed by a reconciliation job that asks the provider for the status of payments stuck in `PENDING`/`PROCESSING`. The client is never the source of truth for payment success.

## Alternatives
- **Client-only debouncing** — does nothing for network retries or crashes.
- **One transaction including the provider call** — holds DB locks during a network call and still cannot roll back the provider side.

## Consequences
- ✅ "Pay twice" → one order; "app killed after paying" → order confirmed by webhook; "network lost" → safe resume.
- ⚠️ More code and tests (CS-3, CS-4, CS-5, CS-6, CS-7, CS-19 are mandatory).
- ⚠️ Idempotency records need cleanup (24 h expiry job).

## Implementation note (2026-10-02, ADR-015)
With pay-at-pickup there is no external call, so the key is claimed **in the same transaction** as the reservation: a concurrent duplicate blocks on the key's row and then replays the stored response; a failed attempt rolls back and frees the key. Phases and recovery points return with online payment. Pickup validation uses the same mechanism.

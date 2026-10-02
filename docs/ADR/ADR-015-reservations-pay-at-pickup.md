# ADR-015 — MVP reservations without online payment (pay at pickup)

Status: Accepted (client decision, 2026-10-02) · Supersedes the payment parts of ADR-005/ADR-006 for the MVP

## Context
No payment provider has been chosen (Stripe does not support Morocco; D1/D2 open). The client decided to launch without in-app payment and add it later.

## Decision
- An order is a **reservation**: created and confirmed in one database transaction (`CREATED → CONFIRMED`), stock decremented atomically, pickup pass issued immediately.
- The customer **pays the store at pickup** (`paymentMethod: PAY_AT_PICKUP`). The app never takes payment details.
- Prices are still calculated by the server (quote) and shown as "to pay at pickup".
- Idempotency keys on order creation remain mandatory (double taps / retries must not create two reservations).
- Cancellation releases stock; no refund logic exists because no money was taken.
- Payment tables, webhooks and the `PaymentProvider` port are **not built yet**; `PaymentStatus`, `PAYMENT_PENDING` and payment error codes stay in the contracts for the future online flow.

## Abuse controls (replacing the financial commitment)
| Risk | Control |
|---|---|
| Hoarding / bot reservations | Verified email required; max **3 active reservations** per user (`ORDER_LIMIT_REACHED`); max per order; rate limits on `POST /orders` |
| No-shows | `NO_SHOW` state recorded per user; repeated no-shows can restrict reservations (rule configurable, Phase 7) |
| Late cancellations | Customer can cancel only before the pickup window starts (policy D7 can change this) |

## Consequences
- ✅ Launch is not blocked by payment provider contracts or licensing.
- ✅ Much smaller PCI/financial compliance surface for the MVP.
- ⚠️ Higher no-show risk for merchants (R6); mitigated by the controls above and merchant feedback.
- ⚠️ Adding online payment later requires the `PAYMENT_PENDING` flow, payment tables, webhooks and reconciliation (ADR-005/006 remain the design for that).

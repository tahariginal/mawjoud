# ADR-009 — Inventory reservation with atomic conditional updates and holds

Status: Proposed · 2026-10-02

## Context
Offers have small quantities (often 1–10) and demand concentrates when popular stores publish. Two customers must never both get the last unit. Reading stock and then decrementing (`if (stock > 0) stock--`) is a race.

## Decision
- Stock lives in its own row (`offer_inventory`), separate from offer metadata.
- Reserve with a single conditional statement inside the order transaction:
  `UPDATE offer_inventory SET quantity_available = quantity_available - $q WHERE offer_id = $id AND quantity_available >= $q RETURNING …`.
  Zero rows updated → `OFFER_SOLD_OUT`. PostgreSQL row locking under `READ COMMITTED` re-evaluates the `WHERE` clause after a concurrent update commits, so only one request can take the last unit.
- `CHECK (quantity_available >= 0 AND quantity_available <= quantity_total)` as a database backstop.
- Reservation creates a **hold** (`hold_expires_at`, default 10 min). Expiry, payment failure and cancellation restore stock **in the same transaction** as the guarded status change, so stock is returned exactly once.
- Merchant quantity edits are also conditional: the new total cannot be lower than units already sold or held.
- Redis is not used for stock.

## Alternatives
- **`SELECT … FOR UPDATE` then update** — correct but two round trips and longer locks.
- **`SERIALIZABLE` transactions** — correct, but more retries under contention.
- **Redis counters** — fast, but Redis would become a second source of truth for stock.

## Consequences
- ✅ No overselling by construction; proven by CS-1, CS-2, CS-13, CS-14.
- ⚠️ Held-but-unpaid units look sold out for up to 10 minutes; the hold duration is configurable and the per-user hold cap limits abuse.

# ADR-012 — Merchant-side pickup validation with offline manifest

Status: Proposed · 2026-10-02

## Context
Pickup is where money turns into food. Customer-side "swipe to redeem" (used by at least one existing app) is fast but easy to fake. Merchant staff have seconds per customer and the counter device may lose network.

## Decision
- On confirmation, the server issues a **pickup token** (128-bit random, stored as SHA-256 hash) rendered as a QR code, plus a **6-character code** (unambiguous alphabet, unique per location among open orders) as fallback.
- Staff scan or type it in merchant mode. `POST /pickups/validate` runs one transaction: resolve hash → verify the staff member belongs to the order's business (else `PICKUP_CODE_INVALID`, no leak) → check status and pickup window → `INSERT INTO pickups` (`UNIQUE (order_id)`) → guarded order update to `PICKED_UP` → audit row.
- Duplicate scans return `PICKUP_ALREADY_COMPLETED` with the original time. Invalid attempts are logged; repeated failures lock code entry for that location briefly and alert.
- **Offline mode:** at shift start (and on every refresh while online) the merchant app downloads the day's manifest for its location: order ids, token hashes, code hashes, quantities, statuses. Offline, the app verifies a scanned token by hashing it locally, marks it collected **locally**, and queues the validation. On reconnect, `POST /pickups/sync` applies queued validations through the same atomic path; conflicts (e.g. order cancelled meanwhile, or validated twice on two offline devices) are flagged to the merchant and admin, never silently accepted.
- Window rules: validation allowed from `pickup_start` (configurable early tolerance) until `pickup_end + grace`; after window end, staff may "hand over anyway" with a reason (logged as `MANUAL_OVERRIDE`).

## Alternatives
- **Customer self-redeem** — least friction for merchants, weakest fraud protection.
- **Signed QR payload verified offline with a public key** — removes the manifest download, but cannot detect cancelled orders offline and still needs sync; manifest gives better offline answers.
- **Online-only** — simplest, but fails at the counter during outages.

## Consequences
- ✅ Exactly-once pickup enforced by the database (CS-10); fraud signals captured.
- ⚠️ Manifest contains hashes only (no customer personal data beyond first-name initial), expires end of day and is wiped on logout.
- ⚠️ Offline conflicts are possible in rare cases and are surfaced, not hidden.

## Implementation note (2026-10-02)
- The QR token is `<orderId>.<HMAC(server secret, orderId)>`: verifiable without storage, so a database leak exposes no valid passes. The 6-character code is stored (it must be shown again to the customer) and is unique among open orders per store.
- Failed code attempts by members lock a store's code entry after 10 in 5 minutes; attempts by non-members are not attributed to the store, so outsiders cannot trigger the lockout.
- Offline validation (manifest + sync) is not implemented yet.

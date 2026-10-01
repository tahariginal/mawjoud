# ADR-004 — Cursor (keyset) pagination

Status: Proposed · 2026-10-02

## Context
Feeds (offers, orders, notifications) change constantly and will grow to millions of rows. Offset pagination (`OFFSET n`) gets slower as `n` grows and returns duplicates or skips items when rows are inserted or removed between pages.

## Decision
Keyset pagination on a stable, unique sort key: `(sort_value, id)`. The API returns an opaque, HMAC-signed, base64url cursor encoding the last row's sort key and id plus a hash of the query parameters. Distance-sorted feeds use `(distance, id)` relative to the query point carried in the cursor. Indexes are designed to match each sort.

## Alternatives
- **Offset** — simple, supports "jump to page 7", but slow at depth and unstable under writes. Allowed only for small admin tables.
- **Server-side snapshot cursors** — consistent, but stateful and costly.

## Consequences
- ✅ Constant-time pages; stable infinite scroll.
- ⚠️ No random page access (not needed for mobile feeds).
- ⚠️ Every new sort option needs a matching index and a tiebreaker.

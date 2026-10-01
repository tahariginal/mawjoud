# ADR-010 — Transactional outbox for domain events and jobs

Status: Proposed · 2026-10-02

## Context
After a business change (order confirmed, offer published) we must trigger side effects (notifications, impact, analytics). Writing to the DB and then enqueuing to Redis is not atomic: a crash or a Redis outage between the two loses the event; enqueuing first can send a notification for a change that then rolls back.

## Decision
- Every domain event is inserted into `outbox_events` **in the same transaction** as the change.
- A relay in the worker process reads unpublished rows (`FOR UPDATE SKIP LOCKED`, batches), enqueues BullMQ jobs with `jobId = outbox event id` (dedupes double publishing), and marks rows published.
- Consumers are idempotent (unique keys such as `notifications (user_id, dedupe_key)`, `impact_records (order_id)`).
- Published rows are purged after 7 days.

## Alternatives
- **Direct enqueue after commit** — loses events on crash/Redis outage.
- **Change data capture (Debezium etc.)** — robust but heavy infrastructure for MVP.

## Consequences
- ✅ No lost or phantom side effects; Redis outages only delay them (CS-20).
- ⚠️ At-least-once delivery → every consumer must be idempotent (enforced in review and tests).
- ⚠️ Small delay (≈1 s) between commit and side effect.

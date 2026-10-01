# ADR-003 — Redis for cache, rate limiting and queues (never source of truth)

Status: Proposed · 2026-10-02

## Context
We need rate limiting shared across API instances, background jobs with retries and scheduling, short-lived caches for discovery, and notification de-duplication.

## Decision
Redis 8 (managed in production) used for:
- BullMQ queues (via `@nestjs/bullmq`) — jobs, schedulers, retries, dead-letter queues
- `@nestjs/throttler` storage for rate limits
- Short-TTL caches (discovery cells, feature flags, app config)
- Short-lived de-duplication keys (notifications)

Redis is **never** authoritative for inventory, orders, payments or identity. Losing Redis data must never lose business data: events are first written to the PostgreSQL outbox (ADR-010), and notification uniqueness is also enforced by a database unique key.

## Alternatives
- **PostgreSQL-only queues** (e.g. `SKIP LOCKED` job tables) — fewer moving parts, but weaker scheduling/rate-limited job tooling and more load on the primary DB.
- **Managed cloud queues** (SQS etc.) — good durability, but vendor lock-in and still needs a cache and rate-limit store.

## Consequences
- ✅ Mature job tooling; one extra managed service.
- ⚠️ Redis outage: caches miss (DB serves), auth/checkout limiters fail closed with an in-memory fallback, jobs pause and resume from the outbox.
- ⚠️ BullMQ 6 is recent (2026-07-30); compatibility confirmed in the Phase 2 spike, else pin BullMQ 5.

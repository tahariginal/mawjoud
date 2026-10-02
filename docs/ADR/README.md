# Architecture Decision Records

Format: Context → Decision → Alternatives considered → Consequences. Status: `Proposed`, `Accepted`, `Superseded by ADR-xxx`.
All records below are **Proposed** until the Phase 1 architecture is approved.

| ADR | Title |
|---|---|
| [001](ADR-001-modular-monolith.md) | Modular monolith instead of microservices |
| [002](ADR-002-postgresql-postgis.md) | PostgreSQL + PostGIS as the system of record |
| [003](ADR-003-redis.md) | Redis for cache, rate limiting and queues — never source of truth |
| [004](ADR-004-cursor-pagination.md) | Cursor (keyset) pagination |
| [005](ADR-005-payment-idempotency.md) | Payment and checkout idempotency strategy |
| [006](ADR-006-payment-provider-abstraction.md) | Payment provider abstraction (Stripe unavailable in Morocco) |
| [007](ADR-007-kysely-sql-migrations.md) | Kysely + SQL migrations instead of an ORM |
| [008](ADR-008-monorepo-shared-contracts.md) | pnpm/Turborepo monorepo with shared Zod contracts |
| [009](ADR-009-inventory-reservation.md) | Inventory reservation with atomic conditional updates and holds |
| [010](ADR-010-transactional-outbox.md) | Transactional outbox for domain events and jobs |
| [011](ADR-011-authentication.md) | Self-hosted authentication with rotating refresh tokens |
| [012](ADR-012-pickup-validation.md) | Merchant-side pickup validation with offline manifest |
| [013](ADR-013-apps-topology.md) | One mobile app (customer + merchant modes) and a web admin |
| [014](ADR-014-expo-dev-builds.md) | Expo development builds, EAS and Continuous Native Generation |
| [015](ADR-015-reservations-pay-at-pickup.md) | MVP reservations without online payment (pay at pickup) — **Accepted** |

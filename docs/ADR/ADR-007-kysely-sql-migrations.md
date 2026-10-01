# ADR-007 — Kysely + SQL migrations instead of an ORM

Status: Proposed · 2026-10-02

## Context
Correctness depends on precise SQL: conditional updates, row locks, `SKIP LOCKED`, partial and GiST indexes, CHECK constraints, PostGIS functions, generated columns. The data layer must make this SQL explicit, typed and reviewable. Registry state on 2026-10-02: Drizzle stable is 0.45 with 1.0 still in release candidates; Prisma's `latest` tag points at an 8.0 release candidate.

## Decision
- **Kysely** (0.29) as a type-safe SQL query builder; `sql` tagged templates for PostGIS and advanced features (parameters always bound).
- **Migrations as SQL**, executed by Kysely's `Migrator` (`up`/`down` per file). The database schema is the source of truth.
- **kysely-codegen** generates TypeScript types from a freshly migrated database; CI fails if generated types differ from the committed ones.
- Repository classes per module wrap all queries; no query builder usage outside `infrastructure/`.

## Alternatives
- **Prisma** — great developer experience, but PostGIS has historically not been modeled natively (geo queries fall back to raw SQL), row-lock patterns need raw SQL, and the next major is in release-candidate state.
- **Drizzle** — SQL-like and supports many PostgreSQL features, but the 0.x → 1.0 transition is in progress; adopting it now means a near-term migration.
- **TypeORM** — decorator-heavy and hides the generated SQL; less control over exact queries on money/stock paths.

## Consequences
- ✅ Every critical query is readable SQL with full types; no ORM magic in money/stock paths.
- ✅ Constraints, indexes and extensions are first-class in migrations.
- ⚠️ More hand-written SQL; mitigated by repository conventions and integration tests on real PostgreSQL.

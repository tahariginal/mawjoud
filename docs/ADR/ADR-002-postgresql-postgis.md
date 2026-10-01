# ADR-002 — PostgreSQL + PostGIS as the system of record

Status: Proposed · 2026-10-02

## Context
We need transactional correctness (money, stock), rich constraints, and efficient geographic queries (radius, viewport, distance ordering, clustering).

## Decision
PostgreSQL 18 with PostGIS 3.6 (local image `postgis/postgis:18-3.6`); PostgreSQL 17 if the production host does not yet offer 18. Locations stored as `geography(Point,4326)` with GiST indexes; queries use `ST_DWithin`, bounding-box `&&`, KNN ordering and grid clustering. Full-text (`tsvector`) and trigram (`pg_trgm`) search at MVP.

## Alternatives
- **MySQL** — spatial support exists but weaker ecosystem for geography types and GiST-style indexing; fewer constraint features (e.g. partial indexes).
- **MongoDB** — geo queries are good, but multi-document transactions and relational integrity are weaker for orders/payments.
- **Separate geo/search service now** — premature; PostgreSQL covers MVP scale.

## Consequences
- ✅ One source of truth for transactional and geographic data; constraints enforced by the database.
- ✅ Widely available managed offerings with PITR.
- ⚠️ Host must support the PostGIS extension and the chosen major version (checked during D4).

# Scalability — Mazal

## 1. Assumptions (illustrative, to be replaced with real targets from the client)

| Metric | Year 1 (one city) | Growth (multi-city) |
|---|---|---|
| Monthly active users | 50,000 | 1,000,000 |
| Active merchants | 500 | 10,000 |
| Live offers at peak | ~1,500 | ~30,000 |
| Orders / day | ~3,000 | ~60,000 |
| Peak window | 17:00–20:00 local (pickup-driven) | same, per timezone |

Back-of-envelope (Year 1): if 30% of daily orders and ~40% of daily sessions land in the 3-hour evening peak, discovery traffic is roughly **20–60 req/s** and order creation **< 1 req/s** on average with short spikes when popular offers publish. A single well-indexed PostgreSQL primary and 2 small API instances handle this with large headroom. At growth scale, discovery reaches the **hundreds to low thousands of req/s** — still read-heavy and cacheable.

## 2. Where it breaks first, and the planned answer

| Pressure point | Signal | Next step |
|---|---|---|
| Discovery reads on PostgreSQL | DB CPU > 60% at peak, p95 rising | Short-TTL Redis cache for viewport/grid cells (rounded coordinates); then read replica for discovery queries |
| Hot offer contention (popular drop) | Lock waits on one `offer_inventory` row | Already isolated in its own row; requests are short; if needed, queue-based admission for flash drops |
| Map payloads | Large responses at low zoom | Server-side grid clustering (already in design); vector tiles only if justified |
| Notification fan-out (favorite store with 10k fans) | Queue backlog | Batched jobs, per-user dedupe, provider batch APIs; dedicated worker pool |
| Large append-only tables (`audit_logs`, `notifications`, `pickup_attempts`, analytics) | Index size, vacuum time | Monthly partitioning + retention purge |
| Search relevance / volume | Slow trigram queries, relevance complaints | Swap `SearchPort` adapter to OpenSearch/Typesense; PostgreSQL stays source of truth |
| Write volume on orders | Primary saturation (far beyond Year-1 numbers) | Vertical scale first; then partition by region/city |

## 3. Built-in scalability properties

- Stateless API and worker processes → horizontal scaling behind a load balancer.
- Cursor pagination → constant-cost pages.
- Geo queries use GiST indexes with `ST_DWithin` / bounding-box operators — no distance math in JavaScript.
- Async side effects via outbox + queues → request latency independent of notifications/analytics.
- Images through CDN with pre-generated variants.
- Connection pooling sized per process; PgBouncer when instance count grows.

## 4. Evolution path (no premature microservices)

1. **Now:** modular monolith (API + worker processes), one PostgreSQL, one Redis.
2. **Read scaling:** cache + read replica for discovery.
3. **Specialized engines behind existing ports:** search engine, analytics warehouse.
4. **Extract a service only when** a module has a different scaling profile, release cadence or team ownership — likely candidates in order: notifications, search, analytics, payments. Module facades and domain events make extraction a transport change, not a rewrite (ADR-001).
5. **Multi-region:** only if markets or latency demand it; partition by country.

## 5. Performance practice

Measure before optimizing: `EXPLAIN (ANALYZE, BUFFERS)` on seeded production-size data for every discovery query; k6 load tests at 3× expected peak before launch; mobile startup and list FPS profiled on a mid-range Android device.

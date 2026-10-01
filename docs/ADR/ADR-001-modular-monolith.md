# ADR-001 — Modular monolith instead of microservices

Status: Proposed · 2026-10-02

## Context
MVP with a small team, one market, strong consistency needs between orders, inventory and payments. Microservices would turn single database transactions (reserve stock + create order) into distributed sagas.

## Decision
One NestJS codebase organized as domain modules with explicit public facades, deployed as two process types (HTTP API, worker). Modules communicate through facades (sync) and outbox domain events (async). Boundaries are enforced by lint rules.

## Alternatives
- **Microservices now** — independent scaling and deploys, but distributed transactions, network failure modes, more infrastructure and operational load with no current benefit.
- **Unstructured monolith** — fastest start, but boundaries erode and later extraction becomes a rewrite.

## Consequences
- ✅ ACID transactions for the critical path; one deploy; simple local development.
- ✅ Extraction later is a transport change (facade → HTTP/queue), not a redesign.
- ⚠️ Requires discipline: boundary lint rules and code review must hold the line.
- ⚠️ One deployable: a bad deploy affects all modules (mitigated by CI gates, staged rollout, fast rollback).

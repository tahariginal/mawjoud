# ADR-008 — pnpm/Turborepo monorepo with shared Zod contracts

Status: Proposed · 2026-10-02

## Context
The mobile app, API and admin must agree on request/response shapes, enums and error codes. Silent contract drift breaks apps already installed on phones, which cannot be recompiled.

## Decision
- Monorepo with pnpm workspaces and Turborepo: `apps/mobile`, `apps/api`, `apps/admin`, `packages/contracts`, shared config packages.
- `packages/contracts` contains Zod 4 schemas for every endpoint, plus enums and error codes. The API validates with them (small in-house `ZodValidationPipe`, because `nestjs-zod` does not yet support NestJS 12); the mobile client and admin infer types from them.
- OpenAPI is generated from the same schemas (`@asteasolutions/zod-to-openapi`) and diffed in CI against `main` to catch breaking changes for already-released app versions.

## Alternatives
- **Separate repositories + published SDK** — more release overhead, slower iteration.
- **class-validator DTOs + generated client from OpenAPI** — NestJS-idiomatic, but types are generated one way and the mobile app cannot reuse validation logic in forms.

## Consequences
- ✅ One change updates all consumers; TypeScript catches breaks at compile time.
- ✅ Forms on mobile reuse the exact server validation rules.
- ⚠️ Contracts package must stay free of server-only code (lint rule) to keep the mobile bundle small.

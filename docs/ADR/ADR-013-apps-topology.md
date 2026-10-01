# ADR-013 — One mobile app (customer + merchant modes) and a web admin

Status: Proposed — confirm with client (assumption A4) · 2026-10-02

## Context
Customers and merchants both need mobile (merchants scan QR codes at the counter). Admins need large tables, search and bulk review — a desktop task.

## Decision
- **One Expo app** with two route groups: `(customer)` and `(merchant)`. Merchant mode appears only for users with a business membership; switching modes is explicit (Profile → "Switch to business"). Permissions are enforced on the server regardless of UI mode.
- **Admin as a separate web SPA** (React + Vite) reusing `packages/contracts`, served on its own origin, MFA required.

## Alternatives
- **Separate merchant app** — clearer store positioning for businesses, separate release cadence; doubles store listings, review cycles and build pipelines. Can be split later from the same monorepo if merchants need it.
- **Admin inside the mobile app** — poor ergonomics for moderation and investigations.
- **Generic admin generators writing directly to the DB** — bypass domain rules and audit logging; rejected.

## Consequences
- ✅ One codebase and one store listing for MVP; shared components.
- ⚠️ Merchant code ships to all users (bundle size impact small; lazy routes).
- ⚠️ Store listing copy must explain both uses.

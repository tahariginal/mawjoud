# MAWJOOd — Documentation Index

Status: **Phase 1 — Architecture (awaiting approval)**. No product code exists yet.
Last updated: 2026-10-02.

## Documents

| Document | Purpose |
|---|---|
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | Personas, scope, functional & non-functional requirements, acceptance criteria |
| [UX_SPECIFICATION.md](UX_SPECIFICATION.md) | Navigation, screens, journeys, UX decisions (problem → solution → edge cases → a11y) |
| [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) | Tokens (color, type, spacing…), components, states |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Stack, monorepo, modules, runtime topology, key flows, sources of truth |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | ERD, tables, constraints, indexes, state machines, migrations |
| [API_SPECIFICATION.md](API_SPECIFICATION.md) | REST v1 conventions, endpoints, pagination, idempotency, contracts |
| [SECURITY_MODEL.md](SECURITY_MODEL.md) | AuthN/AuthZ, RBAC, threat model, rate limits, privacy |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | Error envelope, code catalog, retry & resilience rules |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Logs, metrics, tracing, health, alerts |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Test pyramid, critical scenarios, contract tests, CI gates |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Environments, CI/CD, backups, restore, rollback |
| [SCALABILITY.md](SCALABILITY.md) | Capacity assumptions, bottlenecks, evolution path |
| [RISK_REGISTER.md](RISK_REGISTER.md) | Product, technical, legal and delivery risks |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Phases, exit criteria, definition of done |
| [ADR/](ADR/) | Architecture Decision Records |

## Working assumptions (must be confirmed)

| # | Assumption | Impact if wrong |
|---|---|---|
| A1 | Launch market is **Morocco**, currency **MAD** | Payments, legal, hosting, localization all change |
| A2 | Launch in one city first (e.g. Casablanca) | Capacity planning, merchant onboarding |
| A3 | ~~Customers pay in-app~~ **MVP: customers reserve in the app and pay at pickup (ADR-015)** | Online payment added later |
| A4 | One mobile app with customer + merchant modes; admin is a web app | See ADR-013 |
| A5 | English first; French and Arabic (RTL) next; Darija later | i18n/RTL is built in from day one regardless |

## Open decisions (blocking specific phases)

| ID | Decision | Owner | Blocks |
|---|---|---|---|
| D1 | **Payment provider** — *deferred: MVP has no online payment (ADR-015).* Stripe does not support Morocco-based accounts (verified at stripe.com/global on 2026-10-02). Choose a Moroccan PSP/acquirer, or confirm a foreign entity. | Client + finance | Phase 5 |
| D2 | Marketplace money flow: does MAWJOOd collect and pay out merchants (commission), or do merchants get paid directly? | Client + legal | Phase 5 |
| D3 | ~~Cash-at-pickup allowed?~~ **Decided 2026-10-02: pay at pickup for the MVP (ADR-015).** | Client | — |
| D4 | Hosting region and data residency under Law 09-08 (CNDP authorization for transfers abroad) | Client + legal counsel | Phase 2 (staging), Phase 11 (prod) |
| D5 | Exact brand spelling for store listings and bundle IDs (`MAWJOOd` vs `Mawjood` vs `Mawjoud`). Bundle IDs **cannot change after publishing**. | Client | Phase 2 |
| D6 | Visual references: the brief mentions "provided MAWJOOd references" but none are in the repository | Client | Phase 1 sign-off of design system |
| D7 | Policies: cancellation cutoff, no-show refund policy, merchant cancellation compensation, commission rate | Client | Phase 5–8 |
| D8 | Impact factors (kg food per offer, kg CO2e per kg) and their scientific sources | Client | Phase 7 |
| D9 | Apple Developer + Google Play accounts, owned by the client's legal entity | Client | Phase 4 device builds, store release |

## Conventions

- Code identifiers in docs (`order_status`, `OFFER_SOLD_OUT`) are canonical; code must use the same names.
- Every package version in these docs was checked on the npm registry on 2026-10-02. Exact versions are pinned in Phase 2 by the installer (`npx expo install` for mobile) and recorded in lockfiles; the docs then defer to the lockfile.

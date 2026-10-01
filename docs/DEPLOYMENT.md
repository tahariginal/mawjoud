# Deployment & Operations — MAWJOOd

## 1. Environments

| Env | Purpose | Data | Payments | Mobile build |
|---|---|---|---|---|
| `local` | Development | Seed data (Docker Compose: PostGIS, Redis, Mailpit, MinIO) | Dev adapter (clearly labeled, blocked in prod) or provider sandbox | Expo development build |
| `staging` | Pre-production, QA, migration rehearsal | Synthetic + anonymized subset | Provider sandbox | EAS internal distribution ("preview" profile) |
| `production` | Real users | Real | Live | Store builds ("production" profile) |

Each environment has its own database, Redis, bucket, secrets, Sentry environment and push credentials. Production data is never copied to lower environments un-anonymized.

## 2. Hosting (proposal — decision D4 pending)

Requirements: containers, managed PostgreSQL with **PostGIS** and **point-in-time recovery**, managed Redis, object storage + CDN, secret manager, region close to Morocco, compliance with Law 09-08 transfer rules.

| Option | Shape | Pros | Cons |
|---|---|---|---|
| **A. Major cloud (recommended)** — e.g. AWS in an EU region near Morocco (Paris `eu-west-3` or Spain `eu-south-2`) | Containers (ECS Fargate), RDS PostgreSQL, ElastiCache, S3 + CloudFront, Secrets Manager | Mature PITR, backups, IAM, scale path | More setup; cost discipline needed |
| B. Managed PaaS in an EU region | Platform containers + managed Postgres + Redis | Fastest to start, cheaper at MVP | Fewer controls; verify PostGIS + PITR + region per vendor |
| C. Hosting in Morocco | Local provider | Simplest data-residency answer | Managed PostGIS / PITR availability to verify |

Final choice after counsel confirms data-transfer requirements. Everything is containerized and configured through environment variables, so the choice does not affect code.

## 3. CI/CD pipeline

```
PR ─▶ lint ─▶ typecheck ─▶ unit ─▶ integration ─▶ migrations check ─▶ contract diff ─▶ build ─▶ security scans
merge to main ─▶ build image (tag = git SHA) ─▶ deploy to staging ─▶ run migrations (job) ─▶ smoke tests ─▶ mobile E2E
release tag ─▶ manual approval ─▶ production: migrations (expand-only) ─▶ rolling deploy ─▶ smoke tests ─▶ watch dashboards 30 min
```

- GitHub Actions (repository host to be confirmed); pnpm + Turborepo caching.
- Migrations run as a separate one-off job **before** the new app version receives traffic; app code is always compatible with both the previous and the new schema (expand/contract).
- Rolling deploys with readiness probes; graceful shutdown (`SIGTERM` → drain ≤ 25 s).
- Mobile: EAS Build + EAS Submit; JS-only fixes via EAS Update restricted to the same runtime version, staged rollout; native changes require store release. `minSupportedVersion` in `/app-config` forces upgrades when needed.

## 4. Backups and recovery

| Item | Policy |
|---|---|
| Automated backups | Daily snapshots + continuous WAL archiving (PITR) |
| Retention | 30 days PITR; monthly snapshot kept 12 months (adjust to legal advice) |
| Off-site | Weekly copy to a second region/account, encrypted |
| Encryption | At rest (provider KMS) and in transit (TLS) |
| Restore drill | Monthly: restore latest backup into an isolated instance, run integrity checks, record time-to-restore |
| Targets | RPO ≤ 5 min (PITR), RTO ≤ 2 h for MVP |

### 4.1 Restore the database (runbook outline)
1. Declare incident; freeze deploys; put API in maintenance mode if data is being corrupted.
2. Identify the target time (just before the bad event) from logs/audit logs.
3. Restore PITR to a **new** instance (never overwrite the original).
4. Verify: migration version, row counts on key tables, sample orders/payments, reconcile payments with the provider for the gap window.
5. Switch the application's database URL to the new instance (secret update + rolling restart).
6. Reconcile anything that happened after the restore point (provider payments and webhooks are the external record).
7. Post-mortem.

### 4.2 Failed deployment
- App: roll back to the previous image tag (one command / one click); schema is backward compatible by design.
- Migration failed mid-way: migrations are transactional where PostgreSQL allows; non-transactional steps (e.g. `CREATE INDEX CONCURRENTLY`) are idempotent (`IF NOT EXISTS`) and re-runnable.

### 4.3 Rolling back a migration
- Preferred: **forward fix** (new migration).
- `down` migrations exist and are CI-tested, but in production they are used only when no data written by the new version would be lost; otherwise restore or forward-fix.

### 4.4 Corrupted data
- Find scope through `audit_logs`, `order_status_history`, `webhook_events`.
- Repair with a reviewed, idempotent, audited script run as a one-off job — never ad-hoc SQL in a production console.
- If repair is impossible, PITR into a side instance and copy back the affected rows.

## 5. Configuration and secrets

- Twelve-factor: all config from environment; validated at boot (`shared/config`).
- `.env.example` lists every variable with a description; real values only in the secret manager.
- Feature flags (DB-backed, cached) for gradual rollouts: new checkout, payment provider switch, ranking strategy, notification system, UI experiments. Percentage rollout uses a stable hash of `userId + flagKey`.

## 6. Launch checklist (Phase 11)

Store accounts owned by the client (D9) · privacy policy & terms · App Store privacy labels / Play data-safety form · account deletion flow · push credentials (FCM, APNs) · Maps API key restrictions · payment provider live approval · CNDP formalities · backups verified by a restore drill · alerts routed to on-call · runbooks reviewed · load test passed · security review passed.

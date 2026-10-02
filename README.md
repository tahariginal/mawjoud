# MAWJOOd

Mobile-first marketplace for rescuing surplus food from local businesses.

**Status:** architecture documented ([docs/](docs/README.md)); mobile app UI complete (customer, merchant, auth, settings); **backend API and worker implemented** (auth, merchants, offers, discovery, reservations paid at pickup, pickup validation, jobs). The app runs against the real API (`EXPO_PUBLIC_API_MODE=http`) or the isolated demo adapter. Not built yet: online payment (deferred, ADR-015), push notifications, admin web app, production infrastructure.

## Repository layout

```
apps/mobile/          Expo (SDK 57) + React Native app — customer and merchant modes
apps/api/             NestJS 12 API (HTTP) + worker (BullMQ jobs, email) — PostgreSQL/PostGIS, Redis
packages/contracts/   Shared Zod schemas, enums, error codes, order state machine
infra/docker/         Local PostgreSQL+PostGIS, Redis and Mailpit (docker compose)
docs/                 Product, UX, design system, architecture, ADRs, risks, plan
```

## Requirements

- Node.js 24 (LTS) — see `.nvmrc`
- pnpm 10 (`corepack enable` or install pnpm globally)
- Docker (local services and the API test suite, which runs against real PostGIS and Redis containers)
- To run on a device: an Expo **development build** (EAS Build) or a local Android SDK / Xcode is the supported path. Expo Go might work for a quick preview (the current native dependencies ship with Expo Go), but this has not been tested, and push notifications will require a development build.

## Setup

```bash
pnpm install
pnpm --filter @mawjood/contracts build          # shared contracts (Turborepo also does this)

# Backend
pnpm services:up                                 # PostGIS :5442, Redis :6389, Mailpit :1035/:8035
cp apps/api/.env.example apps/api/.env
pnpm --filter @mawjood/api build
pnpm --filter @mawjood/api db:migrate
pnpm --filter @mawjood/api db:seed               # development data (see below)
pnpm --filter @mawjood/api dev                   # API on :3100 + worker, rebuilt on change

# App
cp apps/mobile/.env.example apps/mobile/.env.local
# set EXPO_PUBLIC_API_MODE=http and EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:3100/api/v1
pnpm --filter @mawjood/mobile start
```

Emails (verification and reset codes) are delivered by the worker to Mailpit: open http://localhost:8035.

### Development accounts (`db:seed`)

| Email                    | Role                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| `admin@mawjood.local`    | Platform admin (approves businesses)                                     |
| `merchant@mawjood.local` | Owner of four approved stores in Maarif / Gauthier with offers for today |
| `customer@mawjood.local` | Verified customer                                                        |

Password for all: `mawjood-dev-password`. The seed refuses to run unless `APP_ENV=development`; reset with `pnpm services:reset`.

## Commands

| Command (repo root)                                         | What it does                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm verify`                                               | Lint + typecheck + tests + production bundle build for every package (same as CI) |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Individual steps via Turborepo                                                    |
| `pnpm format` / `pnpm format:check`                         | Prettier                                                                          |
| `pnpm --filter @mawjood/mobile start`                       | Start the Expo dev server                                                         |
| `pnpm --filter @mawjood/api dev`                            | API + worker with rebuild on change                                               |
| `pnpm --filter @mawjood/api db:migrate` / `db:rollback`     | Apply all migrations / roll back one                                              |
| `pnpm services:up` / `services:down` / `services:reset`     | Local PostgreSQL, Redis, Mailpit (reset deletes the data)                         |

`typecheck` in the mobile app first runs `scripts/typegen.mjs`, which generates Expo Router's typed routes, so a broken link fails the build.

## API

- REST under `/api/v1` (health probes at `/health/live` and `/health/ready`), errors in one envelope `{ error: { code, message, requestId, timestamp } }` — see `docs/API_SPECIFICATION.md` and `docs/ERROR_HANDLING.md`.
- Configuration is validated at boot (`apps/api/.env.example` lists every variable). Staging/production refuse to start without `APP_SECRET`, JWT keys, `SMTP_URL` and rate limits.
- Tests (`pnpm --filter @mawjood/api test`) start PostGIS and Redis containers, clone a migrated template database per test file, and include the critical concurrency scenarios (last-unit race, duplicate submissions, double pickup scans) plus a contract test that runs the mobile app's own HTTP client against the API.

## Configuration (mobile)

| Variable                      | Default       | Meaning                                                                      |
| ----------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`         | `development` | `development`, `staging` or `production`                                     |
| `EXPO_PUBLIC_API_MODE`        | `demo`        | `demo` = in-memory demo adapter; `http` = real API                           |
| `EXPO_PUBLIC_API_BASE_URL`    | —             | Required when `API_MODE=http`, e.g. `https://api.example.com/api/v1`         |
| `GOOGLE_MAPS_ANDROID_API_KEY` | —             | Build-time. Without it the Android map shows a fallback and the list is used |

Never commit `.env*` files (git-ignored). The app **refuses to start** in production with the demo adapter, or in `http` mode without an API URL.

## Demo mode (development only)

The demo adapter (`apps/mobile/src/api/demo/`) simulates the backend in memory with fictional Casablanca stores, so every screen can be reviewed now. A **"Demo data"** badge is shown while it is active.

- Sign in with any email and password. Verification / reset code: `123456`.
- Reservations are confirmed immediately and paid at the store (no in-app payment, ADR-015).
- Merchant mode: Profile → _Switch to business mode_. Seeded pickup codes to try on the Scan tab: `K7Q9MZ`, `P3XH8T`.

## Placeholders pending decisions

| Placeholder                                                | Where                                                     | Decision                    |
| ---------------------------------------------------------- | --------------------------------------------------------- | --------------------------- |
| Online payment (deferred; Stripe not available in Morocco) | Reservations are paid at the store at pickup              | ADR-015                     |
| Brand spelling, bundle ID `com.mawjood.app`, icon          | `apps/mobile/app.config.ts`, `assets/images/`             | D5, D6                      |
| Visual references                                          | Design tokens follow `docs/UI_DESIGN_SYSTEM.md`           | D6                          |
| CO2e impact factors                                        | Impact screen shows "Coming soon", never a made-up number | D8                          |
| Cancellation / no-show policy, fees                        | Checkout shows a pending-policy note; fees are 0          | D7                          |
| Legal texts, support contact                               | Legal and Help screens show "being prepared"              | Client / counsel            |
| Address search                                             | Location picker offers a fixed list of Casablanca areas   | Backend geocoding           |
| Push notifications, OAuth (Apple/Google), French & Arabic  | Settings show "coming soon" / "translation in progress"   | Later phases                |
| Android Google Maps key                                    | Map falls back to the list                                | Client Google Cloud account |

See [docs/README.md](docs/README.md) for the full list of open decisions.

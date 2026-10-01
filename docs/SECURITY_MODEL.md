# Security Model — MAWJOOd

Reference bar: OWASP ASVS Level 2, OWASP Mobile Top 10, OWASP API Security Top 10.

## 1. Assets and threats

| Asset | Main threats | Primary controls |
|---|---|---|
| Customer accounts | Credential stuffing, account takeover, session theft | argon2id, rate limits, refresh-token rotation with reuse detection, SecureStore |
| Payments | Amount tampering, replayed / forged webhooks, double charges | Server-side pricing, provider-hosted card entry, webhook signature verification, idempotency |
| Inventory | Bot reservations, hoarding | Per-user and per-device limits, max-per-order, risk scoring, hold expiry |
| Pickup | Code guessing, screenshot reuse, staff fraud | 128-bit QR tokens, business-scoped validation, unique pickup row, attempt logging |
| Merchant data | IDOR across businesses | Membership checks in every query, authorization tests per endpoint |
| Admin powers | Insider misuse, stolen admin session | MFA, least privilege, mandatory reason + audit log, separate admin origin |
| Location data | Tracking users | Not stored; coarse in logs; permission in context |
| Secrets | Leakage in repo, app bundle or logs | Secret manager, gitleaks in CI, log redaction, no server secrets in mobile |

## 2. Authentication

| Item | Design |
|---|---|
| Passwords | argon2id (library `argon2`), parameters tuned to ~100–250 ms on production hardware; min length 10; checked against a breached-password list (k-anonymity API or bundled list — decided in Phase 2) |
| Access token | JWT, 15 min, asymmetric signature (ES256) with `kid` header for key rotation; claims: `sub`, `sid`, `role`, `iat`, `exp`. Kept **in memory** on the device |
| Refresh token | Opaque 256-bit random, stored server-side as SHA-256 hash; rotated on every use; 30-day sliding / 90-day absolute; **reuse of a rotated token revokes the whole family** (theft signal); stored in `expo-secure-store` |
| Email verification | 6-digit code, 15 min, max 5 attempts; required before the first order for email/password accounts |
| Password reset | 6-digit code by email, 15 min, single use; success revokes all sessions; response never reveals whether an email exists |
| OAuth | Google and Apple. ID tokens verified server-side (signature via provider JWKS, `iss`, `aud`, `exp`, nonce). Sign in with Apple offered whenever Google sign-in is offered (App Store guideline 4.8) |
| Phone / SMS | Not in MVP (cost and SMS-pumping fraud). Re-evaluate after launch |
| Admin | Mandatory TOTP MFA; shorter sessions (8 h absolute); admin web on a separate origin |
| Logout | Revokes the session; unregisters the device push token |

## 3. Authorization (RBAC + resource ownership)

Roles:
- Platform role on the user: `CUSTOMER` (default), `ADMIN`, `SUPER_ADMIN`.
- Business-scoped role via `business_members`: `OWNER` (brief: `MERCHANT`), `STAFF` (brief: `MERCHANT_STAFF`). A user can be a customer and a member of one or more businesses at the same time.

| Capability | CUSTOMER | STAFF | OWNER | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| Browse, reserve, own orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| View today's pickups (own business) | | ✅ | ✅ | ✅ (read) | ✅ |
| Validate pickup (own business) | | ✅ | ✅ | | |
| Create/edit offers, prices, stock | | | ✅ | remove only | remove only |
| Manage locations, hours, staff | | | ✅ | | |
| Insights | | | ✅ | ✅ | ✅ |
| Approve merchants, moderate, refunds | | | | ✅ | ✅ |
| Feature flags, config, manage admins | | | | | ✅ |

Rules:
1. **Deny by default.** Every route declares its policy; a route without one fails a CI test.
2. **Ownership in the query, not after it.** Example: `WHERE o.id = $id AND o.user_id = $currentUser`. Not-found and not-yours both return `404` (no existence leak).
3. Merchant routes resolve the business from the resource and check membership + role in the same transaction.
4. Clients never send prices, totals, statuses, roles or business ids that grant access — the server derives them.
5. An authorization test matrix (role × endpoint × own/other resource) runs in CI.

## 4. Input and output safety

- Zod validation on every input (strict objects, bounded strings and arrays, numeric ranges, enums).
- SQL only through Kysely's parameterized builder or `sql` tagged templates (parameters bound, never string-concatenated). Lint rule bans `sql.raw` outside reviewed files.
- Output DTOs whitelist fields; no internal ids for other users, no hashes, no provider secrets.
- User-generated text (offer descriptions, reviews) is stored raw, rendered as plain text in the app (React Native does not interpret HTML), and escaped in the admin web (React escaping; no `dangerouslySetInnerHTML`).
- CSRF: the API uses bearer tokens (no cookies) for mobile. The admin web uses the same bearer model; if cookies are introduced later, `SameSite=Strict` + CSRF tokens are required.
- CORS: allow-list only the admin origin; mobile apps are not subject to CORS.
- Security headers via `helmet` (HSTS, `X-Content-Type-Options`, frame denial, minimal CSP for JSON + docs).

## 5. Rate limiting (initial, tunable via config)

Implemented with `@nestjs/throttler` backed by Redis, keyed per IP and/or per user / account identifier.

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 / min per IP+email; 20 / hour per email (then progressive delay) |
| `POST /auth/register` | 5 / hour per IP |
| `POST /auth/password/forgot`, `/auth/email/resend` | 3 / hour per email; 10 / hour per IP |
| `POST /auth/refresh` | 30 / min per session |
| `GET /offers`, `/feed/home`, `/search` | 60 / min per user or IP |
| `POST /orders` | 10 / min and 30 / day per user; max 3 concurrent unpaid holds per user |
| `POST /pickups/validate` | 60 / min per staff user; 10 failed codes / 5 min per location → temporary lock + alert |
| `POST /merchant/offers` | 30 / hour per business |
| `POST /webhooks/payments/*` | High limit; protected by signature, not by rate limit |

If Redis is unavailable, auth and checkout limiters **fail closed** with a short in-memory fallback limit; read endpoints fail open.

## 6. Payments and webhooks

- Card data is entered only in the provider's SDK or hosted page; MAWJOOd never receives or stores PAN, CVV or card credentials (keeps PCI scope minimal).
- Webhooks: verify the provider signature over the **raw** request body, enforce timestamp tolerance, reject unsigned requests, store the event (unique id) before acknowledging, process asynchronously.
- Provider API keys only on the server, in the secret manager. The mobile app only receives publishable/client parameters for a single payment.

## 7. Anti-abuse (risk-based, no CAPTCHA by default)

| Abuse | Control |
|---|---|
| Bot reservations / hoarding | Per-user unpaid-hold cap, max-per-order, hold expiry, per-device and per-IP velocity, email verification before first order |
| Fake accounts | Verified email (or OAuth); disposable-email domain list; device signals |
| Checkout spam | Idempotency, rate limits, holds released quickly |
| Coupon abuse | No coupons at MVP; future coupons bound to verified users + device |
| Pickup fraud | Merchant-side validation, business-scoped codes, attempt logging, unique pickup constraint |
| Merchant abuse (fake reference values, no-shows by merchant) | Moderation queue, reference-value rules, merchant cancellation tracking, admin suspension |
| Escalation | Risk score above threshold → step-up (re-verify email, or CAPTCHA only for that user) |

## 8. Privacy and data protection

- Data minimization: no date of birth, no gender, no precise location storage, no contacts.
- Location permission requested in context with an explanation; manual place selection always available.
- **Account deletion in-app** (App Store guideline 5.1.1(v)): re-authentication → immediate deactivation and session revocation → personal data erased or anonymized within 30 days; order and payment records are retained for legal accounting obligations with the user link pseudonymized.
- Privacy settings: marketing opt-in (off by default), notification types, analytics consent where required.
- Logs: redaction of `authorization`, `password`, `token`, `code`, `email` (hashed), card-like patterns; coordinates rounded.
- **Compliance (Morocco, Law 09-08 / CNDP):** declarations or authorizations for processing, and authorization for transfers of personal data abroad to countries without adequate protection, must be reviewed by legal counsel before production (open decision D4). The architecture supports any hosting region.

## 9. Secrets management

- Never committed. `.env` is git-ignored; `.env.example` documents names only.
- Production secrets in the cloud provider's secret manager, injected at runtime; rotated on staff changes and at least yearly; JWT signing keys rotated via `kid`.
- CI secret scanning (gitleaks) on every PR; dependency scanning (`pnpm audit` + OSV) and CodeQL.
- Mobile: only public configuration (API base URL, publishable keys, Google Maps Android key **restricted** to the app's package name and signing certificate).

## 10. Mobile hardening

- Tokens in Keychain/Keystore via `expo-secure-store`; nothing sensitive in MMKV or logs.
- TLS only (ATS on iOS; cleartext disabled on Android release builds).
- Release builds strip dev menus and verbose logs.
- Certificate pinning: not at MVP (risk of locking users out on certificate rotation); re-evaluate after launch.

## 11. Security review gate (before release)

Checklist: authentication · authorization/RBAC · IDOR matrix · injection · rate limits · secret exposure (repo, bundle, logs) · payment flow & webhook verification · file uploads · location privacy · sensitive data in logs · dependency vulnerabilities. Findings are tracked with severity; no release with open Critical/High.

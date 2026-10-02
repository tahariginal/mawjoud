# API Specification — MAWJOOd (REST, v1)

Base path: `/api/v1`. JSON only. The machine-readable OpenAPI document is generated from `packages/contracts` and served at `/api/v1/openapi.json` in non-production environments.

## 1. Conventions

| Topic | Rule |
|---|---|
| Versioning | URL major version (`/api/v1`). Additive changes only within v1. Breaking change → `/api/v2`, with v1 kept until the minimum supported app version no longer uses it |
| Auth | `Authorization: Bearer <access token>` (JWT, 15 min). Public endpoints marked 🌐 |
| Request ID | Client sends `X-Request-Id` (UUID); server generates one if missing/invalid; echoed in every response and error |
| App version | Mobile sends `X-App-Version` and `X-Platform`; server can answer `426 APP_VERSION_UNSUPPORTED` |
| Validation | Every body, query and param validated by Zod schemas; unknown fields rejected (`strict`) |
| Responses | Explicit response schemas (DTOs). Database rows are never serialized directly |
| Money | `{ "amountMinor": 3500, "currency": "MAD" }` |
| Time | ISO 8601 UTC strings + the location's `timezone` where local display matters |
| IDs | UUID strings |
| Errors | Standard envelope — see ERROR_HANDLING.md |
| Rate limits | Per endpoint; `429` with `Retry-After` — see SECURITY_MODEL.md |

## 2. Pagination (cursor)

```
GET /api/v1/offers?lat=33.58&lng=-7.63&radiusM=3000&limit=20
→ { "data": [...], "page": { "nextCursor": "eyJ…", "hasMore": true } }
GET /api/v1/offers?…&cursor=eyJ…
```

- The cursor is an opaque, base64url-encoded, **HMAC-signed** token containing the sort key of the last item, its id, and a hash of the query parameters. Tampered cursors or cursors reused with different filters → `400 INVALID_CURSOR`.
- `limit` default 20, max 50.
- No offset pagination on feeds or histories (ADR-004). Admin tables may use offset for small, bounded result sets.

## 3. Idempotency

- Required header `Idempotency-Key: <uuid v4>` on: `POST /orders`, `POST /orders/:id/payment`, `POST /orders/:id/cancel`, `POST /pickups/validate`, admin refunds.
- Same key + same body → the original response is replayed (same status, same body).
- Same key + different body → `409 IDEMPOTENCY_KEY_REUSED`.
- Same key while the first request is still running → `409 IDEMPOTENCY_IN_PROGRESS` (client waits and retries).
- Keys expire after 24 h. Details: ADR-005.

## 4. Endpoints

### 4.1 Platform
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/app-config` | 🌐 | Min supported app version, evaluated feature flags, support links |
| GET | `/health/live`, `/health/ready` | internal | Outside `/api/v1`; not exposed publicly through the load balancer except for probes |

### 4.2 Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` 🌐 | email, password, display name, locale |
| POST | `/auth/login` 🌐 | returns access + refresh token |
| POST | `/auth/refresh` 🌐 | rotates refresh token; reuse of an old token revokes the family |
| POST | `/auth/logout` | revokes current session (+ optional device push token) |
| POST | `/auth/email/verify` | 6-digit code |
| POST | `/auth/email/resend` | rate-limited |
| POST | `/auth/password/forgot` 🌐 | always `202` (no account enumeration) |
| POST | `/auth/password/reset` 🌐 | code + new password; revokes all sessions |
| POST | `/auth/oauth/google` 🌐 | ID token verified server-side |
| POST | `/auth/oauth/apple` 🌐 | identity token + nonce verified server-side |

### 4.3 Me
| Method | Path | Notes |
|---|---|---|
| GET / PATCH | `/me` | profile |
| DELETE | `/me` | account deletion (re-auth required; see SECURITY_MODEL.md §8) |
| GET / PUT | `/me/notification-preferences` | |
| PUT / DELETE | `/me/devices/:pushToken` | idempotent register / unregister |
| GET | `/me/impact` | totals + methodology version |
| GET | `/me/data-export` | Phase 10 (privacy) |

### 4.4 Discovery
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/feed/home?lat&lng` | 🌐 (personalized if signed in) | Home sections in one round trip |
| GET | `/offers` | 🌐 | `lat,lng,radiusM` **or** `bbox`; filters: `categoryIds, maxPriceMinor, pickupFrom, pickupTo, dietary, availableOnly, minRating`; `sort: relevance|distance|price|pickup_time`; cursor |
| GET | `/offers/map` | 🌐 | `bbox, zoom` → clusters (low zoom) or points (high zoom) |
| GET | `/offers/:id` | 🌐 | Full detail incl. allergens, terms, live quantity |
| GET | `/stores/:locationId` | 🌐 | Store page: info, hours, current offers |
| GET | `/search?q=` | 🌐 | Businesses + offers; trigram + full-text |
| GET | `/categories` | 🌐 | Localized via `Accept-Language` |

### 4.5 Favorites
| Method | Path | Notes |
|---|---|---|
| GET | `/favorites` | Favorite stores with "has food now" flag |
| PUT | `/favorites/stores/:locationId` | Idempotent add (safe on double tap) |
| DELETE | `/favorites/stores/:locationId` | Idempotent remove |

*(The brief's example `POST /favorites` + `DELETE /favorites/:id` is replaced by an idempotent PUT/DELETE pair keyed by store, which removes duplicate-favorite races.)*

### 4.6 Orders & payments (customer)
| Method | Path | Notes |
|---|---|---|
| POST | `/orders/quote` | `{offerId, quantity}` → server-calculated price breakdown (no reservation) |
| POST | `/orders` | `{offerId, quantity, quoteVersion?}` + `Idempotency-Key` → reservation confirmed immediately, returns `Order` with pickup pass (MVP pay at pickup, ADR-015). Errors: `OFFER_SOLD_OUT`, `OFFER_NOT_AVAILABLE`, `OFFER_QUANTITY_LIMIT`, `PRICE_CHANGED`, `ORDER_LIMIT_REACHED`, `AUTH_EMAIL_NOT_VERIFIED` |
| GET | `/orders` | `status=upcoming|past`, cursor |
| GET | `/orders/:id` | Detail, status, payment status, pickup pass (when confirmed) |
| POST | `/orders/:id/cancel` | Customer cancel; policy-checked; refund automatic |
| POST | `/orders/:id/review` | Only after `PICKED_UP`, once |
| POST | `/webhooks/payments/:provider` | *Deferred with online payment (ADR-015).* Provider-signed; raw body; not under user auth |

### 4.7 Merchant (`/merchant/...`) — requires business membership
| Method | Path | Role |
|---|---|---|
| POST | `/merchant/applications` | any signed-in user |
| GET | `/merchant/businesses` | member |
| PATCH | `/merchant/businesses/:id` | OWNER |
| GET / POST / PATCH | `/merchant/businesses/:id/locations[/:locationId]` | OWNER |
| PUT | `/merchant/locations/:id/hours` | OWNER |
| GET / POST | `/merchant/businesses/:id/members` · DELETE `/…/members/:userId` | OWNER |
| GET / POST | `/merchant/offers` | OWNER |
| PATCH | `/merchant/offers/:id` | OWNER (requires `version`; `409 CONFLICT_STALE_VERSION` on mismatch) |
| POST | `/merchant/offers/:id/pause` · `/resume` · `/end` | OWNER |
| POST | `/merchant/offers/:id/inventory` | OWNER — set total; cannot drop below reserved |
| GET | `/merchant/orders?locationId&date` | OWNER, STAFF |
| POST | `/merchant/orders/:id/cancel` | OWNER |
| POST | `/pickups/validate` | OWNER, STAFF — `{token}` or `{code, locationId}` + `Idempotency-Key` |
| POST | `/pickups/sync` | OWNER, STAFF — offline-queued validations (ADR-012) |
| GET | `/merchant/locations/:id/pickup-manifest` | OWNER, STAFF — today's verifiable list for offline mode |
| GET | `/merchant/insights?businessId&from&to` | OWNER |

### 4.8 Media
| Method | Path | Notes |
|---|---|---|
| POST | `/uploads` | `{purpose, contentType, bytes}` → presigned URL (5 min, size/type-bound) |
| POST | `/uploads/:id/complete` | Triggers processing; image usable when `READY` |

### 4.9 Admin (`/admin/...`) — ADMIN / SUPER_ADMIN, MFA required
Users (search, suspend, restore) · merchant applications (approve, reject) · businesses (suspend) · offers (remove) · reviews (hide) · categories (CRUD + translations) · orders (search, timeline) · payments & refunds (`POST /admin/payments/:id/refunds` with idempotency) · disputes · audit logs (read-only) · feature flags · app config · system overview. Every mutating admin endpoint requires a `reason` and writes `audit_logs` in the same transaction.

## 5. Example — create order

```http
POST /api/v1/orders
Authorization: Bearer eyJ…
Idempotency-Key: 6f1c2a3e-…
X-Request-Id: 1b9d…
Content-Type: application/json

{ "offerId": "0192…", "quantity": 1 }
```

`201 Created`
```json
{
  "order": {
    "id": "0192…",
    "shortCode": "MW-7K3Q9",
    "status": "PAYMENT_PENDING",
    "total": { "amountMinor": 3500, "currency": "MAD" },
    "pickup": { "start": "2026-10-02T17:00:00Z", "end": "2026-10-02T18:00:00Z", "timezone": "Africa/Casablanca" },
    "holdExpiresAt": "2026-10-02T15:12:00Z"
  },
  "payment": { "provider": "…", "clientParams": { } }
}
```

`409 Conflict`
```json
{ "error": { "code": "OFFER_SOLD_OUT", "message": "This offer is no longer available.", "requestId": "1b9d…", "timestamp": "2026-10-02T15:02:11.204Z" } }
```

## 6. Contract safety

- `packages/contracts` holds all request/response Zod schemas, enums and error codes. API controllers and the mobile client both import them → a breaking change fails TypeScript compilation in the monorepo.
- Released mobile apps cannot be recompiled, so CI additionally diffs the generated OpenAPI against `main` and **fails on breaking changes** (removed fields, narrowed types, new required inputs) unless the PR is explicitly marked as a versioned breaking change.
- Response schemas are validated in API integration tests (responses must parse with the contract schema).

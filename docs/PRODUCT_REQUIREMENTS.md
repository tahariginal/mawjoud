# Product Requirements — MAWJOOd

## 1. Vision

MAWJOOd connects people with nearby food businesses that have good food left at the end of the day. Customers rescue it at a lower price, businesses recover value instead of throwing it away, and less food is wasted.

**North-star question the app must answer within seconds of opening:** *"What can I rescue near me right now?"*

MAWJOOd learns from the surplus-food marketplace *model* (pickup windows, reserve-and-pay, in-store pickup). It does **not** reuse any other company's branding, copy, assets, layouts or visual identity.

## 2. Product principles

Fast · Trustworthy · Simple · Modern · Local · Sustainable · Premium but accessible · Easy for first-time users.

Explicitly avoided: clutter, decorative animation, repeated information, unnecessary onboarding, dark patterns, fake urgency (fake timers, invented scarcity), aggressive notifications.

## 3. Personas

| Persona | Goal | Key constraint |
|---|---|---|
| **Customer** — student, young professional, family on a budget | Good food at a low price, close by, without hassle | Limited time; often on a mobile network; may not have a card |
| **Merchant owner** — bakery, café, restaurant, grocer, supermarket manager | Recover value from surplus with minimal effort | Busy at closing time; low tolerance for admin work |
| **Merchant staff** — cashier, counter staff | Hand over orders quickly and correctly | Seconds per customer; shared device; may be offline |
| **Admin / support** — MAWJOOd operations | Keep the marketplace safe and fair, resolve issues | Needs full visibility with an audit trail |

## 4. Scope

### 4.1 Customer (mobile)

| ID | Requirement | Priority |
|---|---|---|
| C-01 | Browse nearby offers **without an account** (sign-in required only to reserve) | Must |
| C-02 | Set location by GPS (permission requested in context) or by choosing a place manually | Must |
| C-03 | Home feed: available near you, pickup soon, new nearby, favorites with stock, categories | Must |
| C-04 | Explore in list and map views, with server-side filters (distance, price, category, pickup time, dietary, availability, rating) and sorting (relevance, distance, price, pickup time) | Must |
| C-05 | Offer details: business, rating, distance, title, description, expected contents, price, reference value, savings, quantity left, pickup date and window, address, map, allergen info, terms | Must |
| C-06 | Reserve with an explicit quantity and confirmation step; pay securely | Must |
| C-07 | Order confirmation with pickup pass (QR + short code) | Must |
| C-08 | Directions to the business (hand-off to the device's maps app) | Must |
| C-09 | Order history and order detail, including cancelled and refunded orders | Must |
| C-10 | Cancel an order before the cancellation cutoff (policy D7) | Must |
| C-11 | Favorite stores; get notified when a favorite has food available | Must |
| C-12 | Notification preferences: per type, quiet hours, frequency cap | Must |
| C-13 | Impact: money saved, meals rescued, estimated CO2e avoided, each with a visible methodology | Should |
| C-14 | Rate a completed order (1–5 + optional comment) | Should |
| C-15 | Account: sign up, sign in (email/password, Google, Apple), verify email, reset password, delete account | Must |
| C-16 | Language selection (English first; French, Arabic with RTL later) | Must (architecture) |
| C-17 | Search businesses and offers by text | Should |
| C-18 | Recently viewed | Could |

### 4.2 Merchant (mobile, merchant mode)

| ID | Requirement | Priority |
|---|---|---|
| M-01 | Apply to join: business profile, category, legal info, first location; admin approves | Must |
| M-02 | Manage locations (address, map pin, timezone, phone) and opening hours | Must |
| M-03 | Create, edit, pause and resume offers: title, description, category, quantity, price, reference value, pickup window, allergens, dietary tags, max per order | Must |
| M-04 | Adjust remaining quantity safely (cannot go below what is already reserved) | Must |
| M-05 | Today view: upcoming pickups per location | Must |
| M-06 | Validate pickup by scanning the customer's QR code, or by entering the short code | Must |
| M-07 | Work through short network outages at the counter (offline pickup manifest; ADR-012) | Should |
| M-08 | Cancel an offer or order with a reason; customers are refunded automatically | Must |
| M-09 | Sales and rescued-food statistics | Should |
| M-10 | Invite staff with a limited role (validate pickups, view today's orders; cannot edit prices or payouts) | Should |
| M-11 | Repeat offers (daily template) | Could (post-MVP) |

### 4.3 Admin (web)

| ID | Requirement | Priority |
|---|---|---|
| A-01 | Search and manage users (suspend, restore, view orders); no silent edits | Must |
| A-02 | Review and approve merchant applications; suspend merchants | Must |
| A-03 | Moderate offers (remove with reason) and reviews | Must |
| A-04 | Manage categories and their translations | Must |
| A-05 | Investigate orders: full state history, payments, webhooks, pickups | Must |
| A-06 | Issue full or partial refunds; handle disputes | Must |
| A-07 | Audit log viewer (every admin mutation is logged) | Must |
| A-08 | Feature flags and platform configuration (e.g. minimum app version, hold duration) | Must |
| A-09 | Marketplace and system health overview | Should |

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Correctness | No overselling, no duplicate orders, no double pickup, server-authoritative pricing — under concurrency, retries and crashes |
| Performance | Home feed p95 < 400 ms server time at launch scale; first meaningful content < 2 s on a mid-range Android device over 4G (targets, to be measured) |
| Availability | Target 99.9% monthly for the API; graceful degradation when maps, push or the payment provider are down |
| Security | OWASP ASVS L2 as the reference bar; RBAC; full audit of admin actions; no secrets on the client |
| Privacy | Data minimization; precise location never stored; account deletion in-app (also required by App Store guideline 5.1.1(v)) |
| Accessibility | WCAG 2.2 AA contrast, screen-reader labels, dynamic type, 48 dp minimum touch targets, reduced motion respected |
| Localization | All UI strings use translation keys; RTL-ready layout from day one |
| Operability | Structured logs, request IDs, metrics, error tracking, health endpoints, documented runbooks |
| Recoverability | Automated backups with point-in-time recovery; restore drills; documented rollback |

## 6. Business rules (initial; values configurable)

| Rule | Initial value | Notes |
|---|---|---|
| Reservation hold before payment | 10 minutes | Stock is held; released automatically if payment does not complete |
| Max quantity per order | Merchant-defined, default 2 | Anti-hoarding |
| Customer cancellation cutoff | Pending (D7) | e.g. until 2 h before pickup start |
| Pickup grace after window end | 30 minutes | After that, order becomes `NO_SHOW` |
| Early pickup tolerance | 0 minutes | Merchant cannot validate before window start, unless configured |
| No-show refund | Pending (D7) | Default assumption: no refund |
| Merchant cancels | Full automatic refund + customer notified | Counted against merchant reliability |
| Reference value | Optional; if set, must be > price; merchant attests it is genuine | Shown as "usually 90 MAD", moderated |
| Money | Integer minor units (centimes), ISO 4217 currency | Never floating point |

## 7. Success metrics

| Metric | Why |
|---|---|
| Time from app open to first offer visible | Measures the north-star |
| Offer view → reservation conversion | Clarity of offers and checkout |
| Checkout success rate (started → paid) | Payment reliability |
| Pickup completion rate and no-show rate | Real-world fulfilment |
| Sell-through rate per merchant | Merchant value |
| Inventory conflict rate (`OFFER_SOLD_OUT` at checkout) | Freshness of availability data |
| Notification opt-out rate | Detects spam |

## 8. Out of scope for MVP

Delivery, in-app chat, loyalty points, coupons and promotions (data model leaves room), AI recommendations, web customer app, multi-currency per merchant, phone/SMS sign-in (re-evaluate after launch; SMS cost and SMS-pumping fraud risk).

## 9. Release acceptance criteria

The product is **not** releasable if any of these is true:

- TypeScript errors exist, or critical tests fail
- The payment flow is unreliable, or the payment state cannot be reconciled
- Inventory can oversell, duplicate orders can occur, or a pickup can be validated twice
- Unauthorized users can read or change merchant or admin data
- The API or the app bundle exposes secrets
- Any screen can render blank (no loading, empty or error state)
- A critical failure has no recovery path
- Migrations are undocumented, the production environment is undefined, or no backup / restore / error-monitoring strategy exists

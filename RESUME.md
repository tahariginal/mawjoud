# Mazal — Project resume

_Status as of 2026-10-02._

Mazal is a mobile marketplace that lets people in Morocco (starting with Casablanca) reserve surplus food from bakeries, cafés, pastry shops and grocers at a reduced price, then collect it in a pickup window. Merchants publish offers, customers reserve them, and the store validates the pickup by scanning a QR pass. Online payment is postponed: customers **pay at the store when they collect** (ADR-015).

**Where things stand**

- Architecture and product documentation: complete.
- Mobile app: every screen built (customer, merchant, account, settings), running either on built-in demo data or on the real backend.
- Backend: the core features of the MVP are implemented and tested against a real database.
- Code: pushed to the private GitHub repository `tahariginal/mawjoud`, CI green on every push.
- Not yet built: online payment, photo uploads, push notifications, admin web panel, production hosting (see [section 8](#8-not-built-yet)).

---

## Contents

1. [Work history](#1-work-history)
2. [Documentation delivered](#2-documentation-delivered)
3. [Mobile app — UI/UX](#3-mobile-app--uiux)
4. [Backend](#4-backend)
5. [Infrastructure and tooling](#5-infrastructure-and-tooling)
6. [Testing and quality](#6-testing-and-quality)
7. [Technology stack](#7-technology-stack)
8. [Not built yet](#8-not-built-yet)
9. [Decisions waiting on the client](#9-decisions-waiting-on-the-client)
10. [How to run it](#10-how-to-run-it)

---

## 1. Work history

Each phase ended with typecheck, lint, tests and build passing, then one commit.

| #   | Commit                                                                         | What it delivered                                                                                        |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1   | `docs: add phase 1 architecture and product documentation`                     | Product requirements, UX, design system, architecture, database, API, security, testing docs and ADRs    |
| 2   | `chore: set up pnpm/Turborepo monorepo and CI`                                 | Monorepo, shared config, GitHub Actions pipeline                                                         |
| 3   | `feat(contracts): add shared Zod API contracts`                                | One package of request/response schemas shared by the app and the API                                    |
| 4   | `feat(mobile): build all app screens on an isolated demo adapter`              | Every mobile screen, design system, demo data adapter                                                    |
| 5   | `docs: document setup, demo mode and placeholders`                             | README and the list of placeholders                                                                      |
| 6   | `feat: switch MVP to reservations paid at pickup`                              | Online payment removed from the MVP (ADR-015); app and contracts updated                                 |
| 7   | `feat(api): add NestJS 12 foundation with PostgreSQL/PostGIS schema`           | API skeleton, config, logging, errors, health, database schema and migrations                            |
| 8   | `feat(api): add authentication and account management`                         | Register, email verification, login, sessions, password reset, account deletion                          |
| 9   | `feat(api): add merchant onboarding, offers and admin review`                  | Merchant applications, admin approval, stores, opening hours, offers                                     |
| 10  | `feat(api): add customer discovery, search and favorites`                      | Home feed, explore (list and map), search, store pages, favorites                                        |
| 11  | `feat(api): add reservations (pay at pickup) and pickup validation`            | Quotes, reservations, cancellation, reviews, pickup by QR or code, merchant insights, customer impact    |
| 12  | `feat(api): add worker process for email and scheduled jobs`                   | Background worker: emails, automatic status changes, cleanup                                             |
| 13  | `test(api): run the mobile client against the API; add dev seed and tooling`   | App-vs-API contract test, development data, one-command local services, documentation brought up to date |
| 14  | `fix(mobile): point the example API URL at the API's port 3100`                | Configuration fix found during the pre-push review                                                       |
| 15  | `feat(mobile): switch design tokens to a clean, minimal palette`               | Minimal redesign, phase 1: white surfaces, Inter only, flat cards                                        |
| 16  | `feat(mobile): restyle base UI components for the minimal look`                | Buttons, chips, fields, banners, groups                                                                  |
| 17  | `feat(mobile): restyle domain components photo-first`                          | Photo-first offer cards, discount pill, image placeholders, thumbnails                                   |
| 18  | `feat(mobile): apply the minimal layout to the key screens`                    | Home, offer details, checkout, orders, profile, merchant screens                                         |
| 19  | `docs: document the minimal design system`                                     | `UI_DESIGN_SYSTEM.md` and UX spec updated                                                                |
| 20  | `fix(mobile): polish issues found in the design review screenshots`            | Eight visual fixes found by reviewing every screen                                                       |
| 21  | `feat(brand): add the Mazal logo and brand sheet`                              | Logo (tagine with a leaf), Majorelle blue, `brand/`                                                      |
| 22  | `feat(mobile): use Majorelle blue as the primary color and the Mazal app icon` | Blue replaces black for actions; new app icon and splash                                                 |
| 23  | `refactor: rename the project from MAWJOOd to Mazal`                           | Name changed everywhere: app, code, API, Docker, docs                                                    |
| 24  | `feat(mobile): richer demo data with real food photos`                         | 11 stores, 13 offers, free Pexels photos (demo mode only)                                                |
| 25  | `docs: add the design review screenshots and project resume`                   | `design-review/` and this file                                                                           |

---

## 2. Documentation delivered

All in `docs/`.

| Document                  | Content                                                                                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCT_REQUIREMENTS.md` | Users, journeys, features, business rules, MVP scope                                                                                                                                                                                                                                                                  |
| `UX_SPECIFICATION.md`     | Screen-by-screen behavior, states, flows                                                                                                                                                                                                                                                                              |
| `UI_DESIGN_SYSTEM.md`     | Colors, typography, spacing, components, accessibility rules                                                                                                                                                                                                                                                          |
| `SYSTEM_ARCHITECTURE.md`  | Components, modules, technology choices, "as implemented" section                                                                                                                                                                                                                                                     |
| `DATABASE_DESIGN.md`      | Tables, constraints, indexes, concurrency rules                                                                                                                                                                                                                                                                       |
| `API_SPECIFICATION.md`    | Every endpoint, error codes, pagination                                                                                                                                                                                                                                                                               |
| `SECURITY_MODEL.md`       | Threats, authentication, authorization, data protection (Moroccan law 09-08)                                                                                                                                                                                                                                          |
| `ERROR_HANDLING.md`       | Error envelope, every error code and what the app shows                                                                                                                                                                                                                                                               |
| `TESTING_STRATEGY.md`     | Test layers, 20 mandatory critical scenarios, CI gates, current status                                                                                                                                                                                                                                                |
| `OBSERVABILITY.md`        | Logs, metrics, alerts                                                                                                                                                                                                                                                                                                 |
| `SCALABILITY.md`          | Load assumptions and how the system grows                                                                                                                                                                                                                                                                             |
| `DEPLOYMENT.md`           | Environments, release process, launch checklist                                                                                                                                                                                                                                                                       |
| `IMPLEMENTATION_PLAN.md`  | 11 phases with exit criteria and current status                                                                                                                                                                                                                                                                       |
| `RISK_REGISTER.md`        | Known risks and mitigations                                                                                                                                                                                                                                                                                           |
| `README.md`               | Index and the list of open client decisions (D1–D9)                                                                                                                                                                                                                                                                   |
| `ADR/ADR-001…015`         | Architecture decisions: modular monolith, PostgreSQL + PostGIS, Redis, cursor pagination, payment idempotency, payment provider abstraction, Kysely + SQL migrations, shared contracts, inventory reservation, transactional outbox, authentication, pickup validation, apps topology, Expo dev builds, pay at pickup |

---

## 3. Mobile app — UI/UX

Built with Expo (React Native) and Expo Router. 41 screens in `apps/mobile/src/app`.

### 3.1 Design system

Source of truth: `docs/UI_DESIGN_SYSTEM.md`, implemented in `apps/mobile/src/design/tokens.ts`.

| Element    | Choice                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style      | Clean and minimal (redesigned 2026-10-03): white surfaces, near-black text `#111111`, black primary buttons, hairlines instead of boxes and shadows |
| Accent     | One green `#0B7A4B`, only for savings, "Open now", success and the brand wordmark; prices stay black                                                |
| Status     | Muted error `#B42318`, warning `#8A5300`, info `#1F5FA8` — each as a foreground/background pair                                                     |
| Contrast   | Every text/background pair checked against WCAG 2.2 AA                                                                                              |
| Typography | Inter only; 9 sizes from 34 to 12, titles with slightly tight letter spacing                                                                        |
| Spacing    | 4-point scale (2 → 64); corner radius 6 / 8 / 12 / 16 / 24 / pill; buttons and fields 52 dp                                                         |
| Touch      | Minimum touch target 48 dp                                                                                                                          |
| Icons      | Ionicons, outline when inactive and filled when active in the tab bars                                                                              |
| Rule       | Components use semantic colors (`actionPrimaryBg`, `textSecondary`…), never raw hex values                                                          |

**Reusable components** (`src/components`)

- Basics: `AppText`, `Button` (primary, secondary, tertiary, destructive; loading and disabled states), `IconButton`, `TextField`, `FormField`, `Chip`, `Badge`, `Banner` (info, success, warning, error), `ListRow`, `SegmentedControl`, `Stepper`, `Icon`, `Screen` / `Card` / `Group` / `SectionHeader` layouts.
- State views: `Skeleton` and `ListSkeleton` (loading), `EmptyState`, `ErrorState` (with "Try again").
- Domain: `OfferCard` (rail and list variants), `OfferImage` (with a "No photo yet" placeholder), `OffersMap`, `PriceTag` (price, usual value, savings), `QRPass`, `OrderRow`, `StoreRow`, `FavoriteButton`, `LocationChip`, `OrderStatusBadge`, `OfferStatusBadge`, `DemoBadge`, `SignInPrompt`, `OfflineBanner`, `TabHeader`, `OfferForm`.

### 3.2 UX rules applied on every screen

- **No blank screens.** Every data screen has four states: loading (skeletons shaped like the content), empty (icon, explanation, next action), error (plain message and "Try again"), and content. A route-level error boundary catches crashes with "Something went wrong" and a retry button.
- **Offline.** A banner appears when the phone loses its connection ("You're offline — showing saved information"), and network errors get their own message.
- **Guests can browse.** Home, explore, offers and stores work without an account. Orders, favorites, checkout and impact show a sign-in prompt explaining why an account is needed.
- **Clear money.** Prices are in MAD with the usual value and the saving. Fees, tax and discount lines only appear when they are above zero. Every payment wording says "pay at pickup".
- **No invented numbers.** CO₂ figures show "Coming soon" until a sourced methodology exists; the impact screen explains how money saved is calculated.
- **Safe actions.** Cancelling an order, ending an offer and deleting the account all ask for confirmation. Destructive buttons are red.
- **Friendly errors.** Every server error code maps to a human sentence (e.g. sold out: "This rescue has already been claimed").
- **Accessibility.** Screen-reader labels on icons and images, headers marked as headers, live regions for result counts, the pickup code read out character by character, 48 dp touch targets.
- **One source for text.** Every visible string lives in `src/i18n/locales/en.ts`, with typed keys so a missing string fails the build. French and Arabic (with right-to-left layout) are planned.
- **Demo mode is obvious.** In demo mode a "Demo data" badge and a warning banner say nothing is real; demo mode is refused in production builds.

### 3.3 Navigation map

```
App start → Home
│
├── Customer tabs ─ Home · Explore · Orders · Favorites · Profile
│     Home ───────→ Search, Location, Offer, Store, Order (active pickup), Impact
│     Explore ────→ Filters (modal), Search, Offer
│     Orders ─────→ Order → Review (modal), Help
│     Favorites ──→ Store
│     Profile ────→ Sign in / Sign up, Impact, Merchant apply or merchant mode,
│                   Account, Notifications, Language, Privacy, Help, Legal, Delete account
│
├── Offer ──→ Store, Directions (maps app), Checkout (modal) → Order
│
├── Auth ─ Sign in · Sign up · Verify email · Forgot password · Reset password
│
├── Merchant mode tabs ─ Today · Offers* · Scan · Insights* · Business
│     Offers ─────→ New offer (modal), Edit offer
│     Business ───→ Staff*, Switch to customer mode
│     (* owner only; staff members see Today, Scan and Business)
│
└── System ─ Update required · Page not found · Error boundary
```

### 3.4 Customer screens

**Home** (`(tabs)/home.tsx`)

- Top bar: bold location name with a chevron (tap to change), the demo badge in demo mode, and a search button.
- Full-width search field that opens search.
- **Active pickup banner** (black, the one dark block) when the customer has a confirmed order to collect today: "Pickup today at {store}" with a "Show pass" button.
- **Categories** as one scrolling chip row: tapping one opens Explore already filtered.
- Horizontal rails of photo-first offer cards: **Available near you**, **Pickup soon**, **Your favorites with food**, each with "See all". Empty rails are hidden.
- **New nearby** stores list.
- **Your impact** card (items rescued, money saved), shown only after the first collected order.
- Pull to refresh; skeleton while loading; an empty state that offers to change the area.

**Explore** (`(tabs)/explore.tsx`)

- **List / Map** switch.
- Chips: **Filters** (shows how many are active) and the sort options: Recommended, Distance, Price, Pickup time.
- Result count read out to screen readers.
- List: offer cards with infinite scroll (20 per page) and pull to refresh.
- Map: one pin per offer, and a **Search this area** chip that searches the visible map area. On Android without a Google Maps key, a clear placeholder offers to show the list instead.
- Empty state: "Nothing nearby right now" with **Clear filters**.

**Filters** (modal, `filters.tsx`)

- Pickup day: Any, Today, Tomorrow.
- Distance: 1, 2, 5 or 10 km.
- Maximum price: Any, ≤ 30, ≤ 50, ≤ 100 MAD.
- Categories (from the server).
- Dietary: Vegetarian, Vegan, Gluten-free, Dairy-free, Halal.
- Minimum rating: Any, 4+, 4.5+.
- Switch: only show available offers.
- Footer: **Reset** and **Show results**. Changes apply only when confirmed.

**Location** (modal, `location.tsx`)

- **Use my current location**, with the note that the location is never stored. Handles refused permission and failure with clear messages.
- Five Casablanca areas to pick manually: Maarif, Gauthier, Racine, Centre-ville, Oasis. Address search is a placeholder for later.

**Search** (`search.tsx`)

- Search field that opens with the keyboard ready; searches after 2 characters and a short pause.
- Results grouped into **Stores** and **Offers**; "No results for …" when empty.

**Offer details** (`offer/[id].tsx`)

- Full-bleed photo (or the placeholder: category icon and store initials) with round white back and favorite buttons floating over it.
- Badges: "{n} left" or "Sold out", rating with review count.
- Title, store and distance.
- Warning banner when the offer has ended, is sold out or is paused.
- **Price:** price, usual value, "-{n}%" pill, "You save {amount}", "Up to {n} per order".
- **Pickup:** window ("Today 18:00–19:30"), address and **Directions** (opens the phone's maps app).
- **What you might get:** description and "Contents may vary…" note.
- **Allergens** (the 14 regulated allergens as warning badges) or "No allergens declared — ask staff". **Dietary** badges.
- **About the store**, which opens the store page. **Terms**. Sections are separated by hairlines, not cards.
- Fixed bottom bar: price and pickup time on the left, black **Reserve** button on the right, disabled with the reason when unavailable. Guests are sent to sign in.

**Store page** (`store/[id].tsx`)

- Name, description, address and distance, rating, Directions; favorite heart in the header.
- **Available now:** the store's current offers, or an empty state suggesting to add it to favorites.
- **Opening hours** Monday to Sunday, "Closed" on missing days; the section only appears once the merchant has set hours.

**Checkout** (modal "Review your rescue", `checkout/[offerId].tsx`)

- Guests see a sign-in prompt; unverified accounts are asked to verify their email first.
- Quantity stepper, limited by the per-order maximum and the remaining stock.
- Pickup window and address.
- Price breakdown calculated by the server: subtotal, then fees, tax and discount (only if above zero), and the total. Note: "No payment in the app. You pay the store when you collect your order."
- Cancellation policy note (final policy pending the client).
- Button **Reserve · pay {amount} at pickup**.
- If someone takes the last unit meanwhile, a dedicated screen says "This rescue has already been claimed" with **Find food nearby**. If the price changed, the total is recalculated before trying again.
- Double taps and network retries never create two orders: each attempt carries a saved idempotency key.

**Order details** (`order/[id].tsx`)

- Status badge (Confirmed, Ready for pickup, Collected, Cancelled, Expired, Not collected…), store and pickup window.
- **Pickup pass** for orders to collect: a high-contrast QR code and the 6-character code in large spaced letters (selectable, read letter by letter by screen readers).
- Banner "Pay {amount} at the store when you collect".
- "Collected {date time}" banner after pickup.
- Pickup address with Directions; items with line totals; **Total to pay at pickup**; order reference.
- Actions: **Rate this rescue** (after pickup), **Cancel order** (with confirmation, only while allowed), **Need help with this order?**

**Orders tab** (`(tabs)/orders.tsx`): **Upcoming / Past** switch, order rows, empty states ("Rescued offers will appear here with your pickup pass"), sign-in prompt for guests.

**Favorites tab** (`(tabs)/favorites.tsx`): followed stores with "{n} offers available" or "No food right now", empty state explaining the benefit, sign-in prompt for guests.

**Profile tab** (`(tabs)/profile.tsx`)

- Demo warning banner in demo mode.
- Name and email, or for guests "Welcome to Mazal" with **Sign in** and **Create account**.
- **Your impact**.
- **For businesses:** "Switch to business mode" for merchants, otherwise "Sell your surplus food on Mazal" (opens the application).
- **Settings:** Account details, Notifications, Language, Privacy.
- Help, Terms of service, Privacy policy.
- Sign out; **Delete account** in red; app version.

**Impact** (`impact.tsx`): rescues completed, items rescued, money saved, estimated CO₂e ("Coming soon"), how money saved is calculated, and a note that CO₂ figures need a sourced methodology first.

**Review** (modal, `review/[orderId].tsx`): 1 to 5 stars, optional comment, **Send review**, then a thank-you state.

### 3.5 Account screens

| Screen          | What it does                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in         | Email, password with show/hide, "Forgot password?", note that Apple/Google sign-in comes later, link to sign up. Unverified accounts go to verification |
| Sign up         | Name, email, password (at least 10 characters, rule shown), consent to terms and privacy policy, link to sign in                                        |
| Verify email    | 6-digit code sent by email, **Send a new code**; in demo mode the demo code is shown                                                                    |
| Forgot password | Email → sends a code; never reveals whether an account exists                                                                                           |
| Reset password  | Email, code, new password → success message and **Sign in**                                                                                             |

### 3.6 Settings and information screens

| Screen                | What it does                                                                                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notifications         | For each type (Favorites have food, Order updates, Pickup reminders, News and offers): push and email switches. Quiet hours (HH:MM, validated), favorite alerts per day. Saved to the server; a banner says push arrives in a later build |
| Language              | English active; Français and العربية listed as "Translation in progress"; note that Arabic switches the layout to right-to-left                                                                                                           |
| Account               | Edit display name; email shown                                                                                                                                                                                                            |
| Delete account        | Explains what is deleted and what the law requires to keep, password confirmation, final confirmation dialog                                                                                                                              |
| Privacy               | Plain statements on location, data kept and marketing (off by default), link to the policy                                                                                                                                                |
| Terms, Privacy policy | Placeholder: final text is being prepared with legal counsel                                                                                                                                                                              |
| Help                  | How to get help with an order; support contact is a placeholder                                                                                                                                                                           |

### 3.7 Merchant mode

Reached from Profile → "Switch to business mode". The app checks the account: guests go to sign in, accounts without a business go to the application form. The server enforces every permission; the app only adapts the tabs to the role.

**Apply as a business** (`merchant/apply.tsx`): business name, legal name, category, address, city, phone, contact email, and a **store pin** (the merchant stands in the store and pins the exact GPS position so customers find it on the map). Submit → "Application received". Until an admin approves, merchant screens show "Application under review" and selling is disabled.

**Today** (owner and staff): store name and "{n} pickups", **Scan a pass** button, today's pickups to hand over first, then the collected ones, each with its status.

**Offers** (owner): **New offer** button (disabled until the business is approved); each offer shows its status (Draft, Live, Paused, Sold out, Ended…), "{x} of {y} left" and "{n} reserved or sold", with **Edit**, **Pause / Resume** and **End offer** (with confirmation).

**New / Edit offer** (form): title, description, category, quantity, price (MAD), usual value (optional, must be higher than the price), pickup day (today or tomorrow), start and end time (end after start), max per order, allergens, dietary tags. Note shown: price and pickup window can't change once customers have ordered (the server enforces it).

**Scan** (owner and staff)

- Camera QR scanner with a permission screen, or **Type code instead** (6 characters).
- Large result panel for each outcome:
  - ✅ **Hand over the order** — "{qty}× {title} — customer {initial}"
  - **Already collected** at {time}
  - **Too early** — opens at {time}
  - **Pickup window closed**
  - ⛔ **Do not hand over** — cancelled or no longer valid
  - **Code not recognized** for this store
- **Scan next**. Demo pickup codes are shown in demo mode.

**Insights** (owner): last 30 days — revenue, orders collected, items rescued, sell-through rate, not-collected rate; "Not enough data yet" when empty.

**Business** (owner and staff): the business and role, locations with opening hours, **Staff** (owner only), **Switch to customer mode**.

**Staff** (owner): list of members with roles, add a staff member by email.

### 3.8 System screens

- **Update required:** shown when the server says this app version is too old (it can't be dismissed).
- **Page not found:** for broken links, with "Go to home".
- **Error boundary:** "Something went wrong" with "Try again", instead of a crash.

### 3.9 Placeholders still visible in the app

| Where                       | Placeholder                                                                                     | Waiting for                          |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| Offer images                | Real API: category icon and store initials (no photo support yet); demo mode uses sample photos | Photo uploads, database images (Ali) |
| Sign in                     | "Sign in with Apple and Google will be available soon"                                          | OAuth                                |
| Location                    | Five fixed Casablanca areas instead of address search                                           | Address search service               |
| Explore map (Android)       | "Map not available yet" without a Google Maps key                                               | Maps API key                         |
| Checkout                    | Cancellation policy text                                                                        | Client decision D7                   |
| Notifications settings      | "Push notifications will be enabled in a later build"                                           | Push notifications                   |
| Language                    | French and Arabic "Translation in progress"                                                     | Translations                         |
| Impact                      | CO₂e "Coming soon"                                                                              | Client decision D8                   |
| Terms, Privacy policy, Help | Final texts and support contact                                                                 | Legal counsel and client             |
| Business tab                | Editing locations and hours in the app                                                          | Mobile screen (API already done)     |
| Scan                        | Offline validation note                                                                         | Offline pickup feature               |

---

## 4. Backend

NestJS API (`apps/api`) and a separate worker process, on PostgreSQL with PostGIS (maps and distances) and Redis.

### 4.1 Endpoints (prefix `/api/v1`)

| Area      | Endpoints                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health    | `GET /health/live`, `GET /health/ready`                                                                                                                                                         |
| Platform  | `GET /app-config` (minimum app version…), `GET /categories`                                                                                                                                     |
| Auth      | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/email/verify`, `/auth/email/resend`, `/auth/password/forgot`, `/auth/password/reset`                              |
| Account   | `GET`, `PATCH`, `DELETE /me`; `GET`, `PUT /me/notification-preferences`; `GET /me/impact`                                                                                                       |
| Discovery | `GET /feed/home`, `GET /offers` (radius or map area, filters, sorting, cursor pagination), `GET /offers/:id`, `GET /stores/:id`, `GET /search`                                                  |
| Favorites | `GET /favorites`, `PUT` and `DELETE /favorites/stores/:id`                                                                                                                                      |
| Orders    | `POST /orders/quote`, `POST /orders`, `GET /orders?status=upcoming\|past`, `GET /orders/:id`, `POST /orders/:id/cancel`, `POST /orders/:id/review`                                              |
| Pickup    | `POST /pickups/validate` (QR token or 6-character code)                                                                                                                                         |
| Merchant  | `POST /merchant/applications`, `GET /merchant/businesses`, `PUT /merchant/locations/:id/hours`, `GET`/`POST /merchant/businesses/:id/members`, `GET /merchant/orders`, `GET /merchant/insights` |
| Offers    | `GET`, `POST /merchant/offers`; `GET`, `PATCH /merchant/offers/:id`; `POST /merchant/offers/:id/{pause,resume,end}`                                                                             |
| Admin     | `GET /admin/businesses`, `POST /admin/businesses/:id/{approve,reject,suspend}` (reason required, audited)                                                                                       |

### 4.2 Guarantees

- **Never oversell.** Stock goes down in one conditional database update, with a database rule that forbids negative stock. Tested with 50 people reserving the last unit at the same moment: exactly one succeeds.
- **No double orders.** Each reservation carries an idempotency key; a repeated request returns the first result.
- **Reservation limit** per customer (3 active by default), safe under concurrent requests.
- **One pickup per order.** Scanning the same pass twice, even on two phones at once, records exactly one pickup; the second scan answers "Already collected".
- **Pickup passes can't be forged.** The QR token is signed with a server secret and not stored, so a database leak exposes no valid passes. Codes are unique per store among open orders. Repeated wrong codes lock code entry for that store for a few minutes; guesses by outsiders don't count toward the lock.
- **Locked terms.** A merchant can't change price or pickup window once someone has ordered, or set the quantity below what is already reserved.
- **Accounts.** Passwords hashed with argon2id; 15-minute access tokens; rotating refresh tokens, and reuse of an old token revokes the whole session family; email verification and password reset by 6-digit codes.
- **Access control.** Every endpoint requires sign-in unless explicitly public. A customer can't see another customer's orders; staff of one store can't validate another store's orders; admin rights are re-checked in the database.
- **Abuse limits.** Rate limits on every sensitive endpoint, stored in Redis; sign-in and code endpoints are limited per IP and per email.
- **Privacy.** Account deletion cancels open orders and anonymizes personal data; logs hide passwords, tokens and codes.
- **Errors.** One error format everywhere: `{ error: { code, message, requestId, timestamp } }`.

### 4.3 Worker (background jobs)

- Sends emails (verification and reset codes) through a queue.
- Marks orders "Ready for pickup" when the window opens and "Not collected" after it closes.
- Ends offers whose pickup window has passed.
- Cleans up expired codes, sessions and idempotency records.

---

## 5. Infrastructure and tooling

- **Monorepo** (pnpm + Turborepo): `apps/mobile`, `apps/api`, `packages/contracts`, `infra/docker`, `docs`.
- **Shared contracts:** the app and the API use the same schemas, so a mismatch fails the build.
- **Local services:** `pnpm services:up` starts PostgreSQL + PostGIS (port 5442), Redis (6389) and Mailpit (a local email inbox at http://localhost:8035).
- **Development data:** `db:seed` creates an admin, a merchant with four active Casablanca stores (Fournil des Oliviers, Café Zellige, Pâtisserie Nour, Verdure Épicerie) and their offers, and a customer. It refuses to run outside development.
- **CI (GitHub Actions):** frozen install, format check, lint, typecheck, all tests, builds and a dependency audit on every push and pull request.
- **Secrets:** `.env` files are git-ignored; only `.env.example` templates are committed. The full history was checked before the first push.

---

## 6. Testing and quality

| Suite     | Tests | What it covers                                                                                                                                                                                                                                                                                           |
| --------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | 100   | Real PostgreSQL/PostGIS and Redis in containers. Auth, merchants, discovery, orders, pickups, jobs, rate limits, schema drift, full migration rollback, email delivery through the real queue. Includes 2 contract tests: the mobile app's own API client runs every screen's calls against the real API |
| Mobile    | 37    | Components, formatting, time zones, version checks, demo adapter, store initials, category icons, discount percentage                                                                                                                                                                                    |
| Contracts | 6     | Order state machine (allowed and forbidden status changes)                                                                                                                                                                                                                                               |

Critical scenarios automated so far: CS-1 (50 buyers, last unit), CS-2 (10 units, 30 buyers), CS-3 and CS-4 (idempotency), CS-10 (double scan), CS-11 (code from another store), CS-12 (cancelled or expired order at pickup), CS-14 (quantity below reserved), CS-17 (refresh token reuse), CS-18 (access to someone else's order).

---

## 7. Technology stack

| Layer     | Technology                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Mobile    | Expo SDK 57, React Native 0.86, Expo Router, TanStack Query, Zustand, React Hook Form, i18next, react-native-maps |
| API       | Node 24, NestJS 12, Kysely, PostgreSQL 18 + PostGIS 3.6, Redis 8, BullMQ, nodemailer, pino logs, helmet           |
| Contracts | Zod 4                                                                                                             |
| Tests     | Vitest + Testcontainers (API), Jest + Testing Library (mobile), node:test (contracts)                             |
| Tooling   | pnpm 10, Turborepo, ESLint, Prettier, GitHub Actions, Docker Compose                                              |

---

## 8. Not built yet

| Item                                                                                                                    | Plan phase |
| ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| Online payment (postponed; pay at pickup for now)                                                                       | 5          |
| Store and offer photos (uploads); image support in the database and a dev seed matching demo mode — **assigned to Ali** | 3 / 8      |
| Map pin clustering                                                                                                      | 4          |
| Offline pickup validation at the counter                                                                                | 6          |
| Push notifications, reminders, transactional outbox                                                                     | 7          |
| Editing locations and hours in the app (API exists)                                                                     | 8          |
| Email invitations for staff (today: existing accounts only)                                                             | 8          |
| Admin web panel (approval works through the API)                                                                        | 9          |
| Apple/Google sign-in, French and Arabic translations                                                                    | —          |
| Device tests (E2E), load tests, security review                                                                         | 10         |
| Production hosting, backups, monitoring, store listings                                                                 | 11         |

---

## 9. Decisions waiting on the client

| #      | Decision                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D5     | **Name — decided 2026-10-03: Mazal**, with the Majorelle blue logo (`brand/`). "Mawjood" was dropped (8 App Store and 5+ Play apps, `mawjood.ma` registered). "Mazal" also exists ("Mazal App", a London restaurant, on the App Store; "Mazal" on Play; `mazal.ma`/`.com` taken, `mazalapp.ma`/`.com` free): use a longer store title and run an OMPIC trademark search before launch |
| D6     | Visual references (logo, colors) mentioned in the brief but never provided                                                                                                                                                                                                                                                                                                            |
| D4     | Hosting region and data residency (law 09-08, CNDP)                                                                                                                                                                                                                                                                                                                                   |
| D9     | Apple Developer and Google Play accounts in the client's company name                                                                                                                                                                                                                                                                                                                 |
| D7     | Policies: cancellation cutoff, no-show rules, commission rate                                                                                                                                                                                                                                                                                                                         |
| D8     | Impact factors (kg of food, CO₂e) and their sources                                                                                                                                                                                                                                                                                                                                   |
| D1, D2 | Payment provider and money flow (Stripe doesn't support Morocco-based accounts) — only when online payment returns                                                                                                                                                                                                                                                                    |

---

## 10. How to run it

Requirements: Node 24, pnpm 10, Docker.

```bash
pnpm install
pnpm services:up                                   # database, Redis, email inbox
cp apps/api/.env.example apps/api/.env
pnpm --filter @mazal/contracts build && pnpm --filter @mazal/api build
pnpm --filter @mazal/api db:migrate
pnpm --filter @mazal/api db:seed                 # development accounts and stores
pnpm --filter @mazal/api dev                     # API on :3100 + worker
```

Mobile app: set `EXPO_PUBLIC_API_MODE=http` and `EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:3100/api/v1` in `apps/mobile/.env.local`, then start Expo. Leave `EXPO_PUBLIC_API_MODE=demo` to use the built-in demo data without a backend.

Development accounts (password `mazal-dev-password`): `admin@mazal.local`, `merchant@mazal.local`, `customer@mazal.local`.

Full check of the whole repository: `pnpm verify`.

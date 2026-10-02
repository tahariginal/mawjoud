# UX Specification — MAWJOOd

## 1. Research basis

Principles were drawn from common patterns in surplus-food marketplaces, food delivery, local marketplaces, booking and fintech apps. We extract **principles**, never designs.

| Pattern source | Principle we keep |
|---|---|
| Surplus-food marketplaces | Time-boxed pickup windows; reserve-and-pay; "contents may vary" honesty; favorites as the main retention loop. One known model has the *customer* swipe in their own app to redeem; MAWJOOd instead has the **merchant validate** (QR or code) because customer-side redemption is easy to fake. |
| Food delivery | Location first; scannable cards; filters as chips; clear "closed / unavailable" states. |
| Local marketplaces | Distance and place are as important as price; map ↔ list toggle. |
| Booking apps | Explicit date/time display; confirmation screen that repeats *what, where, when, how much*; booking pass you can show offline. |
| Fintech | Unambiguous money states ("Checking payment…", never fake success); receipts; trust copy close to the pay button. |

Reference standards: Apple Human Interface Guidelines, Material Design 3, WCAG 2.2 AA.

## 2. Information architecture

### 2.1 Customer mode — bottom tabs

| Tab | Answers | Contents |
|---|---|---|
| **Home** | "What can I rescue right now?" | Location bar, search entry, active-order banner, sections |
| **Explore** | "Show me everything, my way" | List ↔ map toggle, filters, sort |
| **Orders** | "What did I reserve, and when do I pick it up?" | Upcoming (with pickup pass), past |
| **Favorites** | "Do my places have food today?" | Favorite stores, available first |
| **Profile** | "My account, impact, settings" | Impact summary, preferences, help, legal, switch to merchant mode |

**Decision: keep 5 tabs.**
1. *User problem:* the most time-critical object (today's pickup pass) and the main retention loop (favorites) must each be one tap away.
2. *Solution:* 5 tabs — the maximum both iOS and Android guidance recommend — plus an active-order banner on Home when a pickup is within 24 h.
3. *Why less friction:* no hunting for the pass at the counter; favorites checked daily without digging.
4. *Edge cases:* no orders → Orders shows an empty state that links to Home; signed-out → Orders/Favorites show a sign-in prompt explaining the benefit, never a blank screen.
5. *Accessibility:* each tab has an icon **and** a text label; selected state uses shape/weight + color (never color alone); labels scale with dynamic type up to a cap that keeps them on one line.

### 2.2 Merchant mode — bottom tabs

| Tab | Purpose |
|---|---|
| **Today** | Upcoming pickups by location and time slot; counts; big **Scan** button |
| **Offers** | Active / scheduled / paused / ended offers; create offer |
| **Scan** | Camera QR scanner with "enter code" fallback |
| **Insights** | Sales, rescued items, sell-through |
| **Business** | Profile, locations, hours, staff, switch back to customer mode |

Staff see only **Today** and **Scan** (role-based).

### 2.3 Route map (Expo Router)

```
app/
  _layout.tsx                 providers, theme, i18n, error boundary
  (auth)/sign-in, sign-up, verify-email, forgot-password, reset-password
  (customer)/(tabs)/home, explore, orders, favorites, profile
  (customer)/offer/[id]       offer details
  (customer)/store/[id]       store (location) page
  (customer)/checkout/[offerId]  quantity → review → pay → result
  (customer)/order/[id]       order detail + pickup pass
  (merchant)/(tabs)/today, offers, scan, insights, business
  (merchant)/offer/new, offer/[id]/edit, order/[id]
  settings/…                  notifications, language, privacy, delete account
```

Deep links: `mawjood://offer/{id}`, `mawjood://order/{id}`, `mawjood://store/{id}` plus universal/app links on the production domain (domain pending D5). Every deep link resolves even when the target is gone (→ "This offer has ended" state with nearby alternatives).

## 3. Key screens

### 3.1 Home

Order of content (top to bottom):
1. **Top bar** — location chip ("Maarif, Casablanca ▾") and a search button. Profile is a tab, so there is no avatar here.
2. **Search field** — full width; tapping it opens search.
3. **Active order banner** — only if a pickup is upcoming today: store, window, "Show pass". The only dark block on the screen.
4. **Categories** — one horizontally scrolling chip row; a chip opens Explore filtered.
5. **Available near you** — horizontal cards, sorted by deterministic ranking (§6). Rails have a "See all" link to Explore.
6. **Pickup soon** — offers whose window starts within 2 h.
7. **Your favorites with food** — only if any.
8. **New nearby** — merchants that joined recently.
9. **Impact summary** — small, signed-in users only.

(Revised 2026-10-03: the "Good food. Less waste." hero line was removed — it took the top of the screen on every visit.)

**Decision: the location chip is the first element.**
1. *Problem:* every result depends on location; a wrong location makes the whole app look empty.
2. *Solution:* location is always visible and editable in one tap; first launch asks for permission in context ("Show food near me") with a "Choose a place instead" option.
3. *Why:* users immediately understand why they see what they see.
4. *Edge cases:* permission denied → manual place search; GPS slow → use last known coarse location, then refine; outside service area → "We're not in this area yet" + notify-me option.
5. *A11y:* chip announced as "Location: Maarif, Casablanca. Button. Double tap to change."

### 3.2 Offer card

Priority (from brief): **What → Where → When → How much.**

```
┌──────────────────────────────────────┐
│ [photo 16:9, lazy, blurhash]     ♡   │
│ 3 left                               │  ← factual stock, no countdown theatrics
├──────────────────────────────────────┤
│ Boulangerie Atlas                    │  what (business)
│ Assorted pastries                    │  what (offer)
│ 0.8 km · Today 18:00–19:00           │  where · when
│ 35 MAD   usually 90 MAD              │  how much (reference struck through + text "usually")
└──────────────────────────────────────┘
```

Not on the card: rating (detail page), address (detail page), allergens (detail page), description.

**Decision: show savings as "usually 90 MAD", not only a percentage.**
1. *Problem:* percentages are abstract and easy to inflate.
2. *Solution:* show the real price prominently and the merchant-attested reference value in text.
3. *Why:* concrete money is faster to understand and more trustworthy.
4. *Edge cases:* no reference value → show price only; reference ≤ price is rejected by the API.
5. *A11y:* the screen reader reads "35 dirhams, usually 90 dirhams" — strikethrough is never the only signal.

### 3.3 Explore (list ↔ map)

- Segmented control **List | Map**; selection persists per session.
- Filters in a bottom sheet; active filters shown as removable chips; result count updates live ("24 offers").
- **All filtering and sorting run on the server**; the list paginates by cursor; the map requests only the visible viewport.
- Map: clustered markers (server-side clustering at low zoom, client-side below a threshold); tapping a marker opens a preview card at the bottom; "Search this area" appears after the map is panned (no auto-reload while the user is moving — this avoids janky refreshes).

Edge cases: no results → "Nothing nearby right now." + "Widen distance" and "Clear filters" actions; map provider fails → fall back to the list automatically with a non-blocking notice.

### 3.4 Offer details

Sections: photo · business row (name, rating, distance, favorite) · title + description + "contents may vary" notice · pickup card (date, start–end, address, mini map, "Directions") · price card (price, reference value, savings, quantity left) · allergens & dietary info · store info · terms.

**Sticky CTA:** `Rescue this offer · 35 MAD` with the window under it (`Today 18:00–19:00`).

**Decision: two-step purchase with an explicit review sheet.**
1. *Problem:* accidental or misunderstood purchases (wrong day, wrong quantity).
2. *Solution:* the CTA opens a review sheet: quantity stepper (bounded by stock and max-per-order), **server-calculated** total, pickup window, address, cancellation policy, then **Pay 35 MAD**.
3. *Why:* one extra deliberate tap removes almost all costly mistakes; the price shown comes from the server, not the device.
4. *Edge cases:* sold out while the sheet is open → the sheet turns into "This rescue has already been claimed" with alternatives; price changed → the new total is shown and must be confirmed again; pickup window already ended → CTA disabled with the reason.
5. *A11y:* the stepper has increment/decrement actions and announces the value; the Pay button is disabled (with an announced reason) until the total is loaded.

### 3.5 Checkout and payment states

| Server/order state | What the user sees |
|---|---|
| Creating reservation | Button spinner, button disabled (double-tap safe) |
| Hold created, awaiting payment | Payment UI; small "Held for you for 10 min" note (real timer, from server time) |
| Returned from payment, status unknown | **"Checking payment…"** — polls the backend; never assumes success |
| `CONFIRMED` | Success screen + pickup pass + "Add to calendar" |
| `FAILED` | "Payment didn't go through. You weren't charged." + retry (if hold still valid) |
| `EXPIRED` | "Your hold expired." + try again if stock remains |
| Network lost mid-flow | Order id is persisted locally; on reopen the app resumes on the order's real status |

### 3.6 Pickup pass

Large QR code, 6-character code under it, store name, window, address, "Directions". Brightness hint. Works offline (pass cached on device after confirmation). The pass is shown when the window is near, but the code is always valid only server-side.

### 3.7 Merchant scan

Camera opens immediately; result appears full-screen in under a second:

| Result | Visual |
|---|---|
| Valid | Green panel + check icon + "Hand over 1× Assorted pastries" + customer first name initial |
| Already collected | Amber panel + icon + "Already collected at 18:04" |
| Not yet open / window closed | Amber panel + time info + (window closed) "Hand over anyway" requiring confirmation, logged |
| Invalid / other store | Red panel + icon + "Code not recognized for this store" |
| Offline | Grey banner "Offline — validating from today's list"; results queued and synced |

Every result uses icon + text + color, plus haptic feedback.

## 4. Universal screen states

Every screen implements: **loading** (skeletons shaped like content, not spinners for full screens), **success**, **empty**, **error**, **retry**, **offline**.

| Situation | Copy (translation key → English) |
|---|---|
| No nearby offers | `empty.nearby` → "Nothing nearby right now." |
| No favorites | `empty.favorites` → "Save a place you love and we'll let you know when food is available." |
| Sold out | `offer.soldOut` → "This rescue has already been claimed." |
| Offline | `error.offline` → "You're offline. Check your connection and try again." |
| Server error | `error.generic` → "Something went wrong on our side. Try again." |
| Unsupported app version | `error.updateRequired` → "Please update MAWJOOd to continue." |

## 5. Screen quality checklist (applied to every screen before build)

Primary action? · What does the user need first? · What can be removed? · Missing data? · Network failure? · No results? · Sold out? · Returning later (stale data)? · Small screen (320 pt wide)? · Largest accessibility text size? · RTL and longer French strings?

## 6. Ranking (deterministic, no ML)

Home "Available near you" score is a weighted sum, computed in SQL: distance (closer is better) · availability (in stock) · pickup compatibility (window not ended, starts soon) · favorite bonus · dietary preference match. Weights live in configuration behind a `RankingStrategy` interface so they can evolve or be A/B tested via feature flags.

## 7. Notifications UX

- Ask for push permission **after** the first favorite or first order ("Get a heads-up when Boulangerie Atlas has food?"), never on first launch.
- Defaults: transactional notifications on; favorite-availability on with max 2 per day; quiet hours 22:00–08:00 local time.
- Every notification deep-links to a valid screen; if the offer is gone, the screen says so and suggests alternatives.

## 8. Accessibility requirements (all screens)

- Contrast meets WCAG 2.2 AA (tokens pre-validated in UI_DESIGN_SYSTEM.md).
- Touch targets ≥ 48 × 48 dp.
- Every interactive element has an accessibility label, role and state; images have descriptions or are marked decorative.
- Body text scales with system font size; layouts reflow (cards stack vertically at large sizes).
- Reduced-motion setting disables non-essential animation.
- Status is never conveyed by color alone (icon + text + color).
- Focus order is logical; modals and bottom sheets trap focus and return it on close.
- RTL: layouts use logical start/end; directional icons mirror; numbers and times keep correct direction.

## 9. Localization

- Strings via i18next keys, organized by feature (`home.*`, `offer.*`, `checkout.*`).
- Dates/times/currency via `Intl` with the user's locale; times shown in the **store's** timezone.
- Arabic requires a restart to switch layout direction on React Native; the language screen explains this.

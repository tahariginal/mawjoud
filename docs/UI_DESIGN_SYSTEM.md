# UI Design System — MAWJOOd

Visual direction: **natural, premium, fresh, friendly, sustainable.** Deep green, soft mint, warm paper, white, natural food photography.

> Status: proposed. The brief refers to "provided MAWJOOd references" that are not in the repository (open decision D6). Tokens below follow the written direction and will be reconciled with the references when received. Token *names* are stable; values may change.

## 1. Token architecture

Three layers, implemented as a typed TypeScript theme in `apps/mobile/src/design/`:

1. **Primitives** — raw palette (`green800`, `paper50`). Never used directly in components.
2. **Semantic tokens** — meaning (`color.text.primary`, `color.action.primary.bg`). Components use only these.
3. **Component tokens** — only where a component needs a specific override.

A dark theme can be added later by re-mapping semantic tokens; components do not change.

## 2. Color

### 2.1 Primitives

| Token | Hex | Use |
|---|---|---|
| `green900` | `#0E3B2C` | Deepest brand surface |
| `green800` | `#14523C` | **Primary brand**, primary buttons |
| `green700` | `#1C6B4E` | Pressed/links, text on light |
| `green600` | `#25805E` | Large text / icons on white only |
| `mint300` | `#9FD3B6` | Accent on dark green |
| `mint100` | `#E4F2EA` | Soft surfaces, selected chips |
| `paper50` | `#FBF8F2` | App background |
| `paper100` | `#F4EEE3` | Secondary surfaces |
| `white` | `#FFFFFF` | Cards, sheets |
| `ink900` | `#17201B` | Primary text |
| `ink700` | `#3E4A43` | Strong secondary text |
| `ink600` | `#56625B` | Secondary text |
| `ink500` | `#6B776F` | Icons, disabled text (not body text) |
| `borderStrong` | `#7D877F` | Input borders (meets 3:1) |
| `borderSubtle` | `#E6DFD2` | Dividers (decorative) |
| `terracotta700` | `#A4471F` | Warm accent (e.g. "few left" label) |
| `red700` / `red50` | `#B3261E` / `#FCEBEA` | Error |
| `amber800` / `amber50` | `#7A4F00` / `#FFF3D6` | Warning |
| `blue700` / `blue50` | `#1D5FA6` / `#E6F0FA` | Info |

### 2.2 Verified contrast (WCAG 2.2: text ≥ 4.5:1, large text & UI parts ≥ 3:1)

Computed with the WCAG relative-luminance formula.

| Foreground on background | Ratio | Allowed for |
|---|---|---|
| `ink900` on `paper50` / `white` | 15.74 / 16.68 | All text |
| `ink700` on `paper100` | 8.03 | All text |
| `ink600` on `paper100` / `mint100` | 5.52 / 5.52 | Secondary text |
| `ink500` on `paper100` | 4.05 | Icons and UI parts only — **not** body text |
| `green800` on `paper50` / `mint100` | 8.61 / 7.90 | Text, links, savings label |
| `green700` on `paper100` | 5.57 | Text, links |
| `green600` on `paper100` | 4.20 | Large text / icons only |
| `white` on `green800` | 9.12 | Primary button label |
| `mint300` on `green900` | 7.42 | Accent text on dark |
| `terracotta700` on `paper100` | 5.20 | Text |
| `red700` on `red50` | 5.67 | Error text in banners |
| `amber800` on `amber50` | 6.46 | Warning text |
| `blue700` on `blue50` | 5.62 | Info text |
| `borderStrong` on `paper100` | 3.22 | Input borders |

### 2.3 Semantic tokens (light theme)

| Semantic | Primitive |
|---|---|
| `bg.app` | `paper50` |
| `bg.surface` | `white` |
| `bg.surfaceMuted` | `paper100` |
| `bg.brand` | `green800` |
| `bg.brandSoft` | `mint100` |
| `text.primary` / `text.secondary` / `text.onBrand` | `ink900` / `ink600` / `white` |
| `text.brand` | `green800` |
| `action.primary.bg` / `.bgPressed` / `.fg` | `green800` / `green900` / `white` |
| `action.secondary.bg` / `.fg` / `.border` | `white` / `green800` / `green800` |
| `border.input` / `border.divider` | `borderStrong` / `borderSubtle` |
| `status.success.*` | `green800` on `mint100` |
| `status.error.*` / `status.warning.*` / `status.info.*` | red / amber / blue pairs above |
| `focus.ring` | `green700`, 2 dp, 2 dp offset |

## 3. Typography

Latin and Arabic must both look first-class. All fonts below are licensed under the SIL Open Font License and are loaded with `expo-font`.

| Role | Latin | Arabic |
|---|---|---|
| Display (sparingly: hero, impact numbers) | Fraunces (soft serif) | IBM Plex Sans Arabic SemiBold |
| UI & body | Inter | IBM Plex Sans Arabic |

Type scale (size / line height in pt; scales with the system text size):

| Token | Size/LH | Weight | Use |
|---|---|---|---|
| `display` | 32/38 | 600 | Hero, impact totals |
| `title1` | 24/30 | 700 | Screen titles |
| `title2` | 20/26 | 600 | Section titles |
| `headline` | 17/22 | 600 | Card titles, prices |
| `body` | 16/22 | 400 | Body text |
| `callout` | 15/20 | 500 | Buttons |
| `subhead` | 14/19 | 400 | Meta lines (distance · time) |
| `footnote` | 13/18 | 400 | Notes, legal |
| `caption` | 12/16 | 500 | Badges; minimum size |

Rules: never below 12 pt; numbers use tabular figures in prices and times; Arabic line height +10%.

## 4. Spacing, layout, radius, elevation

- **Spacing scale (4-pt grid):** `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Screen gutter 16; section gap 24; card padding 12–16.
- **Radius:** `sm 8` (inputs, chips) · `md 12` (cards) · `lg 16` (sheets, large cards) · `xl 24` (hero) · `pill 999`.
- **Elevation:** `0` flat (default) · `1` cards on paper (subtle shadow, y 1, blur 3, 8% ink) · `2` sticky CTA bar and bottom sheets · `3` modals. Prefer borders and surface contrast over shadows.
- **Touch targets:** ≥ 48 × 48 dp, even if the visual element is smaller (`hitSlop`).

## 5. Iconography and imagery

- One outline icon set with consistent 1.5–2 px stroke (selected in Phase 2 by licence check; candidates: Lucide, Phosphor). Filled variant marks the selected state.
- Food photography: natural light, real products; no stock images that misrepresent what an offer contains.
- Image sizes from the API: `thumb` (≈320 w), `medium` (≈720 w), `large` (≈1440 w), WebP/AVIF where supported; blurhash placeholders; fallback illustration on failure.

## 6. Components (built once, reused everywhere)

| Component | Variants / states | Notes |
|---|---|---|
| `Button` | primary, secondary, tertiary, destructive · default, pressed, disabled, loading | Loading keeps width; disables re-press |
| `IconButton` | default, selected | Always has an accessibility label |
| `TextField` | default, focused, error, disabled · with helper/error text | Error text + icon, not only red border |
| `Stepper` | min/max bounded | Quantity |
| `Chip` | filter (toggle), input (removable), category | Selected = fill + check icon |
| `OfferCard` | horizontal (home rails), vertical (lists), compact (map preview) · sold out, paused, ended | Content priority from UX spec |
| `StoreRow` | with/without favorite | |
| `PriceTag` | price only, price + reference value | Screen-reader string built explicitly |
| `PickupWindow` | today / tomorrow / date · upcoming, open now, ended | Shows store timezone |
| `Badge` | stock ("3 left"), status, new | Text always present |
| `BottomSheet` | filters, review purchase, map preview | Focus trap, drag handle with label |
| `Modal` / `ConfirmDialog` | standard, destructive | |
| `Toast` | success, error, info | Never for critical info (use inline states) |
| `Banner` | offline, update required, active order | |
| `Skeleton` | card, list row, detail | Matches final layout |
| `EmptyState` | illustration + title + body + action | |
| `ErrorState` | with retry | |
| `TabBar` | customer, merchant | Icon + label |
| `MapMarker` / `ClusterMarker` | available, sold out, selected | Shape differs per state |
| `QRPass` | | High contrast, quiet zone respected |
| `ScanResultPanel` | valid, already collected, warning, invalid, offline | Icon + text + color + haptic |

## 7. Motion

Short and functional only: 150–250 ms ease-out for sheets and state changes; no looping animations; everything respects **Reduce Motion**.

## 8. Voice and tone

Warm, direct, honest. Short sentences. No guilt, no pressure, no fake urgency. Use "rescue" as the brand verb ("Rescue this offer"). All copy lives in translation files.

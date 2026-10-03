# UI Design System — Mazal

Visual direction: **clean and minimal.** White surfaces, near-black text, **Majorelle blue** for the brand and every primary action, one accent green, generous spacing and hairlines instead of boxes and shadows. Food photography carries the color. Logo and brand assets: `brand/` (open `brand/index.html`).

> Status: proposed, revised 2026-10-03 (minimal redesign, then Majorelle blue as the brand color with the Mazal logo). The brief refers to "provided Mazal references" that are not in the repository (open decision D6), and the client's Claude Design design-system projects are still empty. Tokens below are the source of truth until references arrive; token *names* are stable, values may change.

## 1. Token architecture

Three layers, implemented as a typed TypeScript theme in `apps/mobile/src/design/` (`tokens.ts`, `navigation.ts`):

1. **Primitives** — raw palette (`gray50`, `green700`). Never used directly in components.
2. **Semantic tokens** — meaning (`colors.textPrimary`, `colors.actionPrimaryBg`). Components and screens use only these; no hex values outside `tokens.ts`.
3. **Component tokens** — only where a component needs a specific override.

A dark theme can be added later by re-mapping semantic tokens; components do not change.

## 2. Color

### 2.1 Primitives

| Token | Hex | Use |
|---|---|---|
| `white` | `#FFFFFF` | App background, surfaces |
| `gray50` | `#F5F5F4` | Muted fills: secondary buttons, chips, text fields, image placeholders |
| `gray75` | `#F0F0EF` | Skeletons |
| `gray100` | `#EDEDEC` | Hairline dividers (decorative) |
| `gray150` | `#EBEBEA` | Pressed muted fill |
| `gray300` | `#D6D6D3` | Decorative borders (QR card) |
| `gray500` | `#8A8A8A` | Tertiary: icons, switch off track — **never** text |
| `gray600` | `#6B6B6B` | Secondary text |
| `black` | `#111111` | Primary text and icons |
| `majorelle600` | `#6050DC` | **Brand**: primary buttons, selected chips and segments, links, active tab, pickup banner, focus, logo |
| `majorelle700` | `#4A3BC2` | Pressed primary button |
| `green700` / `green50` | `#0B7A4B` / `#E8F5EE` | The one accent (see rules below) |
| `red700` / `red50` | `#B42318` / `#FEF0EE` | Error |
| `amber800` / `amber50` | `#8A5300` / `#FFF6E0` | Warning |
| `blue700` / `blue50` | `#1F5FA8` / `#EEF4FB` | Info |

**Brand rule:** Majorelle replaces black on everything interactive or selected; text, icons and the QR code stay ink black for readability and scanning.

**Accent rule:** green is used only for savings ("You save", "-50%", money saved), "Open now", success states and the brand wordmark (none in the UI yet: the name is open decision D5). Prices are primary text, not green. Favorites use a black heart. There is no second accent color.

### 2.2 Verified contrast (WCAG 2.2: text ≥ 4.5:1, large text & UI parts ≥ 3:1)

Computed with the WCAG relative-luminance formula.

| Foreground on background | Ratio | Allowed for |
|---|---|---|
| `black` on `white` / `gray50` | 18.88 / 17.31 | All text |
| `gray600` on `white` / `gray50` / `gray75` | 5.33 / 4.89 / 4.67 | Secondary text, placeholders |
| `gray500` on `white` / `gray50` | 3.45 / 3.16 | Icons, switch off track, UI parts only — **not** text |
| `white` on `majorelle600` / `majorelle700` | 5.71 / 7.79 | Primary button label, selected chips, pickup banner |
| `majorelle600` on `white` / `gray50` | 5.71 / 5.23 | Links, tertiary buttons, active tab, header tint |
| `green700` on `white` / `gray50` / `green50` | 5.39 / 4.94 / 4.80 | Savings, open now, success text, discount pill |
| `red700` on `white` / `red50` | 6.57 / 5.92 | Error text, destructive buttons |
| `amber800` on `white` / `amber50` | 6.33 / 5.88 | Warning text |
| `blue700` on `white` / `blue50` | 6.44 / 5.82 | Info text |
| `majorelle600` (focus border) on `gray50` | 5.23 | Focused text field |

Filled controls (text fields, chips, secondary buttons) have no border at rest: the `gray50` fill is only 1.09:1 against white, so these controls are always identified by a visible label, their text or an icon (WCAG 1.4.11 does not require a boundary in that case). Focus and error states add a 1.5 dp border that meets 3:1. Selected chips and segments switch to Majorelle (5.2:1 against the muted fill, with white labels), never hue alone.

### 2.3 Semantic tokens (light theme)

| Semantic | Primitive |
|---|---|
| `bgApp` / `bgSurface` | `white` |
| `bgSurfaceMuted` | `gray50` |
| `brand` | `majorelle600` |
| `bgInverse` / `textOnInverse` | `majorelle600` / `white` |
| `textPrimary` / `textSecondary` / `textTertiary` | `black` / `gray600` / `gray500` (non-text only) |
| `accent` / `accentSoft` | `green700` / `green50` |
| `icon` / `iconMuted` | `black` / `gray500` |
| `actionPrimaryBg` / `…BgPressed` / `…Fg` | `majorelle600` / `majorelle700` / `white` |
| `actionSecondaryBg` / `…BgPressed` / `…Fg` | `gray50` / `gray150` / `black` |
| `actionDisabledBg` / `…Fg` | `gray50` / `gray600` |
| `controlOff` | `gray500` (switch off track, 3.45:1) |
| `borderInput` / `borderDivider` | `gray300` / `gray100` (both decorative) |
| `focusRing` | `majorelle600`, 1.5 dp border on text fields |
| `skeleton` | `gray75` |
| `successFg` / `successBg` | `green700` / `green50` |
| `errorFg/Bg`, `warningFg/Bg`, `infoFg/Bg` | red / amber / blue pairs above |

Navigation: header tint (back arrow) and active tab in `brand`, inactive tab in `textSecondary`; the tab bar is plain white with no top border or shadow.

## 3. Typography

Latin and Arabic must both look first-class. All fonts below are licensed under the SIL Open Font License and are loaded with `expo-font`. **One family**: Inter for every Latin role (Fraunces was removed in the minimal redesign).

| Role | Latin | Arabic |
|---|---|---|
| Display and titles | Inter Bold / SemiBold | IBM Plex Sans Arabic Bold / SemiBold |
| UI & body | Inter | IBM Plex Sans Arabic |

Type scale (size / line height in pt; scales with the system text size):

| Token | Size/LH | Weight | Letter spacing | Use |
|---|---|---|---|---|
| `display` | 34/40 | 700 | -0.6 | Impact totals |
| `title1` | 28/34 | 700 | -0.4 | Screen and offer titles |
| `title2` | 22/28 | 600 | -0.2 | Section titles, footer price |
| `headline` | 17/22 | 600 | 0 | Offer titles in cards, prices |
| `body` | 16/22 | 400 | 0 | Body text; button labels (600) |
| `callout` | 15/20 | 500 | 0 | Emphasized short text |
| `subhead` | 14/19 | 400 | 0 | Meta lines (distance · time) |
| `footnote` | 13/18 | 400 | 0 | Notes, legal |
| `caption` | 12/16 | 500 | 0 | Badges; minimum size |

The pickup code on the QR pass uses Inter Bold 32 with 8 pt letter spacing. Rules: never below 12 pt; Arabic line height +10%.

## 4. Spacing, layout, radius, elevation

- **Spacing scale (4-pt grid):** `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Screen gutter 16; sections are separated by space (24–32) and hairline dividers, **not** boxes.
- **Radius:** `xs 6` (badges) · `sm 8` · `md 12` (buttons, text fields, banners, thumbnails) · `lg 16` (images, cards over maps) · `xl 24` (QR pass) · `pill 999` (chips, segmented control).
- **Elevation:** cards are flat (`elevation.card` is empty). `elevation.raised` is reserved for floating elements: the sticky footer, the map "Search this area" pill and preview card, and round buttons over images.
- **Control height:** buttons and text fields 52 dp; chips 36 dp visually.
- **Touch targets:** ≥ 48 × 48 dp, even if the visual element is smaller (`hitSlop`).

## 5. Iconography and imagery

- Ionicons (MIT, via `@expo/vector-icons`): outline by default, filled variant marks the selected state. Icon names are type-checked.
- Food photography: natural light, real products; no stock images that misrepresent what an offer contains.
- Image sizes from the API: `thumb` (≈320 w), `medium` (≈720 w), `large` (≈1440 w), WebP/AVIF where supported; blurhash placeholders.
- **Placeholder** (no photo, or the photo failed): `bgSurfaceMuted` with the category icon in `textTertiary` — café `cafe-outline`, pastry `ice-cream-outline`, grocery `nutrition-outline`, bakery and others `restaurant-outline` — plus the store's initials. Categories come from the query cache (loaded once at startup), so placeholders never trigger requests. Order rows have no category and show the initials only.

## 6. Components (built once, reused everywhere)

| Component | Variants / states | Notes |
|---|---|---|
| `Button` | primary (Majorelle), secondary (muted fill), tertiary (Majorelle text), destructive (error text) · pressed, disabled, loading | 52 dp, radius 12, no outlines; full width by default inside screen footers |
| `IconButton` | default, selected, `background` (round white, raised, for use over images) | Always has an accessibility label |
| `TextField` | rest, focused, error, disabled · helper/error text | 52 dp muted fill; 1.5 dp border on focus (Majorelle) or error (red); error text + icon |
| `Stepper` | min/max bounded | Muted pill, no outline |
| `Chip` | filter (toggle), input (removable), category | Muted fill, no border; selected = Majorelle with white label |
| `SegmentedControl` | — | Muted track, Majorelle selected segment |
| `Card` | static, pressable | Flat section: no fill, border or shadow; pressable dims |
| `Sections` | — | Flat sections separated by hairlines (replaces stacked cards) |
| `Group` + `ListRow` / `SwitchRow` | — | Settings-style rows with hairline dividers, aligned with the screen gutter |
| `SectionHeader` | with/without action | `title2`; action in Majorelle with a chevron |
| `OfferCard` | rail (280 wide, image 160), list (image 180) · sold out, ended | Photo first, no box: store, one-line title, "distance · pickup" meta, price row; stock badge on the image |
| `OfferImage` | photo, placeholder | See §5 |
| `Thumbnail` | image, category icon, initials | 56 dp rounded square for list rows |
| `StoreRow` / `OrderRow` | — | Thumbnail, text lines, chevron; no card; lists add hairlines |
| `PriceTag` | price, + usual value, + discount pill | Price in primary text; "usually …" stays as text; green "-50%" pill; screen-reader string built explicitly |
| `PickupWindowText` | today / tomorrow / date · open now (accent), ended | Shows store timezone |
| `Badge` | neutral, success, warning, error, info, accent, brand, onImage | Caption, radius 6; `onImage` = white for badges over photos; text always present |
| `Banner` | info, warning, error, success, neutral, inverse | Flat soft block, radius 12; `inverse` (Majorelle, white pill action) for today's pickup |
| `Skeleton` | card, list row, detail | Static (no shimmer); matches final layout |
| `EmptyState` / `ErrorState` | with action / retry | |
| `TabBar` | customer, merchant | Icon + label; plain white |
| `MapMarker` | available, sold out | |
| `QRPass` | — | High contrast, quiet zone respected; white card with a hairline border |
| `ScanResultPanel` | valid, already collected, too early, closed, cancelled, invalid | Icon + text + color |

## 7. Motion

Short and functional only: 150–250 ms ease-out for sheets and state changes; no looping animations; everything respects **Reduce Motion**.

## 8. Voice and tone

Warm, direct, honest. Short sentences. No guilt, no pressure, no fake urgency. "Rescue" is the brand verb in copy; the primary action on an offer is the plain "Reserve". All copy lives in translation files.

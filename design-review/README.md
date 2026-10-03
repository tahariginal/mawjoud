# Mazal — design review

Screenshots of every screen after the minimal redesign and the Majorelle brand color (commits `7f54435`…`f1641f0`), 2026-10-03. Logo and brand: `../brand/index.html`.

**How they were made:** the real app code, in demo mode, rendered in a browser build at iPhone size (390 × 844 pt) by headless Chrome; images are saved at 2× (780 px wide). Nothing is mocked up by hand.

**Differences from a phone (browser preview only):**

- The map is a native component: the Explore map shows a grey placeholder here.
- Switches use the browser's colors (teal knob); on phones the knob is white.
- The camera cannot open, so Scan shows its permission state.
- No status bar or notch; headers are the web version of the native ones.
- Demo data: 11 fictional Casablanca stores and 13 offers with real food photos from Pexels (free license); times are relative to when the screenshots were taken.

Open `index.html` in a browser to see all screens side by side.

## Customer — signed out

### Home (guest)

<img src="1-customer-guest/01-home.jpg" width="300" alt="Home (guest)">

### Explore — list (scrolled)

<img src="1-customer-guest/02-explore-list-2.jpg" width="300" alt="Explore — list (scrolled)">

### Explore — list

<img src="1-customer-guest/02-explore-list.jpg" width="300" alt="Explore — list">

### Explore — map (native map not rendered on web)

<img src="1-customer-guest/03-explore-map.jpg" width="300" alt="Explore — map (native map not rendered on web)">

### Filters (scrolled)

<img src="1-customer-guest/04-filters-2.jpg" width="300" alt="Filters (scrolled)">

### Filters

<img src="1-customer-guest/04-filters.jpg" width="300" alt="Filters">

### Location

<img src="1-customer-guest/05-location.jpg" width="300" alt="Location">

### Search — before typing

<img src="1-customer-guest/06-search-empty.jpg" width="300" alt="Search — before typing">

### Search — results

<img src="1-customer-guest/07-search-results.jpg" width="300" alt="Search — results">

### Offer details (scrolled)

<img src="1-customer-guest/08-offer-details-2.jpg" width="300" alt="Offer details (scrolled)">

### Offer details

<img src="1-customer-guest/08-offer-details.jpg" width="300" alt="Offer details">

### Store page (scrolled)

<img src="1-customer-guest/09-store-2.jpg" width="300" alt="Store page (scrolled)">

### Store page

<img src="1-customer-guest/09-store.jpg" width="300" alt="Store page">

### Orders (guest prompt)

<img src="1-customer-guest/10-orders-guest.jpg" width="300" alt="Orders (guest prompt)">

### Favorites (guest prompt)

<img src="1-customer-guest/11-favorites-guest.jpg" width="300" alt="Favorites (guest prompt)">

### Profile (guest)

<img src="1-customer-guest/12-profile-guest.jpg" width="300" alt="Profile (guest)">

## Account (sign in, sign up, passwords)

### Sign in

<img src="2-account/01-sign-in.jpg" width="300" alt="Sign in">

### Create account

<img src="2-account/02-sign-up.jpg" width="300" alt="Create account">

### Forgot password

<img src="2-account/03-forgot-password.jpg" width="300" alt="Forgot password">

### Reset password

<img src="2-account/04-reset-password.jpg" width="300" alt="Reset password">

### Verify email

<img src="2-account/05-verify-email.jpg" width="300" alt="Verify email">

## Customer — signed in

### Home (signed in, pickup today) (scrolled)

<img src="3-customer-signed-in/01-home-2.jpg" width="300" alt="Home (signed in, pickup today) (scrolled)">

### Home (signed in, pickup today)

<img src="3-customer-signed-in/01-home.jpg" width="300" alt="Home (signed in, pickup today)">

### Checkout

<img src="3-customer-signed-in/02-checkout.jpg" width="300" alt="Checkout">

### Order — pickup pass (scrolled)

<img src="3-customer-signed-in/03-order-pass-2.jpg" width="300" alt="Order — pickup pass (scrolled)">

### Order — pickup pass

<img src="3-customer-signed-in/03-order-pass.jpg" width="300" alt="Order — pickup pass">

### Orders — upcoming

<img src="3-customer-signed-in/04-orders-upcoming.jpg" width="300" alt="Orders — upcoming">

### Orders — past (empty)

<img src="3-customer-signed-in/05-orders-past.jpg" width="300" alt="Orders — past (empty)">

### Favorites

<img src="3-customer-signed-in/06-favorites.jpg" width="300" alt="Favorites">

### Profile (signed in) (scrolled)

<img src="3-customer-signed-in/07-profile-2.jpg" width="300" alt="Profile (signed in) (scrolled)">

### Profile (signed in)

<img src="3-customer-signed-in/07-profile.jpg" width="300" alt="Profile (signed in)">

### Your impact

<img src="3-customer-signed-in/08-impact.jpg" width="300" alt="Your impact">

### Rate this rescue

<img src="3-customer-signed-in/09-review.jpg" width="300" alt="Rate this rescue">

## Settings and information

### Account details

<img src="4-settings/01-account.jpg" width="300" alt="Account details">

### Notifications (scrolled)

<img src="4-settings/02-notifications-2.jpg" width="300" alt="Notifications (scrolled)">

### Notifications

<img src="4-settings/02-notifications.jpg" width="300" alt="Notifications">

### Language

<img src="4-settings/03-language.jpg" width="300" alt="Language">

### Privacy

<img src="4-settings/04-privacy.jpg" width="300" alt="Privacy">

### Delete account

<img src="4-settings/05-delete-account.jpg" width="300" alt="Delete account">

### Terms of service

<img src="4-settings/06-terms.jpg" width="300" alt="Terms of service">

### Help

<img src="4-settings/07-help.jpg" width="300" alt="Help">

## Merchant mode

### Today

<img src="5-merchant/01-today.jpg" width="300" alt="Today">

### Offers

<img src="5-merchant/02-offers.jpg" width="300" alt="Offers">

### New offer (scrolled)

<img src="5-merchant/03-offer-new-2.jpg" width="300" alt="New offer (scrolled)">

### New offer

<img src="5-merchant/03-offer-new.jpg" width="300" alt="New offer">

### Edit offer (scrolled)

<img src="5-merchant/04-offer-edit-2.jpg" width="300" alt="Edit offer (scrolled)">

### Edit offer

<img src="5-merchant/04-offer-edit.jpg" width="300" alt="Edit offer">

### Scan (camera permission state on web)

<img src="5-merchant/05-scan.jpg" width="300" alt="Scan (camera permission state on web)">

### Insights

<img src="5-merchant/06-insights.jpg" width="300" alt="Insights">

### Business

<img src="5-merchant/07-business.jpg" width="300" alt="Business">

### Staff

<img src="5-merchant/08-staff.jpg" width="300" alt="Staff">

### Apply as a business (scrolled)

<img src="5-merchant/09-apply-2.jpg" width="300" alt="Apply as a business (scrolled)">

### Apply as a business

<img src="5-merchant/09-apply.jpg" width="300" alt="Apply as a business">

## System screens

### Page not found

<img src="6-system/01-not-found.jpg" width="300" alt="Page not found">

### Update required

<img src="6-system/02-update-required.jpg" width="300" alt="Update required">

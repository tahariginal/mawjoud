# ADR-006 — Payment provider abstraction (Stripe unavailable in Morocco)

Status: Proposed — **provider choice pending (D1, D2, D3)** · 2026-10-02

## Context
The brief suggests Stripe "where legally/commercially appropriate". Stripe's global availability page (checked 2026-10-02) does not list Morocco as a supported country for Stripe accounts. If MAWJOOd launches in Morocco with a Moroccan entity, Stripe is not an option. The Moroccan e-payment acquiring market opened to new players in 2025 (previously dominated by CMI); several local acquirers and gateways now exist. Marketplace features (split payments, merchant payouts) vary by provider and must be verified directly with each provider.

## Decision
- Payments are isolated behind a `PaymentProvider` port in the `payments` module:
  `createPayment(order, idempotencyKey)`, `getPaymentStatus(providerPaymentId)`, `refund(payment, amount, idempotencyKey)`, `verifyAndParseWebhook(rawBody, headers)`.
- Provider-specific code lives in one adapter per provider. Domain code only sees MAWJOOd payment states.
- The mobile flow supports both **native SDK sheets** and **hosted payment pages** (opened in an in-app browser session with a return deep link), since many local gateways use hosted pages with 3-D Secure.
- A `DevPaymentProvider` exists for local development only. It is visibly labeled in the UI and the API refuses to boot with it when `APP_ENV=production`.
- Selection criteria for the real provider: legal fit for marketplace flows (D2), webhooks with signatures, idempotent creation or safe lookup, refund API (full + partial), sandbox, local + international cards, settlement and payout reporting, fees.
- Cash-at-pickup (D3), if approved, is a separate payment method behind a feature flag with its own no-show rules.

## Alternatives
- **Hard-wire Stripe** — not viable for a Moroccan entity.
- **Foreign entity with Stripe** — possible only if the client's legal structure allows it; merchant payouts in Morocco would still need verification.

## Consequences
- ✅ Phases 2–4 proceed without waiting for the provider decision.
- ⚠️ Phase 5 cannot complete until D1/D2 are decided and sandbox credentials exist.

# Risk Register — MAWJOOd

Scale: Likelihood / Impact = Low · Medium · High.

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | **No payment provider fit for Morocco** — Stripe does not support Moroccan accounts; local PSP marketplace / payout features unknown | High | High | Provider-agnostic `PaymentProvider` port (ADR-006); evaluate local PSPs early; decide D1/D2 before Phase 5 | Client + tech lead |
| R2 | Regulatory: collecting money for merchants may require a licensed payment institution or a PSP that does the split | Medium | High | Legal review of the money flow (D2); prefer a PSP that holds funds and pays out merchants | Client + counsel |
| R3 | Data protection (Law 09-08 / CNDP), especially hosting abroad | Medium | High | Counsel review before staging with real data; region-agnostic infra (D4) | Client + counsel |
| R4 | Overselling / double orders / double pickups | Low (by design) | High | Atomic conditional updates, unique constraints, idempotency, CS-1…CS-20 tests | Tech lead |
| R5 | Low merchant adoption (empty map) | High | High | Launch in one dense area; merchant onboarding in < 10 min; staff-friendly scan flow | Client |
| R6 | No-shows and late pickups hurt merchants (higher without online payment, ADR-015) | High | Medium | Reminders, clear policy (D7), no-show tracking, `NO_SHOW` state | Client + product |
| R7 | Pay at pickup chosen for MVP (ADR-015) | — | — | Verified email, 3 active reservations max, no-show tracking | Client |
| R8 | App Store / Play review rejection (account deletion, login options, privacy labels, reference prices) | Medium | Medium | Built-in compliance (in-app deletion, Apple sign-in with Google, accurate labels) | Tech lead |
| R9 | Push notifications unreliable on some Android OEMs (battery optimizations) | Medium | Low | In-app notification center; email for transactional; reminders not critical for correctness | Tech lead |
| R10 | Brand name / bundle id change after release | Medium | High | Confirm D5 before first store build | Client |
| R11 | Misleading savings or impact claims (consumer protection) | Medium | Medium | Merchant attestation + moderation for reference values; sourced, versioned impact factors (D8); "estimated" labels | Client + product |
| R12 | Very new framework majors (NestJS 12 released 2026-08-27; BullMQ 6 released 2026-07-30; Expo SDK 57 released 2026-06-30) | Medium | Medium | Verify compatibility in Phase 2 spike; pin exact versions; fall back to previous major if a blocker appears | Tech lead |
| R13 | Local Android tooling missing on dev machine | High | Low | EAS cloud builds or physical device; install Android SDK when E2E needed | Tech lead |
| R14 | Merchant device offline at the counter | Medium | Medium | Offline pickup manifest + sync with conflict flags (ADR-012) | Tech lead |
| R15 | Scope creep vs. phased delivery | Medium | High | Phase gates with exit criteria; change requests logged | Client + tech lead |
| R16 | Missing visual references delays design sign-off | Medium | Low | Tokens are swappable; request references (D6) | Client |
| R17 | Third-party outage (maps, push, email, PSP) during peak | Medium | Medium | Timeouts, circuit breakers, fallbacks, outbox (ERROR_HANDLING.md) | Tech lead |
| R18 | Secrets leak (repo, logs, app bundle) | Low | High | Secret scanning in CI (to add with the API phase), redaction, secret manager, mobile holds only public keys | Tech lead |
| R19 | Known high advisory GHSA-86w9-cpqp-85rv in `node-forge`, pulled in by Expo's CLI (build tooling, not shipped in the app); no patched version on 2026-10-02 | Low | Medium | CI fails on critical; re-check on each Expo update and tighten to high once patched | Tech lead |
| R20 | Mobile UI built ahead of the backend against an isolated demo adapter; demo behaviour could drift from the real API | Medium | Medium | Shared Zod contracts; HTTP client validates every response against them; demo adapter refused in production builds; replace demo with API integration tests in Phases 2–6 | Tech lead |

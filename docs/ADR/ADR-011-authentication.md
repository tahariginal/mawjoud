# ADR-011 — Self-hosted authentication with rotating refresh tokens

Status: Proposed · 2026-10-02

## Context
Requirements: email/password, Google, Apple, email verification, password reset, refresh, logout, account deletion, admin MFA, business-scoped roles, and data residency flexibility (Law 09-08).

## Decision
Authentication implemented in the `auth` module:
- argon2id password hashing.
- Short-lived ES256 JWT access tokens (15 min, `kid` for key rotation), held in memory on the device.
- Opaque refresh tokens (hashed at rest), rotated on every refresh, with **family reuse detection** (reuse → revoke the family).
- Google and Apple ID tokens verified server-side; Apple offered whenever Google is (App Store guideline 4.8).
- 6-digit email codes for verification and reset (no app-switching through email links).
- TOTP MFA for admin roles.

## Alternatives
- **Managed identity (Auth0, Clerk, Firebase Auth, Supabase Auth, Cognito)** — less code and built-in features, but per-user cost at scale, vendor lock-in, data stored with a third party (adds to the cross-border transfer analysis), and business-scoped RBAC still lives in our DB.
- **Long-lived access tokens only** — simpler, but no revocation and higher theft impact.

## Consequences
- ✅ Full control over data location, flows and RBAC; no per-user fees.
- ⚠️ Security-critical code we own: covered by dedicated tests (incl. CS-17), rate limits and the security review gate.
- Revisit if requirements grow (SSO for enterprise merchants, passkeys) — passkeys are a natural later addition.

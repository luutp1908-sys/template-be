# Backend Security Hardening Tracker

Date: 2026-08-17

## Executive Summary

The backend has a solid starting foundation for a production-ready API, including environment validation, JWT-based auth, bcrypt password hashing, global request validation, and throttling. However, it is not yet fully aligned with backend security best practices for production use.

Current assessment: Partial compliance / needs hardening before broad production rollout.

## Good Security Practices Already Present

- Environment validation with Joi in [src/config/env.validation.ts](src/config/env.validation.ts)
- JWT auth and refresh flow in [src/auth/auth.service.ts](src/auth/auth.service.ts) and [src/auth/jwt.strategy.ts](src/auth/jwt.strategy.ts)
- Password hashing with bcrypt
- Global validation via `ValidationPipe` in [src/main.ts](src/main.ts)
- Global throttling via `ThrottlerModule` and `APP_GUARD` in [src/app.module.ts](src/app.module.ts)
- Refresh token stored as `HttpOnly` cookie in [src/auth/auth.controller.ts](src/auth/auth.controller.ts)
- PII redaction for authorization headers in [src/app.module.ts](src/app.module.ts)

## Main Security Gaps

1. Config drift between [src/config/configuration.ts](src/config/configuration.ts) and [src/config/env.validation.ts](src/config/env.validation.ts)
   - JWT defaults differ and can create inconsistent security behavior.

2. CORS too permissive in non-production
   - [src/main.ts](src/main.ts) allows all origins when not in production and reads some config directly from the environment.

3. Missing explicit HTTP hardening middleware
   - No Helmet usage or explicit security headers.

4. Silent error handling around cookie writes and auth failures
   - Several `catch {}` blocks swallow failures in [src/auth/auth.controller.ts](src/auth/auth.controller.ts), reducing operational visibility.

5. Placeholder or weak production defaults remain in [ .env.example ](.env.example)
   - Useful for local development but not a strong production baseline.

6. CSRF and refresh-token hardening needs explicit review
   - Cookie-based refresh tokens are a good pattern, but their browser security model must be treated carefully for cross-site risks.

7. Security regression coverage is thin
   - Important auth scenarios should be added to automated tests.

## Security Improvement Tracker

| Priority | Area | Item | Status | Owner | Due | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Config | Unify JWT and security defaults across config files | Not started | Backend | TBD | Remove drift between runtime config and validation schema |
| P0 | App bootstrap | Add Helmet and set secure HTTP headers | Not started | Backend | TBD | Improve response security posture |
| P0 | CORS | Restrict CORS to approved origins in production and staging | Not started | Backend | TBD | Avoid permissive origin rules |
| P0 | Env hygiene | Replace placeholder secrets and weak defaults in [.env.example](.env.example) | Not started | Backend | TBD | Add production guidance |
| P0 | Cookie auth | Harden `refreshToken` cookie settings and logging | In progress | Backend | TBD | Enforce `secure`, `httpOnly`, and policy review |
| P1 | Auth flow | Review JWT claims and refresh rotation logic in [src/auth/auth.service.ts](src/auth/auth.service.ts) | Not started | Backend | TBD | Ensure least privilege and revoke/reuse checks |
| P1 | Auth middleware | Review bearer-header validation and fail-closed behavior | Not started | Backend | TBD | Validate malformed token handling |
| P1 | CSRF review | Determine if cookie refresh flow needs anti-CSRF mitigation | Not started | Backend + Frontend | TBD | Depends on cross-origin deployment model |
| P1 | Rate limiting | Confirm auth endpoints are appropriately throttled and blocked | In progress | Backend | TBD | `login`, `register`, `refresh`, and `logout` should be reviewed |
| P2 | Logging | Replace silent catches with structured logs and alerts | Not started | Backend | TBD | Improve observability of auth failure paths |
| P2 | Typing | Reduce `any`-heavy auth repository usage and improve interfaces | Not started | Backend | TBD | Lower chance of runtime misuse |
| P2 | Tests | Add e2e and regression tests for auth failures and protected access | Not started | Backend | TBD | Cover login, refresh, invalid tokens, and access checks |

## Proposed Phased Execution Plan

### Phase 1 — Immediate hardening (P0)
- Unify config defaults
- Tighten app bootstrap security headers and CORS
- Harden refresh cookie policy
- Remove insecure fallback guidance in env examples

### Phase 2 — Auth hardening (P1)
- Review JWT issuance and validation rules
- Confirm refresh token rotation and reuse handling
- Check middleware and guard fail-closed behavior
- Review CSRF risk for browser-based cookie auth flows

### Phase 3 — Verification and assurance (P2)
- Add structured logging and telemetry
- Add regression tests for security-sensitive flows
- Validate endpoint behavior under invalid credentials, invalid tokens, expired tokens, and blocked requests

## Priority Notes

The highest-value items are the ones that reduce attack surface quickly and improve production safety without broad refactors:

1. Remove config drift
2. Tighten CORS and security headers
3. Harden cookie settings and logging
4. Review refresh-token / CSRF risk
5. Add regression tests for auth edge cases

## Suggested Next Step

Implement the P0 items first, then validate the auth flow with a focused e2e test set before approving the backend for broader production-facing use.

# Backend Improvements Audit (2026-08-05)

This note captures the prioritized improvement list identified during the backend review.

## Findings (ordered by impact)

1. High: Token lifetime defaults are inconsistent and can silently become too long.
- src/config/env.validation.ts defaults access/refresh to 15m and 7d.
- src/config/configuration.ts defaults access/refresh to 15d and 30d.
- Why this matters: auth behavior depends on which config path is used, and you can unintentionally issue long-lived tokens.

2. High: App can start successfully even when DB is unreachable. (Fixed 2026-08-05)
- Implemented: src/database/prisma.service.ts now uses configurable startup behavior via DATABASE_STARTUP_MODE and supports fail-fast mode.
- Default behavior: production defaults to fail-fast, non-production defaults to warn.

3. High: Missing auth rate limiting and brute-force protection.
- No throttling/rate-limit usage detected in backend source.
- Risk is concentrated on login/refresh endpoints in src/auth/auth.controller.ts.
- Why this matters: credential stuffing and token abuse become easier.

4. Medium: Runtime dependency switching uses process env and dynamic require instead of DI/config.
- src/auth/auth.module.ts, src/template-content/template-content.module.ts, and queue toggle in src/app.module.ts.
- Why this matters: brittle testability, weaker type safety, and behavior depending on module-load timing rather than validated config.

5. Medium: Heavy any usage and disabled unsafe lint rules reduce strict TypeScript guarantees.
- Example injections: src/auth/auth.service.ts, src/auth/jwt.strategy.ts, src/template-content/template-content.service.ts.
- Lint disables: .eslintrc.js.
- Why this matters: runtime bugs are easier to introduce despite strict tsconfig.

6. Medium: Error swallowing in auth/content flows hides operational issues.
- Empty catches in src/auth/auth.controller.ts and src/template-content/template-content.service.ts.
- Why this matters: failures (cookie write, repository behavior) disappear from logs and observability.

7. Medium: CORS origin config is partially outside validated config and too permissive in non-production.
- src/main.ts reads process env directly for frontend origin.
- src/main.ts allows all origins when not production.
- Why this matters: staging-like environments can end up broadly exposed; config source of truth is split.

8. Medium: Test coverage is thin at integration/e2e level.
- Only one e2e test exists: test/app.e2e-spec.ts.
- Unit tests exist for some services, but critical flows (auth cookies, refresh rotation, guards+middleware interaction, DB repository contracts) are under-covered.

9. Low: Dev defaults in env example are insecure for non-local usage.
- .env.example includes placeholder JWT secrets and predictable DB credentials.
- Why this matters: fine for local use, but easy to misuse in shared/dev deployments without strong warnings.

## Quick Wins

1. Unify token expiry defaults in one place and remove duplicated fallbacks.
2. Decide fail-fast vs degrade mode for DB startup, then enforce by environment.
3. Add throttling for login and refresh endpoints.
4. Replace any-based repository injections with typed interfaces/tokens.
5. Replace empty catch blocks with structured logging and explicit fallback behavior.
6. Add 3-5 e2e tests for auth and protected resource access patterns.

## Suggested Next Step

Create a phased execution plan (P0/P1/P2) with owners, acceptance criteria, and target dates for each quick win.

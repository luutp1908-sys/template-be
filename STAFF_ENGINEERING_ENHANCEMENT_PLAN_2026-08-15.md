# Staff Engineering Enhancement Plan (BE)

Date: 2026-08-15  
Scope: NestJS + Prisma backend in this repository

## Objective
Create a 90-day roadmap that improves reliability, security, scalability, and delivery speed while reducing operational risk.

## Top Priorities

### 1) Reliability and Observability First
- Add request correlation IDs, structured logging, metrics, and tracing at app bootstrap.
  - [x] request ID middleware + response header propagation
  - [x] structured log payloads with request metadata
  - [x] authorization-header redaction remains intact
  - [x] basic request latency and error metrics
  - [x] health/metrics endpoint exposed
  - [ ] bootstrap tracing hook + trace-to-log correlation (full tracing platform still pending)
  - [x] local smoke validation for public and protected routes
  - [x] review and close within sprint tracker
- Standardize API error shape across modules.
- Establish baseline SLO metrics (latency, error rate, saturation).

Expected outcome:
- Faster incident triage.
- Measurable performance and reliability baselines.
- Safer refactors with better visibility.

### 2) Enforce Authorization Boundaries by Workspace
- Centralize authorization logic so all workspace-scoped endpoints consistently validate membership and role.
- Introduce policy-level guards to avoid repeating logic in controllers/services.

Expected outcome:
- Lower privilege escalation risk.
- Fewer authorization inconsistencies across domains.

### 3) Stabilize Data Lifecycle and Migrations
- Adopt expand-migrate-contract migration strategy.
- Add pre-deploy migration checks and rollback playbook.
- Add startup checks for DB readiness and schema compatibility.

Expected outcome:
- Fewer deploy-time failures.
- Safer schema evolution.

### 4) API Consistency and Versioning
- Define API conventions: pagination, filtering, sorting, and error contract.
- Gate OpenAPI contract changes in CI.

Expected outcome:
- Predictable frontend integration.
- Reduced accidental breaking changes.

### 5) Increase Test Confidence in Critical Flows
- Add integration tests for auth, workspace creation, category/template retrieval, and draft persistence.
- Add repository contract tests to keep mock/prisma behavior aligned.

Expected outcome:
- Fewer regressions.
- Higher refactor confidence.

## Architecture Upgrades (Next)

### 1) Module Boundary Cleanup
- Keep controllers thin, services orchestration-focused, repositories persistence-only.
- Introduce explicit domain interfaces to reduce cross-module leakage.

### 2) Caching and Query Performance
- Centralize cache key and TTL policy.
- Profile high-traffic queries and perform index audits based on Prisma patterns.

### 3) Async Processing Discipline
- Move non-request-critical work to queue workers.
- Add idempotency, retries, and dead-letter handling.

### 4) Security Baseline Hardening
- Add rate limiting on sensitive endpoints.
- Strengthen input validation and dependency scanning.
- Improve environment variable governance and rotation practices.

## Delivery System Improvements

### 1) CI Quality Gates
Require on every PR:
- typecheck
- lint
- unit and integration tests
- migration validation
- production build

Also add changed-module test selection + nightly full-suite runs.

### 2) Engineering Standards
- Add lightweight ADR process.
- Maintain module ownership map.
- Use PR checklist for API, migration, and observability impact.

## Week 1 Execution Plan
1. Instrument logs, metrics, and health endpoints.
2. Add a reusable workspace authorization guard abstraction and apply to highest-risk endpoints.
3. Write three integration tests for critical workflows.
4. Add migration preflight check in CI.
5. Publish backend API conventions and standardized error contract.

## Suggested Tracking Template
Use this table to convert the plan into execution tickets:

| Item | Owner | Effort (S/M/L) | Risk (Low/Med/High) | Dependencies | Target Date | Status |
|---|---|---|---|---|---|---|
| Observability baseline | Backend | M | Medium | Nest bootstrap, logger config, health endpoints | 2026-08-31 | Not started |
| Authz guard rollout | Backend | M | High | Workspace membership model, guard patterns | 2026-09-07 | Not started |
| Critical integration tests | Backend | M | Medium | auth fixtures, DB test setup | 2026-09-10 | Not started |
| Migration preflight CI | Backend | S | Medium | CI pipeline, prisma CLI | 2026-09-04 | Not started |
| API contract governance | Backend + FE | S | Low | OpenAPI spec, review workflow | 2026-09-14 | Not started |


## Notes
- Prioritize reliability and authz before broader refactors.
- Treat migration safety and testing as non-negotiable deployment gates.
- Revisit this document every sprint and update progress/status.
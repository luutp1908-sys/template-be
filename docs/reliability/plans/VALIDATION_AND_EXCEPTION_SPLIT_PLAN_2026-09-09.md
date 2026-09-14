# Reliability Learning Outline

Date: 2026-09-10
Scope: Learn backend reliability in the be project without needing production AWS on day one.

## Goal

Learn how the backend behaves under real dependency failures, then graduate to production-like infra only after the local failure modes are understood.

## Recommended Learning Path

### 1. Start in mock mode

Use `start:mock` to learn the NestJS structure, module wiring, controllers, guards, and request flow.

What this teaches:
- API shape
- auth flow
- middleware and logging
- service and repository boundaries

What it does not teach:
- DB failures
- Redis outages
- queue crashes
- deploy behavior

### 2. Add local Postgres and Redis

Use the local Docker services in be/docker-compose.yml.

This is the minimum setup for reliability learning because it exercises real connections instead of in-memory fallbacks.

### 3. Learn startup reliability

Focus on what happens when Postgres is available vs unavailable.

Relevant files:
- be/src/database/prisma.service.ts
- be/src/config/env.validation.ts

Questions to answer:
- Should startup fail fast or warn?
- Is the app safe to serve traffic if the DB is down?
- Are required env vars validated before boot?

### 4. Learn cache degradation

Focus on what happens when Redis is available vs unavailable.

Relevant files:
- be/src/cache/cache.service.ts
- be/src/common/health/health.controller.ts
- be/docs/reliability/CACHING_STRATEGY_2026-08-06.md

Questions to answer:
- Do reads still work when cache is down?
- Do writes still succeed if cache invalidation fails?
- Can you see cache fallback in health output?

### 5. Learn queue reliability

Focus on the async export path and what happens when the worker or Redis is unhealthy.

Relevant files:
- be/src/queue/queue.module.ts
- be/src/export/export.service.ts
- be/src/export/export.processor.ts

Questions to answer:
- Are jobs enqueued only when the queue is healthy?
- What happens to jobs if the worker crashes?
- Is job processing idempotent and durable enough?

### 6. Learn observability

Use the request ID, structured logs, metrics snapshots, and health endpoint together.

Relevant files:
- be/src/common/middleware/request-logging.middleware.ts
- be/src/common/health/health.controller.ts
- be/src/common/metrics/metrics.service.ts

Questions to answer:
- Can you trace a request end to end?
- Can you measure latency and error rate?
- Can you tell when the app is saturated or degraded?

### 7. Use real infra last

Only move to AWS when you want to learn deploy, rollout, rollback, scaling, TLS, and alarms.

Relevant docs:
- be/docs/deployment/PROD_READINESS_CHECKLIST.md
- be/docs/deployment/AWS_PRODUCTION_DEPLOYMENT_PLAN.md

## Prerequisites

### For mock mode

- Node dependencies installed
- `MOCK_MODE=true`

### For local reliability learning

- Local Postgres
- Local Redis
- Valid env values matching be/src/config/env.validation.ts
- Prisma migrations applied

### For production-like learning

- AWS account
- ECS, RDS, Redis, ECR, and networking
- Secrets management
- Health checks and rollback process

## Suggested Sequence

1. Run mock mode and map the code paths.
2. Start local Postgres and Redis.
3. Break Postgres and observe startup behavior.
4. Break Redis and observe cache fallback.
5. Run export jobs and observe queue behavior.
6. Inspect health and metrics output.
7. Move to AWS only after the local failure modes make sense.

## Notes

- You do not need full AWS infra to begin learning.
- You do need real dependencies to learn reliability well.
- The production checklist can wait until the local failure modes are understood.

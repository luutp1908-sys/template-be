# AWS Production Deployment Plan (Single Region, Cost-Aware)

## Goal
Deploy the backend to a real production-like AWS environment with minimal cost overhead, while preserving good operational practices.

## Scope and Principles
- Single AWS region only.
- Start with monolith service in production.
- Keep export-service deploy optional for later cutover.
- Use managed data services (RDS + Redis) for production realism.
- Avoid expensive extras initially (multi-region, WAF, complex blue/green).

## Target Architecture (Lean but Real-World)
- Compute: ECS Fargate
- Container Registry: ECR
- Database: RDS PostgreSQL (Single-AZ)
- Queue/Cache: ElastiCache Redis (single node)
- Ingress: ALB + ACM TLS
- Secrets/Config: AWS Secrets Manager + SSM Parameter Store
- Logs/Metrics: CloudWatch

## Cost-Saving Decisions (Intentional)
- Single region.
- Single-AZ RDS for first production phase.
- One Redis node (no cluster mode initially).
- Keep one backend ECS service first.
- Use minimal autoscaling policy.
- Skip NAT-heavy architecture unless required by compliance/network policy.

## Rollout Strategy
1. Deploy monolith first with EXPORT_SERVICE_URL unset.
2. Verify production baseline with local export path.
3. Deploy export-service as internal service.
4. Enable EXPORT_SERVICE_URL for controlled canary traffic.
5. Roll back by unsetting EXPORT_SERVICE_URL and redeploying monolith task definition.

## Detailed Implementation Plan

### Phase 1: Prerequisites and Packaging
- [ ] Confirm backend build output path and runtime command are correct for production image.
- [ ] Validate Docker image build locally.
- [ ] Ensure required env vars are present and documented from `.env.example`.
- [ ] Confirm Prisma migration command is ready for non-interactive pipeline use.

### Phase 2: AWS Foundation
- [ ] Create VPC and subnets in one region.
- [ ] Create Security Groups with least-privilege rules.
- [ ] Create ECR repositories:
  - [ ] `be-monolith`
  - [ ] `be-export-service` (optional initial deploy)
- [ ] Create ACM certificate for HTTPS domain.

### Phase 3: Data Services
- [ ] Provision RDS PostgreSQL (Single-AZ, small instance class).
- [ ] Provision ElastiCache Redis (single node).
- [ ] Store DB and Redis credentials in Secrets Manager.
- [ ] Validate ECS network access to RDS and Redis.

### Phase 4: ECS Services
- [ ] Create ECS cluster (Fargate).
- [ ] Create ALB and target group for monolith.
- [ ] Create monolith task definition with secrets/env injection.
- [ ] Deploy monolith ECS service and pass health checks.
- [ ] (Optional now) Create export-service task definition and internal service.

### Phase 5: CI/CD Pipeline
- [ ] Build and push image to ECR on main branch.
- [ ] Run `prisma migrate deploy` as release step.
- [ ] Update ECS service task definition revision.
- [ ] Add rollback action to previous task revision.

### Phase 6: Verification and Guardrails
- [ ] Smoke test auth and core API routes.
- [ ] Smoke test export flow (create -> poll -> download).
- [ ] Enable CloudWatch alarms:
  - [ ] ALB 5xx
  - [ ] ECS task restarts
  - [ ] CPU/Memory saturation
  - [ ] RDS CPU/storage thresholds
- [ ] Set log retention policy.

### Phase 7: Proxy Cutover (When Ready)
- [ ] Deploy export-service and verify internal health.
- [ ] Set `EXPORT_SERVICE_URL` in monolith task env.
- [ ] Run canary validation for export endpoints.
- [ ] Confirm parity for status codes/payloads/download headers.
- [ ] Complete cutover when stable.

## Minimum Required Environment Variables (Production)
- `NODE_ENV=production`
- `PORT`
- `API_PREFIX`
- `SWAGGER_PATH` (optional public exposure)
- `FRONTEND_ORIGIN`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD` (if used)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `EXPORT_SERVICE_URL` (empty for local export path; set for proxy mode)

## Definition of Done
- [ ] Monolith serves production traffic over HTTPS.
- [ ] DB migrations run in release process.
- [ ] Health checks and smoke checks pass after deploy.
- [ ] Alerting baseline exists in CloudWatch.
- [ ] Rollback procedure tested once.
- [ ] (If proxy mode enabled) export endpoint parity confirmed.

## Notes and Decisions Log
- Decision: start with single-region and single-AZ to reduce cost.
- Decision: keep export proxy feature-flagged via `EXPORT_SERVICE_URL`.
- Decision: postpone advanced traffic strategies until baseline is stable.

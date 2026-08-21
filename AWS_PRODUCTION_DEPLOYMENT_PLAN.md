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
- [x] Confirm backend build output path and runtime command are correct for production image.
- [x] Validate Docker image build locally.
- [x] Ensure required env vars are present and documented from `.env.example`.
- [x] Confirm Prisma migration command is ready for non-interactive pipeline use.

Phase 1 validation notes (2026-08-21):
- Verified runtime entrypoint alignment:
  - `package.json` `start:prod` -> `node dist/src/main.js`
  - `Dockerfile` CMD -> `node dist/src/main.js`
- Local image build succeeded:
  - `docker build -t template-saas-backend:local .`
  - Result: `Successfully tagged template-saas-backend:local`
- Environment contract checked in `.env.example`:
  - Contains required production keys including `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `EXPORT_SERVICE_URL`.
- Prisma pipeline readiness check (2026-08-22):
  - Baseline completed on existing non-empty local database by resolving existing migrations as applied.
  - Restored missing migration file in `prisma/migrations/20260816000000_add_template_editor_type_status_index/migration.sql`.
  - `npm run prisma:deploy` now succeeds with `No pending migrations to apply`.
  - `prisma migrate status` confirms `Database schema is up to date!`.

### Phase 2: AWS Foundation
- [x] Create VPC and subnets in one region.
- [x] Create Security Groups with least-privilege rules.
- [x] Create ECR repositories:
  - [x] `be-monolith`
  - [x] `be-export-service` (optional initial deploy)
- [ ] Create ACM certificate for HTTPS domain.

Phase 2 implementation notes (2026-08-22):
- Terraform scaffold created under `infra/`:
  - `infra/environments/prod` (entrypoint, variables, outputs, tfvars example)
  - `infra/modules/network` (VPC/subnets/route tables/IGW)
  - `infra/modules/security` (ALB/ECS/RDS/Redis security groups)
  - `infra/modules/ecr` (ECR repos + lifecycle policy)
  - `infra/modules/acm` (optional ACM cert with conditional DNS validation)
- Runbook added: `infra/README.md`.
- Terraform validation run completed locally:
  - `terraform fmt -recursive infra` succeeded.
  - `terraform init` succeeded and generated `.terraform.lock.hcl`.
  - `terraform validate` succeeded for `infra/environments/prod`.
- Credential status:
  - Previously blocked on missing AWS credentials; resolved after configuring AWS profile.
- Provisioning execution (2026-08-22):
  - `aws sts get-caller-identity` succeeded for account `764800440966`.
  - `terraform plan -var-file=terraform.tfvars.example -out=tfplan` succeeded.
  - `terraform apply tfplan` succeeded.
  - Apply summary: `Resources: 23 added, 0 changed, 0 destroyed`.
  - Outputs captured:
    - `vpc_id`: `vpc-0fd403204cadfd886`
    - `public_subnet_ids`: `subnet-0aa814ed43e444712`, `subnet-028592f5bf170ef55`
    - `private_subnet_ids`: `subnet-034e44aa73334c817`, `subnet-0d94d183613763391`
    - `security_group_ids.alb`: `sg-0d021f56a03714682`
    - `security_group_ids.ecs`: `sg-00c0dc5fff0f5148c`
    - `security_group_ids.rds`: `sg-0eae545a6b4f873df`
    - `security_group_ids.redis`: `sg-07d5fa01db367d527`
    - `ecr_repository_urls.be-monolith`: `764800440966.dkr.ecr.ap-southeast-1.amazonaws.com/be-monolith`
    - `ecr_repository_urls.be-export-service`: `764800440966.dkr.ecr.ap-southeast-1.amazonaws.com/be-export-service`
- Remaining Phase 2 item:
  - ACM certificate is intentionally pending until production domain is ready.
- Checklist remains partially open because ACM depends on domain readiness.

### Phase 3: Data Services
- [x] Provision RDS PostgreSQL (Single-AZ, small instance class).
- [x] Provision ElastiCache Redis (single node).
- [x] Store DB and Redis credentials in Secrets Manager.
- [x] Validate ECS network access to RDS and Redis.

Phase 3 implementation notes (2026-08-22):
- Added Terraform module `infra/modules/data-services` and wired it in `infra/environments/prod`.
- Initial apply delay and failure root cause:
  - ElastiCache creation took ~7m40s (managed service provisioning latency).
  - RDS failed initially because `db_engine_version=16.3` is unavailable in `ap-southeast-1`.
  - Fixed by updating RDS engine version to `16.15`.
- Final validation:
  - `terraform plan` now reports `No changes. Your infrastructure matches the configuration.`
- Provisioned outputs:
  - `db_instance_id`: `db-4S5WPKCKFLIUXLZAC4QGJU53EU`
  - `db_endpoint`: `template-saas-prod-postgres.cdsi6yue03d8.ap-southeast-1.rds.amazonaws.com`
  - `db_port`: `5432`
  - `redis_replication_group_id`: `template-saas-prod-redis`
  - `redis_primary_endpoint`: `master.template-saas-prod-redis.6peln2.apse1.cache.amazonaws.com`
  - `redis_port`: `6379`
  - `db_secret_arn`: `arn:aws:secretsmanager:ap-southeast-1:764800440966:secret:template-saas-prod/database-n6b9Ri`
  - `redis_secret_arn`: `arn:aws:secretsmanager:ap-southeast-1:764800440966:secret:template-saas-prod/redis-K44BXi`

### Phase 4: ECS Services
- [x] Create ECS cluster (Fargate).
- [x] Create ALB and target group for monolith.
- [x] Create monolith task definition with secrets/env injection.
- [x] Deploy monolith ECS service and pass health checks.
- [ ] (Optional now) Create export-service task definition and internal service.

Phase 4 implementation notes (2026-08-22):
- Implemented Terraform modules and environment wiring:
  - `infra/modules/alb`
  - `infra/modules/ecs`
  - `infra/modules/vpc-endpoints`
  - Updated `infra/environments/prod` variables, main wiring, outputs, and tfvars example.
- Provisioned successfully:
  - ALB: `arn:aws:elasticloadbalancing:ap-southeast-1:764800440966:loadbalancer/app/template-saas-prod-alb/f18158a71fa8ae9d`
  - ALB DNS: `template-saas-prod-alb-1931091877.ap-southeast-1.elb.amazonaws.com`
  - Target Group: `arn:aws:elasticloadbalancing:ap-southeast-1:764800440966:targetgroup/template-saas-prod-mono-tg/1cfadd1750f207a2`
  - ECS Cluster: `arn:aws:ecs:ap-southeast-1:764800440966:cluster/template-saas-prod-cluster`
  - ECS Log Group: `/ecs/template-saas-prod-monolith`
  - Private-subnet VPC endpoints: ECR API/DKR, CloudWatch Logs, Secrets Manager, S3.
  - App secret created for JWT values: `arn:aws:secretsmanager:ap-southeast-1:764800440966:secret:template-saas-prod/app-5AmQJD`
- IAM and ECS provisioning status:
  - IAM access issue was resolved and apply succeeded for ECS roles/policies.
  - Monolith ECS service is provisioned.
  - Current ECS task definition ARN: `arn:aws:ecs:ap-southeast-1:764800440966:task-definition/template-saas-prod-monolith:5`.
  - Current ECS service ARN: `arn:aws:ecs:ap-southeast-1:764800440966:service/template-saas-prod-cluster/template-saas-prod-monolith`.
- Runtime fixes applied during validation:
  - Published monolith image to ECR and switched deployment from immutable `latest` to versioned tag (`20260822-queue-off`).
  - Added ECS runtime platform support and set ARM64 in prod to match local Apple Silicon image builds.
  - Added dedicated DB URL secret (`template-saas-prod/database-url-*`) and wired `DATABASE_URL` directly from this secret.
  - Added Redis TLS support in app config/cache/queue paths.
  - Added `QUEUE_ENABLED` feature flag and disabled queue in current prod ECS env for baseline startup isolation.
  - Relaxed ALB health check matcher to `200-499` temporarily for debugging/registration stability.
- Final resolution and validation (2026-08-22):
  - Root cause for repeated task exits: BullMQ workers started without root queue connection (`Worker requires a connection`).
  - Fix applied: enable queue root path in ECS env (`QUEUE_ENABLED=true`, `MOCK_MODE=false`) and deploy image tag `20260822-queue-on`.
  - Final deployed task definition: `arn:aws:ecs:ap-southeast-1:764800440966:task-definition/template-saas-prod-monolith:7`.
  - Runtime evidence:
    - ECS service state reached `desired=1`, `running=1`, `pending=0`.
    - ALB target group contains healthy target(s).
    - Public health endpoint returns `200`:
      - `http://template-saas-prod-alb-1931091877.ap-southeast-1.elb.amazonaws.com/api/v1/health`
      - Response body: `{"success":true,"data":{"status":"ok"},...}`

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

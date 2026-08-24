# Production Readiness Checklist (BE)

Date: 2026-08-24
Scope: NestJS + Prisma backend, AWS ECS/Fargate deploy, GitHub Actions release pipeline

## Summary
The backend has a working production deployment path and a baseline release workflow, but it is not considered fully production-ready until the release guardrails, security hardening, and operational monitoring items below are closed.

## Release Checklist

### 1) Deployment pipeline and release safety
- [x] GitHub Actions workflow exists for production deploy.
- [x] AWS OIDC authentication is configured for deploy role.
- [x] Terraform provisions core prod infrastructure (VPC, ALB, ECS, RDS, Redis, ECR, SGs).
- [x] ECS service deploys successfully and health endpoint returns 200.
- [x] Docker image is built and published to ECR.
- [ ] Add explicit migration gate before app rollout.
- [ ] Add rollback step to previous ECS task definition revision.
- [ ] Add automated smoke checks for critical API routes after deployment.
- [ ] Add deployment approval gate for production environment.

### 2) Infrastructure and runtime configuration
- [x] Production infrastructure is bootstrapped in AWS.
- [x] VPC, subnets, ALB, ECS cluster, security groups, and ECR repositories are provisioned.
- [x] Postgres and Redis are provisioned and reachable by the app.
- [ ] Issue/validate ACM certificate for the production domain.
- [ ] Confirm TLS termination and HTTPS redirect behavior.
- [ ] Verify service-to-service networking and private-only access for non-public dependencies.
- [ ] Review autoscaling thresholds and task resource sizing under load.

### 3) Application integrity and startup safety
- [x] App boots successfully in containerized production runtime.
- [x] Health endpoint is available and returns success payload.
- [x] Required secrets and env vars are documented and wired into the runtime.
- [x] Prisma migration baseline is restored and deployable.
- [ ] Add a startup readiness check for DB connectivity before serving traffic.
- [ ] Add schema compatibility validation in CI and pre-deploy steps.
- [ ] Confirm queue workers and background services are safe in production mode.
- [ ] Review feature flags and disable nonessential services in prod until validated.

### 4) Security and access controls
- [x] Least-privilege IAM / security group design is in place.
- [x] Secrets are stored in AWS Secrets Manager and referenced from ECS.
- [ ] Rotate all default or placeholder secrets before live traffic.
- [ ] Review JWT secret handling and rotation process.
- [ ] Verify CORS / origin hardening for frontend access.
- [ ] Review rate limiting and abuse controls for sensitive endpoints.
- [ ] Add dependency scan / vulnerability review in CI.
- [ ] Confirm logs do not expose credentials or tokens.

### 5) Observability and incident response
- [x] Request correlation IDs are generated and returned in response headers.
- [x] Structured logging includes key request metadata.
- [x] Metrics endpoint exposes latency, status, and error-rate baselines.
- [x] Health endpoint includes backend status and cache/availability summary.
- [ ] Add alerting baseline for ALB 5xx, task restarts, CPU/memory saturation, and DB utilization.
- [ ] Set log retention and archive policy for CloudWatch / ECS logs.
- [ ] Document runbook for common production incidents and rollback triggers.
- [ ] Add trace correlation from request ID to log stream and app telemetry.

### 6) Data and migration controls
- [x] Prisma migration state is aligned with local database.
- [ ] Add migration preflight check to CI and deployment workflow.
- [ ] Create rollback playbook for schema or data regressions.
- [ ] Define backup/restore verification schedule for production storage.
- [ ] Review index usage and high-query hotspots before scaling out.

### 7) Business and customer-facing readiness
- [ ] Smoke test login/auth flows.
- [ ] Smoke test core workspace and CRUD routes.
- [ ] Smoke test export flow and file download behavior.
- [ ] Validate frontend integration against the canonical API error envelope.
- [ ] Confirm the status and payload behavior for public and protected endpoints.

## Hard gate before production launch
The release should not proceed until all items marked as required in the sections above are cleared and the team has signed off on:
- rollback readiness
- migration safety
- secure secret management
- monitoring and alerting
- smoke-test validation

## Current assessment
Current status: partial production readiness with a functioning baseline deployment, but not yet full production launch readiness.

## Recommended next actions
1. Add migration + rollback safety checks to the production workflow.
2. Validate the HTTPS domain and ACM certificate flow.
3. Add CloudWatch alerts and log retention policies.
4. Run a production smoke suite across auth, workspace, export, and health endpoints.
5. Close the final hardening items before enabling broader public traffic.

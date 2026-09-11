# Observability Enhancement Plan (BE)

Date: 2026-09-10  
Scope: Backend service in be (NestJS + Prisma + Redis + BullMQ on ECS)

## Goal

Upgrade observability from local baseline instrumentation to production-grade detection and triage so incidents are detected quickly, diagnosed confidently, and resolved with clear rollback signals.

## Current Baseline

Already implemented:
- Request ID propagation and structured request logs.
- Exception filter with standardized error envelope and contextual logging.
- In-process HTTP latency/error counters and cache snapshot metrics.
- Basic health endpoint and deployment smoke check.

Key gaps to close:
- Health endpoint is not dependency-aware for DB and queue readiness.
- Metrics are in-memory only and not durable or aggregate across replicas.
- No production alert baseline (ALB, ECS, DB, Redis, queue).
- No trace correlation from request path to downstream dependencies.
- No documented runbook and incident response triggers.

## Success Criteria

- Mean time to detect high-severity incidents is under 5 minutes.
- Mean time to identify likely root cause is under 15 minutes.
- Every request has a stable correlation path from ingress to app logs and errors.
- Readiness endpoint reflects real dependency state (DB, Redis, queue).
- Alert coverage exists for API errors, latency, restarts, saturation, and queue failures.
- On-call runbook exists and is validated by one game day.

## Guiding Principles

- Prefer accurate signals over noisy volume.
- Keep endpoint contracts stable while improving internals.
- Instrument once, reuse across modules.
- Every alert must map to a human action.
- Health is for automation decisions, not only human visibility.

## Workstreams

### 1) Health and Readiness

Objective: separate liveness from readiness and make readiness dependency-aware.

Tasks:
- Add readiness endpoint with checks for:
  - Postgres connectivity
  - Redis connectivity
  - BullMQ queue connectivity and worker health
- Keep liveness lightweight and process-only.
- Update deployment workflow to gate rollout on readiness, not only health.

Deliverables:
- New readiness endpoint contract and response schema.
- Updated deployment smoke step to use readiness for go/no-go.
- Tests for dependency-up and dependency-down scenarios.

### 2) Metrics Pipeline and Cardinality Control

Objective: move from process-local snapshots to durable, queryable production metrics.

Tasks:
- Expose metrics in a scrape-friendly format through one endpoint.
- Add counters, histograms, and gauges for:
  - HTTP requests by route, status class, and method
  - Request latency percentiles
  - Exception counts by code class
  - Queue depth, enqueue rate, success/failure/retry counts
  - DB query latency and error counts
  - Cache hit ratio and fallback count
- Enforce label cardinality rules to prevent runaway dimensions.

Deliverables:
- Metrics taxonomy document.
- Production dashboard set for API, DB, cache, and queue.
- Retention policy and sampling rules.

### 3) Logging Quality and Cost Governance

Objective: improve log usefulness while reducing noise and cost.

Tasks:
- Wire request-log enablement and level controls to config flags.
- Ensure sensitive field redaction coverage includes auth cookies and tokens.
- Standardize event names for key lifecycle events:
  - request.completed
  - auth.login.failed
  - queue.job.failed
  - db.connection.failed
- Add structured context fields:
  - requestId, userId, workspaceId, module, operation, durationMs
- Add log volume guardrails:
  - sampling for high-volume success logs
  - always-log for errors and security events

Deliverables:
- Logging contract and field dictionary.
- Redaction test coverage.
- Log cost baseline before and after tuning.

### 4) Tracing and Correlation

Objective: enable trace-level root cause analysis across request and dependency boundaries.

Tasks:
- Add OpenTelemetry SDK bootstrap and trace exporter.
- Instrument:
  - HTTP ingress
  - Prisma queries
  - Redis operations
  - BullMQ job lifecycle
- Propagate correlation identifiers between API calls and queue jobs.
- Include trace and span IDs in structured logs.

Deliverables:
- Trace-to-log correlation in operational queries.
- Service map for API, DB, cache, and queue interactions.
- Example triage playbook using traces.

### 5) Alerting and Incident Response

Objective: convert telemetry into actionable, low-noise alerts.

Tasks:
- Add threshold and rate-of-change alerts for:
  - ALB 5xx
  - API 5xx and high 4xx bursts for auth endpoints
  - p95 and p99 latency breaches
  - ECS task restart churn
  - CPU and memory saturation
  - RDS CPU/storage and connection pressure
  - Redis unavailability and connection errors
  - Queue backlog growth and repeated job failure
- Define severity model (SEV-1 to SEV-3) and escalation policy.
- Create runbook entries per alert with triage and rollback steps.

Deliverables:
- Alert catalog with owner and response action.
- On-call runbook with decision trees.
- One game day exercise report.

## Execution Roadmap

### Phase 1 (Week 1): Foundation Hardening

- Implement readiness endpoint and dependency checks.
- Update deploy smoke gate to readiness.
- Add missing redaction and logging control wiring.
- Define metrics taxonomy and cardinality rules.

Exit criteria:
- Deploy fails when readiness dependencies are unhealthy.
- No critical secrets appear in logs.

### Phase 2 (Week 2-3): Durable Telemetry

- Add durable metrics export path and baseline dashboards.
- Instrument queue and DB metrics.
- Add first alert set (errors, latency, restarts, saturation).

Exit criteria:
- Dashboard coverage exists for HTTP, DB, cache, queue.
- Alert test triggers verified in non-production.

### Phase 3 (Week 4-5): Tracing and Incident Readiness

- Add distributed tracing and trace-log correlation.
- Finalize runbook and escalation ownership.
- Run game day and close action items.

Exit criteria:
- One incident drill completed with evidence.
- Root cause traceable across API and dependencies.

## Implementation Task List

### Phase 1 Tasks
- [x] Implement readiness endpoint with DB, Redis, and queue worker checks.
- [x] Keep liveness process-only on /api/v1/health and /api/v1/health/live.
- [x] Update deploy workflow to gate on /api/v1/health/ready instead of /api/v1/health.
- [ ] Add deploy workflow smoke assertion for readiness response status field.
- [ ] Wire ENABLE_REQUEST_LOGS to control request.completed log emission.
- [ ] Add structured log field standards for module and operation on key flows.
- [ ] Extend redaction coverage for cookies and token-like payload fields.
- [ ] Add tests that fail when sensitive values appear in logs.
- [ ] Publish metrics taxonomy document for names, types, units, labels.
- [ ] Add label cardinality guardrails and naming conventions.

### Phase 2 Tasks
- [ ] Add durable metrics export endpoint compatible with scraping.
- [ ] Implement HTTP request counter and latency histogram metrics.
- [ ] Implement exception count metrics grouped by status class and code.
- [ ] Add queue depth, enqueue rate, failure, and retry metrics.
- [ ] Add DB operation latency and DB error metrics.
- [ ] Add cache hit ratio and cache fallback event metrics.
- [ ] Build API dashboard with latency, throughput, and error panels.
- [ ] Build queue dashboard with backlog, failure, and retry panels.
- [ ] Build DB and cache dashboard with saturation and error panels.
- [ ] Define retention windows and downsampling strategy.
- [ ] Configure first alert set for 5xx, latency, restarts, and saturation.
- [ ] Run non-production alert trigger tests and tune thresholds.

### Phase 3 Tasks
- [ ] Add OpenTelemetry bootstrap and exporter configuration.
- [ ] Instrument HTTP ingress with spans and request attributes.
- [ ] Instrument Prisma calls with query latency spans.
- [ ] Instrument Redis operations with client spans.
- [ ] Instrument BullMQ lifecycle events with job spans.
- [ ] Propagate correlation IDs from API request to queue jobs.
- [ ] Include traceId and spanId in structured log events.
- [ ] Publish incident runbook with per-alert triage actions.
- [ ] Define severity matrix and escalation ownership.
- [ ] Run one game day incident drill and capture findings.
- [ ] Close post-drill action items and update runbook.

## Ownership and Operating Model

- Engineering owner: Backend platform lead
- Secondary owner: SRE/DevOps counterpart
- Reviewers: API module owners (auth, template, export)
- Cadence: weekly reliability review with checklist updates

## Tracking Checklist

### Foundation
- [x] Readiness endpoint implemented
- [x] Liveness endpoint kept process-only
- [x] Deploy workflow gates on readiness
- [ ] Structured logging controls wired to config
- [ ] Redaction rules validated with tests

### Metrics
- [ ] Durable metrics export enabled
- [ ] HTTP metrics taxonomy finalized
- [ ] Queue metrics added
- [ ] DB metrics added
- [ ] Cache hit/fallback metrics validated
- [ ] Dashboards published

### Tracing
- [ ] OpenTelemetry bootstrap integrated
- [ ] Prisma spans visible
- [ ] Redis spans visible
- [ ] BullMQ spans visible
- [ ] Trace ID included in logs

### Alerting and Runbooks
- [ ] Alert catalog finalized
- [ ] Severity and escalation policy published
- [ ] Alert action docs linked
- [ ] Game day executed
- [ ] Post-game improvements closed

## Risks and Mitigations

- Risk: noisy alerts reduce trust.
  - Mitigation: burn-rate and multi-window thresholds with owner review.
- Risk: metric cardinality explosion increases cost.
  - Mitigation: route templates and capped label sets.
- Risk: tracing overhead increases latency.
  - Mitigation: sampling strategy and staged rollout.
- Risk: partial rollout causes blind spots.
  - Mitigation: minimum observability gate per module before release.

## Definition of Done

- Readiness is dependency-aware and used in deploy gates.
- Metrics are durable, dashboarded, and alerted.
- Traces are correlated with logs.
- On-call runbook is published and validated by exercise.
- Observability ownership and review cadence are active.
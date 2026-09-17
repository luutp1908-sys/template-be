# Scalability Implementation Plan (BE)

Date: 2026-09-14
Scope: backend service capacity, load handling, deployment scaling, and production tuning for BE on AWS/ECS with Postgres, Redis, and BullMQ.

## Goal

Turn the service from a locally reliable app into one that can safely handle increased traffic, concurrent work, and queue pressure with explicit capacity rules, scaling behavior, and operational guardrails.

This plan follows the reliability and observability work already completed and closes the remaining gap identified in the scaling strategy: production readiness under load.

## Success criteria

- The system can sustain a defined throughput target without sustained p95/p99 regression.
- Capacity and scaling rules are explicit for API, queue, and dependency components.
- The deployment pattern supports rolling updates and safe rollback.
- The team can detect saturation and scale before user-facing latency degrades.
- DB pool and queue worker settings are tuned for realistic concurrency levels.

## Ownership model

This plan should be executed with a clear split of responsibility:

- Backend ownership: application behavior, throughput, bottleneck detection, and tuning of app-level concurrency.
- DevOps / platform ownership: infrastructure sizing, autoscaling, deployment safety, rollout controls, and operational alerts.
- Shared ownership: queue scaling, production load thresholds, and saturation response.

This separation matters because application bottlenecks and platform bottlenecks require different fixes and different owners.

## Workstreams

### 1) Backend: Capacity baseline and load targets

Objective: establish measurable production performance goals before changing deployment behavior.

Backend tasks:
- define target RPS and concurrency for the API service
- define target queue throughput and backlog thresholds for export jobs
- define latency goals for p95 and p99 under expected load
- decide on the load profile for normal, peak, and failure scenarios
- identify the smallest meaningful production-like test environment

Deliverables:
- target load matrix
- per-component throughput expectations
- baseline p95/p99 budgets under steady-state workload

Recommended initial goals:
- API target: stable p95 under a defined RPS budget while keeping error rate near zero
- Queue target: backlog should recover within the configured processing window under expected burst load
- DB target: query latency should remain within the alert threshold under normal peak traffic

### 2) Backend: Load testing and benchmarking

Objective: validate how the system behaves under real traffic and queue pressure.

Backend tasks:
- create a repeatable load test for the API
- create a targeted queue test that simulates job bursts
- test DB and Redis pressure under combined traffic patterns
- establish steady-state and peak scenarios
- capture baseline metrics for CPU, memory, latency, and queue depth

Deliverables:
- load test script or procedure
- benchmark report with p95/p99 results
- capacity threshold notes for production sizing

Minimum test scenarios:
- normal traffic baseline
- 2x normal load
- peak burst load
- degraded DB or Redis scenario
- queue saturation scenario with worker slowdown

### 3) Shared: Horizontal scaling strategy

Objective: define how the service scales safely in production.

Backend responsibilities:
- define the app-level capacity limits and bottleneck points
- specify the queue backlog triggers that should cause worker changes
- identify whether scaling is needed for API or worker saturation first
- validate whether autoscaling is reacting to real workload pressure and not just noisy infra metrics

DevOps responsibilities:
- define whether the API scales horizontally by ECS task count or another platform primitive
- set target minimum and maximum task counts
- define autoscaling policy based on throughput, latency, or CPU utilization
- define queue consumer scaling rules for BullMQ worker capacity
- decide how queue backlog will trigger worker scaling or throttling

Deliverables:
- scaling policy by component
- ECS or deployment configuration recommendations
- scaling trigger matrix

Recommended approach:
- scale API tasks on sustained latency and request-rate signals
- scale queue workers based on backlog depth and processing time
- keep a safe minimum healthy worker count to avoid queue starvation

### 4) DevOps: Deployment pattern and rollout safety

Objective: make production updates safe at scale.

DevOps tasks:
- use rolling deployment patterns with readiness gates
- require health and dependency checks before new tasks become ready
- define deployment rollback criteria for latency, error rate, and readiness regressions
- ensure queue workers are drained or paused appropriately during risky deployments
- define what happens if a new version cannot meet target error/latency budget

Backend support:
- provide the app-level performance and stability thresholds used as deployment gates
- validate whether a rollout is safe under the current queue and response-time profile

Deliverables:
- rollout and rollback policy
- health gate and readiness gate checklist
- safe deployment playbook

### 5) Backend: DB, Redis, and connection tuning

Objective: remove common production bottlenecks before they become incidents.

Backend tasks:
- tune Prisma connection pool settings to match application concurrency
- validate Postgres connection saturation under peak load
- ensure Redis is provisioned for queue throughput and cache pressure
- review queue worker concurrency and retry settings
- review DB query patterns for N+1 or heavy reads during peak traffic

DevOps support:
- provide the infra sizing and resource profiles required for the tuned configuration
- confirm the environment can support the expected DB and Redis concurrency

Deliverables:
- DB pooling recommendations
- Redis sizing guidance
- queue worker concurrency settings
- hot-path query review notes

### 6) Shared: Saturation detection and proactive scaling

Objective: scale before severe degradation occurs.

Backend responsibilities:
- add first-class saturation signals for API response latency, queue depth, and DB latency
- identify the application-level symptoms that signal overload before user-visible errors occur
- define which app metrics should feed the scale decision

DevOps responsibilities:
- add CPU, memory, and infrastructure saturation signals
- define escalation thresholds before user-visible breakage
- ensure autoscaling triggers operate on sustained load, not single-sample spikes
- add alert-to-scale playbook for saturated queues and API workers

Deliverables:
- saturation alert thresholds
- scale-up and scale-down rules
- response plan for queue lag or DB pressure

### 7) DevOps: Operational readiness and rollback trigger matrix

Objective: provide a clear operating model for the team during load or scale changes.

DevOps tasks:
- define what conditions trigger manual scale actions
- define what conditions trigger rollback
- define what conditions require queue throttling or pause
- define ownership for each scale pattern and decision point

Backend support:
- confirm the application health metrics and thresholds that should gate operational actions
- define what is considered acceptable performance degradation during a controlled scale event

Deliverables:
- rollback trigger matrix
- scale decision matrix
- queue throttling policy

## Execution roadmap

### Phase 1: Backend baseline and load targets

- define target traffic and latency budgets
- create a load test script and benchmark plan
- establish baseline p95/p99 values

Exit criteria:
- the team knows the expected steady-state and peak RPS
- performance expectations are documented and measurable

### Phase 2: Backend benchmark under stress

- run API load tests at 2x and peak target load
- run queue burst tests and backlog recovery tests
- test DB and Redis under combined load

Exit criteria:
- system behavior under peak load is recorded
- bottlenecks are identified with evidence

### Phase 3: DevOps production scaling controls

- set autoscaling, task count, and queue worker policies
- tune DB and Redis settings
- validate deployment safety with rolling updates and readiness gates

Exit criteria:
- scale actions are deterministic and safe
- canary or rolling deployment does not create user-visible instability

### Phase 4: Shared ops and tuning

- tune thresholds after initial load test results
- update runbook and escalation ownership based on findings
- add a recurring load validation step to the project cadence

Exit criteria:
- capacity and performance are reviewed on a regular basis
- the team has a reproducible load validation workflow

## Implementation checklist

### Backend checklist
- [x] Define API throughput and latency targets
- [x] Define queue throughput and backlog expectations
- [x] Document normal, burst, and failure load profiles
- [x] Create API load test procedure
- [x] Create queue burst test procedure
- [x] Validate DB and Redis behavior under combined load
- [x] Tune Prisma pool and DB concurrency settings
- [x] Tune Redis and queue worker settings
- [x] Review hot-path DB queries and app bottlenecks

### DevOps checklist
- [ ] Define horizontal scaling rules for API tasks
- [ ] Define scaling rules for queue workers
- [ ] Define rollout and rollback policy
- [ ] Define scale-up and scale-down triggers
- [ ] Add saturation alert and capacity review steps
- [ ] Review results and update ops docs
- [ ] Configure ECS or platform autoscaling rules
- [ ] Define readiness and health-gate checks for deploys
- [ ] Define queue drain / pause playbook during risky releases

## Risks and mitigations

- Risk: load tests are unrealistic and lead to false confidence.
  - Mitigation: include traffic bursts, DB stress, and queue backlog conditions.
- Risk: scaling too late causes user-visible latency.
  - Mitigation: use sustained thresholds rather than single-sample triggers.
- Risk: queue scaling hides app-level bottlenecks.
  - Mitigation: validate both app and queue behavior under load.
- Risk: DB and Redis tuning degrade reliability if changed without performance validation.
  - Mitigation: change one dependency at a time and verify with benchmarks.

## Definition of done

This plan is complete when the backend has:

- explicit throughput and latency targets,
- a repeatable load testing workflow,
- production-safe scaling rules,
- tuned DB and queue settings,
- and a deployment/rollback plan that is safe under sustained traffic.

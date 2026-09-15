# API Throughput and Latency Targets (Backend Only)

Date: 2026-09-15
Scope: backend-only capacity planning for the BE service. This document is intentionally limited to API throughput, latency, and load-benchmark targets.

## Goal

Define the first measurable backend capacity baseline so the service can be tested under realistic load before scaling decisions are made.

This is the first implementation step in the scalability plan and stays strictly in backend scope. It does not define ECS autoscaling or deployment strategy.

## Working assumptions

- The service is a NestJS backend using Postgres, Redis, and BullMQ.
- The dominant load pattern is a mix of read-heavy API traffic and queued export work.
- The initial target is a conservative baseline that can be validated and tightened after benchmark results.
- These numbers are starting targets, not final production guarantees.

## Recommended initial target matrix

Use these as the first backend baseline until measured data from a real load test exists. These are intentionally conservative starting values and must be validated before they are treated as production guarantees.

### Initial backend baseline targets

- Steady-state API target: 25 RPS per app instance for the representative endpoint mix
- Burst API target: 50 RPS per app instance for the same mix under peak traffic
- Target read latency: p95 under 250 ms, p99 under 500 ms
- Target write latency: p95 under 500 ms, p99 under 1000 ms
- Target export-trigger latency: p95 under 1000 ms, p99 under 2000 ms
- Target steady-state error rate: under 1%
- Target 2x-load error rate: under 1%
- Queue recovery target: backlog should return to within normal operating range within 2 minutes after a burst

### API endpoints

- Simple read endpoints:
  - target p95 latency: under 250 ms
  - target p99 latency: under 500 ms
  - target error rate: under 1% under steady-state and 2x normal load

- Standard write / update endpoints:
  - target p95 latency: under 500 ms
  - target p99 latency: under 1000 ms
  - target error rate: under 1% under steady-state and 2x normal load

- Export-triggering endpoints:
  - target p95 latency: under 1000 ms
  - target p99 latency: under 2000 ms
  - target error rate: under 1% under steady-state load

### Queue-processing behavior

- Queue backlog should recover within the configured processing window during expected burst traffic.
- Export jobs should not show sustained queue lag beyond the normal processing target during 2x expected load.
- Worker saturation should be observable before user-facing latency degrades.
- Under a burst scenario, queue depth should trend back toward baseline within 2 minutes without runaway growth.

### Throughput targets

- Define the baseline API RPS in terms of the expected business traffic profile, not arbitrary synthetic load.
- Start with a target steady-state workload that is realistic for the app and then validate 2x normal load as the stress threshold.
- If API traffic is bursty, ensure the target captures both average RPS and peak burst RPS.

## Backend benchmark approach

1. Define a single representative API workload for the most used endpoints.
2. Define a burst scenario that is 2x the normal expected traffic.
3. Define a queue-heavy scenario that enqueues export jobs at a rate above the ordinary workload.
4. Measure p95, p99, throughput, error rate, DB latency, Redis latency, and queue depth.
5. Only then adjust the target values upward or downward.

## Decision rules for backend throughput targets

- If p95 stays below the target under 2x load, the target is considered acceptable for the current backend baseline.
- If p95 or p99 crosses the target consistently, the backend must identify the bottleneck before increasing traffic assumptions.
- If error rate rises above the target under normal or 2x load, the workload is not yet valid for the current backend design.
- If queue backlog grows faster than the worker recovery window, queue and worker concurrency need tuning before any scaling policy is defined.

## Concrete backend checklist

- [x] **Define expected steady-state API RPS for the representative endpoint mix**
  - Definition: 25 RPS per app instance for the representative mix of read, write, and export-triggering endpoints.
  - Scope: backend-only request capacity baseline; this is not an ECS or autoscaling decision.
  - Measurement rule: validate against a warm, steady-state benchmark before treating this as a production baseline.
- [ ] **Define expected peak burst API RPS for the same mix**
- [ ] **Define p95 and p99 latency targets for read and write endpoints**
- [ ] **Define queue backlog and recovery target for export jobs**
- [ ] **Document steady-state, 2x load, and peak-burst scenarios**
- [ ] **Validate the targets with a backend benchmark run against the local test environment**
- [ ] **Record the measured p95/p99 results and compare them to target values**
- [ ] **Update the target matrix if the real workload differs from the initial assumption**
- [ ] **Confirm the initial target numbers are still valid after a benchmark run before treating them as production baselines**

## Definition of done for this task

This task is complete when the backend has:

- a written API throughput target baseline,
- a latency budget for the main endpoint classes,
- a queue backlog target for export processing,
- and a defined validation plan for measuring these numbers under real load.

This task intentionally does not include DevOps autoscaling, ECS configuration, or rollout policy.

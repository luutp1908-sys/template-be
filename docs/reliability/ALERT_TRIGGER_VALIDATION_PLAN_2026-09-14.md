# Alert Trigger Validation Plan (BE)

Date: 2026-09-14
Scope: non-production validation of the first alert baseline for API, queue, database, cache, and infrastructure saturation signals.

## Purpose

This plan turns the first alert baseline into a repeatable verification workflow. It is intended for staging or local pre-production validation before alerts are promoted to a real production monitoring stack.

The goal is to confirm that each rule fires when expected, resolves when the condition clears, and remains low-noise enough to be trusted by the team.

## Validation environment

Use the same stack already established for local reliability work:

- Postgres
- Redis
- Jaeger
- the NestJS BE app
- Prometheus-compatible metrics endpoint at `/api/metrics`

Validation should be performed in a non-production environment with alert routing turned on but muted or pointed at a low-noise channel during the exercise.

## Core rules to validate

1. API 5xx rate alert
2. API p95 latency alert
3. API error surge alert
4. Redis degraded alert
5. Queue backlog growth alert
6. Queue repeated failures alert
7. Stale worker heartbeat alert
8. DB latency alert
9. Cache degradation alert
10. Service saturation alert

## Validation procedure

### 1) Baseline the metrics

Before triggering any synthetic failure:

- open the metrics endpoint and confirm the expected series are present
- note the normal 5m and 15m values for each alert signal
- confirm the alert thresholds are using current values rather than stale or default state

Expected result:
- each metric is visible and stable before the simulated incident

### 2) Trigger each alert condition

#### Scenario A: API 5xx burst

Trigger:
- cause an intentional server error path or a synthetic route that returns 500s
- keep the condition running for 5-10 minutes

Expected alert:
- `api_5xx_rate_high`

Validation:
- confirm the alert fires only after the threshold condition has been sustained
- verify the signal disappears when the test route is removed or fixed

Tune guidance:
- if the alert fires too quickly, increase the duration or require a higher error rate
- if it fails to fire reliably, reduce the threshold or extend the test duration

#### Scenario B: API latency spike

Trigger:
- create a sustained delay in a request path or add a known expensive operation with a 5m window
- keep it running long enough to exceed p95 latency

Expected alert:
- `api_p95_latency_high`

Validation:
- compare the app latency metrics against the alert rule value
- confirm the alert is not firing during normal traffic baseline

Tune guidance:
- use 600ms as the initial threshold for the learning baseline
- move to 800ms or 1s only if the service naturally runs above the lower threshold

#### Scenario C: Redis degraded state

Trigger:
- stop Redis temporarily or force a degraded queue health state

Expected alert:
- `redis_degraded`

Validation:
- confirm queue health metric transitions to degraded state
- verify the alert resolves once Redis returns to normal

Tune guidance:
- keep the alert duration short (2m) to ensure it catches outages quickly without noise

#### Scenario D: Queue backlog growth

Trigger:
- enqueue many jobs and slow or suspend the queue worker

Expected alert:
- `queue_backlog_growth`

Validation:
- confirm backlog counts increase in waiting and delayed jobs
- ensure the alert does not fire during normal low-traffic queue states

Tune guidance:
- hold the threshold at the current backlog alert gate until real backlog patterns are observed

#### Scenario E: Repeated queue failures

Trigger:
- cause a batch of job failures through a bad payload or simulated exception path

Expected alert:
- `queue_repeat_failures`

Validation:
- verify value persists across the 10m window
- ensure the alert clears after the failure rate returns to baseline

Tune guidance:
- use a higher threshold if the service naturally experiences transient export retries during normal periods

#### Scenario F: Worker heartbeat stale

Trigger:
- simulate a worker crash or stop heartbeats for the queue worker

Expected alert:
- `queue_worker_stale`

Validation:
- confirm the queue worker stale metric is set and the alert triggers
- verify the alert resolves once the worker reconnects and heartbeats resume

Tune guidance:
- keep the stale window short enough to catch true worker loss

#### Scenario G: Database latency spike

Trigger:
- execute a slow Prisma query or simulate a backlog of DB work

Expected alert:
- `db_latency_high`

Validation:
- ensure the latency is sustained and reflected in the DB histogram
- confirm the alert does not resolve immediately when the query recovers

Tune guidance:
- default threshold should remain near 250ms to catch real pressure without wide false alarms

#### Scenario H: Cache degradation

Trigger:
- intentionally lower cache effectiveness or simulate a backend fallback event stream

Expected alert:
- `cache_hit_ratio_low`

Validation:
- confirm hit ratio falls below 0.75 for the configured duration
- review whether fallback events map to user-visible latency or backend pressure

Tune guidance:
- tune the threshold using the observed traffic profile before production

#### Scenario I: Infrastructure saturation

Trigger:
- push CPU or memory utilization above the target for a sustained period or simulate a resource-constrained environment

Expected alert:
- `service_saturation_high`

Validation:
- confirm the saturation signal is linked to the host or container metric source
- verify it does not fire during normal load tests

Tune guidance:
- start with conservative CPU and memory thresholds and tighten only after baseline data is available

## Pass criteria

Each alert has passed validation when all of the following are true:

- the alert fires under the defined condition
- the alert resolves after the condition is removed
- the alert does not fire on the known healthy baseline
- the alert message is clear and actionable for the owner
- the alert can be routed to the correct team without manual interpretation

## Threshold tuning guidelines

Use these rules to tune thresholds after validation:

- start with moderate thresholds and widen only if false positives appear
- prefer sustained multi-window conditions over single-sample triggers
- avoid alerting on noisy temporary spikes unless the incident is high severity
- keep the first production set conservative and small
- if a metric is naturally volatile, prefer a longer duration window and a higher threshold rather than a noisy short window

## Records to keep

For each scenario, record:

- trigger type
- alert fired or not
- time to fire
- time to resolve
- metric values at trigger and resolution
- whether the threshold needed adjustment
- final owner and incident action

## Definition of done

This validation task is complete when:

- each alert in the baseline has a documented trigger and resolution path,
- the alert rules have been exercised in non-production,
- threshold tuning decisions are recorded,
- the team has a clear path to promote the rules into production with a minimal false-positive rate.

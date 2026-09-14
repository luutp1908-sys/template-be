# Queue Dashboard Spec (BE)

Date: 2026-09-14
Scope: operational dashboard for the backend export queue, using the Prometheus-compatible metrics exposed by the app and aligned to the BE metrics taxonomy.

## Purpose

Provide a single dashboard for queue triage with the minimum useful views needed to answer the key operational questions quickly:

- Is the queue healthy?
- Is backlog growing or jobs stuck?
- Are retries or failures increasing?
- Is the worker state unhealthy or Redis degraded?

This is a documentation-level implementation of the queue dashboard item in the observability plan. It does not add external monitoring infrastructure to the repo; it defines the exact panel layout and queries for the monitoring stack that consumes the metrics endpoint.

## Data source

- Prometheus-compatible scrape endpoint: `/api/metrics`
- Primary metrics used:
  - `queue_waiting_jobs`
  - `queue_delayed_jobs`
  - `queue_active_jobs`
  - `queue_depth_total`
  - `queue_failed_jobs`
  - `queue_retryable_jobs`
  - `queue_workers_stale_count`
  - `queue_worker_heartbeat_stale`
  - `queue_backlog_growth_alert`
  - `queue_repeated_failures_alert`
  - `queue_redis_degraded_alert`

## Dashboard layout

### Row 1: Queue backlog

#### Panel 1: Waiting jobs
- Title: Waiting jobs
- Type: Time series
- Query:
  - `queue_waiting_jobs`
- Interpretation:
  - Confirms whether work is accumulating before worker pickup.

#### Panel 2: Delayed jobs
- Title: Delayed jobs
- Type: Time series
- Query:
  - `queue_delayed_jobs`
- Interpretation:
  - Shows jobs waiting on backoff or scheduled retry windows.

#### Panel 3: Active jobs
- Title: Active jobs
- Type: Time series
- Query:
  - `queue_active_jobs`
- Interpretation:
  - Indicates whether workers are actively processing work or stalled.

#### Panel 4: Queue depth
- Title: Queue depth total
- Type: Time series
- Query:
  - `queue_depth_total`
- Interpretation:
  - High-level backlog signal across waiting, active, and delayed jobs.

### Row 2: Failure and retry health

#### Panel 5: Failed jobs
- Title: Failed jobs
- Type: Time series
- Query:
  - `queue_failed_jobs`
- Interpretation:
  - Tracks whether the queue is failing work at a sustained rate.

#### Panel 6: Retryable jobs
- Title: Retryable jobs
- Type: Time series
- Query:
  - `queue_retryable_jobs`
- Interpretation:
  - Reveals retries, backoff pressure, and repeated transient errors.

#### Panel 7: STALE worker count
- Title: Stale workers
- Type: Time series
- Query:
  - `queue_workers_stale_count`
- Interpretation:
  - Indicates worker heartbeat problems or unhealthy workers.

### Row 3: Operational alerts

#### Panel 8: Backlog growth alert
- Title: Backlog growth alert
- Type: Stateless threshold panel or boolean gauge
- Query:
  - `queue_backlog_growth_alert`
- Interpretation:
  - Signals that queue backlog exceeds the configured alert threshold.

#### Panel 9: Repeated failures alert
- Title: Repeated failures alert
- Type: Stateless threshold panel or boolean gauge
- Query:
  - `queue_repeated_failures_alert`
- Interpretation:
  - Identifies sustained queue failure conditions needing attention.

#### Panel 10: Redis degraded alert
- Title: Redis degraded alert
- Type: Stateless threshold panel or boolean gauge
- Query:
  - `queue_redis_degraded_alert`
- Interpretation:
  - Confirms that queue health is degraded because Redis connectivity or readiness is not good.

### Row 4: Worker health indicators

#### Panel 11: Worker heartbeat stale
- Title: Worker heartbeat stale
- Type: Time series
- Query:
  - `queue_worker_heartbeat_stale`
- Interpretation:
  - Direct signal that worker heartbeats have stalled and the queue may be stuck or recovering.

## Alerting recommendations

Use these panels to trigger the first alert set:

- `queue_backlog_growth_alert == 1 for 5m`
- `queue_repeated_failures_alert == 1 for 10m`
- `queue_worker_heartbeat_stale == 1 for 2m`
- `queue_redis_degraded_alert == 1 for 2m`
- `queue_depth_total > 20 for 10m`

## Dashboard health criteria

This dashboard is considered complete when:

- backlog size is visible without drilldown,
- worker health is visible without drilldown,
- failure and retry pressure is visible without drilldown,
- stale worker and Redis degraded states are immediately actionable,
- the queue can be triaged in under a minute during an incident.

## Notes

This is intentionally scoped to the BullMQ export queue and the metrics already exposed by the app. It stays within the learning and implementation bounds of the BE observability work without introducing a full external monitoring deployment into the repo.

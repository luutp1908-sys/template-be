# Alerting Baseline Spec (BE)

Date: 2026-09-14
Scope: backend service alerts for API errors, latency spikes, queue degradation, redis degradation, and infrastructure saturation.

## Purpose

This document defines the first alert set for the BE observability baseline. The goal is to surface the most actionable conditions early without creating noisy alerts that the team cannot trust.

The alert rules below are designed for a Prometheus-compatible metrics stack and assume the backend exposes the metrics already implemented in the app.

## Alert principles

- Alert only on sustained conditions, not single-sample spikes.
- Prefer multi-window rules that reduce false positives.
- Map every alert to a specific operational action.
- Keep the first rule set small and high-confidence.
- Require a human-readable owner and escalation path before production use.

## Alert catalog

### 1) API 5xx rate alert

- Name: `api_5xx_rate_high`
- Condition:
  - `sum(rate(http_exceptions_total{status_class="5xx"}[5m])) / sum(rate(http_requests_total[5m])) > 0.02`
- Duration: 5 minutes
- Severity: SEV-1 if sustained above 5% for 10 minutes; SEV-2 otherwise
- Action:
  - Check the API dashboard for error spikes and route-level breakdown.
  - Review recent deploys, queue pressure, and DB connectivity.

### 2) API p95 latency alert

- Name: `api_p95_latency_high`
- Condition:
  - `histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le)) > 600`
- Duration: 10 minutes
- Severity: SEV-2
- Action:
  - Check p95 route view and error rate in the API dashboard.
  - Review queue backlog, DB latency, and cache health.

### 3) API error surge alert

- Name: `api_error_surge`
- Condition:
  - `sum(rate(http_exceptions_total{status_class=~"4xx|5xx"}[5m])) > 3 * avg_over_time(sum(rate(http_exceptions_total{status_class=~"4xx|5xx"}[5m]))[1h:5m])`
- Duration: 15 minutes
- Severity: SEV-2
- Action:
  - Validate whether traffic pattern changed or a recent code rollout caused a regression.

### 4) Redis degraded alert

- Name: `redis_degraded`
- Condition:
  - `queue_redis_degraded_alert == 1`
- Duration: 2 minutes
- Severity: SEV-1 if repeated longer than 5 minutes, otherwise SEV-2
- Action:
  - Check Redis connectivity and queue status.
  - Validate worker health and whether the queue is stuck.

### 5) Queue backlog growth alert

- Name: `queue_backlog_growth`
- Condition:
  - `queue_backlog_growth_alert == 1`
- Duration: 5 minutes
- Severity: SEV-2
- Action:
  - Review waiting, delayed, and active job counts.
  - Check for worker saturation and blocked downstream dependencies.

### 6) Repeated queue failures alert

- Name: `queue_repeat_failures`
- Condition:
  - `queue_repeated_failures_alert == 1`
- Duration: 10 minutes
- Severity: SEV-2
- Action:
  - Inspect failed jobs and retry behavior.
  - Verify whether the failing job class is transient or a real code regression.

### 7) Stale worker heartbeat alert

- Name: `queue_worker_stale`
- Condition:
  - `queue_worker_heartbeat_stale == 1`
- Duration: 2 minutes
- Severity: SEV-1
- Action:
  - Check worker count and queue activity.
  - Investigate whether workers have crashed, stalled, or disconnected from Redis.

### 8) Postgres database saturation alert

- Name: `db_latency_high`
- Condition:
  - `histogram_quantile(0.95, sum(rate(db_query_duration_ms_bucket[5m])) by (le)) > 250`
- Duration: 10 minutes
- Severity: SEV-2
- Action:
  - Review DB latency and query throughput.
  - Check for pool exhaustion, heavy reads, or blocked transactions.

### 9) Cache degradation alert

- Name: `cache_hit_ratio_low`
- Condition:
  - `cache_hit_ratio < 0.75`
- Duration: 15 minutes
- Severity: SEV-3
- Action:
  - Review cache backend health and fallback events.
  - Check whether the cache is under-provisioned or the workload pattern changed.

### 10) ECS/host saturation alert

- Name: `service_saturation_high`
- Condition:
  - container CPU or memory exceeds configured target threshold for sustained period
- Duration: 10 minutes
- Severity: SEV-2
- Action:
  - Inspect service task health and restarts.
  - Consider scaling or rollback if saturation is causing elevated latency.

## Alert thresholds summary

| Signal | Warning threshold | Critical threshold | Recommended duration |
| --- | --- | --- | --- |
| API 5xx rate | 2% | 5% | 5m / 10m |
| API p95 latency | 600ms | 1s | 10m |
| API error surge | 3x baseline | 5x baseline | 15m |
| Queue backlog growth | backlog alert gauge = 1 | backlog alert gauge = 1 | 5m |
| Queue repeated failures | failure alert gauge = 1 | failure alert gauge = 1 | 10m |
| Redis degraded | queue alert = 1 | queue alert = 1 | 2m |
| Stale worker heartbeat | heartbeat stale = 1 | heartbeat stale = 1 | 2m |
| DB p95 latency | 250ms | 500ms | 10m |
| Cache hit ratio | 0.75 | 0.60 | 15m |
| Service saturation | defined by infra target | defined by infra target | 10m |

## Recommended runbook ownership

- API incidents: backend owner
- Queue incidents: export or worker owner
- DB/cache incidents: platform or data owner
- Infra saturation: DevOps or platform owner

## Alert validation checklist

This item is complete after the rules are verified in non-production:

- [ ] alert fires on a simulated 5xx burst
- [ ] alert fires on sustained queue backlog growth
- [ ] alert fires on worker heartbeat stall
- [ ] alert fires on Redis degraded state
- [ ] alert is muted or resolved when the condition clears
- [ ] alert routing and owner metadata are attached

## Definition of done

This baseline alert set is complete when:

- the alert set covers API, queue, DB, cache, and infrastructure saturation,
- alerts are low-noise and actionable,
- the team has an owner and incident path for each rule,
- the alert rules have been validated in a non-production or staging test.

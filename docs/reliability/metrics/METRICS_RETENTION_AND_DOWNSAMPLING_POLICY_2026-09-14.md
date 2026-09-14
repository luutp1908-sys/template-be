# Metrics Retention and Downsampling Policy (BE)

Date: 2026-09-14
Scope: backend service metrics, traces, and operational dashboards for the BE service running on AWS with Prometheus-compatible scraping and local Jaeger for development.

## Purpose

This policy defines the default retention and downsampling rules for the backend observability pipeline so the team can balance troubleshooting depth, alert fidelity, and cost control.

The policy is intentionally pragmatic: it preserves enough data for debugging and incident response while aggressively reducing storage for low-value high-volume data.

## Principles

- Keep raw, high-resolution metrics for a short window for incident debugging.
- Preserve aggregated rollups long enough to support trend analysis and capacity planning.
- Downsample before storage if the metric is high-cardinality or high-volume.
- Favor alert quality over raw data volume.
- Keep the policy simple enough to operate without custom engineering work for each metric.

## Metric categories

### 1) High-value operational metrics

These are the metrics used in alarms and first-line triage dashboards:

- `http_requests_total`
- `http_exceptions_total`
- `http_request_duration_ms_bucket`
- `db_queries_total`
- `db_errors_total`
- `db_query_duration_ms_bucket`
- `cache_hits_total`
- `cache_misses_total`
- `queue_waiting_jobs`
- `queue_active_jobs`
- `queue_depth_total`
- `queue_failed_jobs`
- `queue_retryable_jobs`

Retention policy:
- raw series: 14 days at 1m or 5m resolution
- aggregated rollups: 90 days at 1h resolution

### 2) Health and alert state metrics

This includes boolean alert gauges and readiness outputs such as:

- `queue_backlog_growth_alert`
- `queue_repeated_failures_alert`
- `queue_redis_degraded_alert`
- `queue_worker_heartbeat_stale`
- `http_request_latency_ms_average`

Retention policy:
- raw series: 30 days
- aggregated rollups: 180 days

### 3) High-cardinality or route-level metrics

These are metrics that may include labels such as route, method, status code, or endpoint names. They are very useful for debugging but should be constrained by cardinality rules.

Retention policy:
- raw series: 7 days only
- aggregated rollups: 30 days at route-level summary only
- route details beyond the top offending endpoints should be excluded from long-term retention

## Recommended downsampling rules

### For Prometheus-compatible metrics

- Keep 1m scrape resolution for the last 7 days.
- Aggregate to 5m resolution for days 8-14.
- Aggregate to 1h resolution for days 15-90.
- For route and method metrics, keep only the top N routes by error or latency in long-retention windows.

### For histograms

- Retain bucket data for raw latency metrics for 14 days.
- Keep only p50/p90/p95/p99 summaries after day 14.
- Do not retain full bucket cardinality for route-level histograms beyond 7 days.

### For queue and DB metrics

- Preserve raw queue backlog and failure counts at 1m resolution for 14 days.
- Preserve hourly averages for 90 days to detect saturation trends and seasonality.
- Keep alert actions and state transitions for 180 days to support incident analysis.

## Specific retention windows

| Data type | Resolution | Retention |
| --- | --- | --- |
| API and queue metrics | 1m / 5m | 14 days |
| DB/cache metrics | 1m / 5m | 14 days |
| Alert/state gauges | 1m | 30 days |
| Aggregated trend data | 1h | 90 days |
| Route-level drilldown metrics | 1m | 7 days |
| Long-term trend summaries | 1h | 180 days |

## Trace retention

Trace retention is separate from metric retention:

- local dev / Jaeger: 3-7 days
- non-production: 7 days
- production: 14 days for hot traces, 30 days for sampled summary traces only

Sampling policy:
- keep 100% of errors and retries
- keep 10% of successful requests for normal traffic
- keep 100% of requests for known latency-sensitive routes when p95 exceeds threshold
- drop routine trace traffic once the service is healthy and the error budget remains stable

## Log retention

Logs should not be treated as the primary source of truth for metrics trends, but they still require a bounded retention rule:

- error logs: 30 days
- audit/security logs: 90 days
- debug and low-value success logs: 7 days with sampling

## Alerting implication

These retention rules support the policy that alerts are governed by short-term raw metrics and long-term aggregated trends:

- alert windows rely on raw 5m/15m metrics
- capacity review relies on hourly aggregates
- incident analysis relies on raw metrics and selected traces for the last 7-14 days

## Operational guidance

- If a route is repeatedly noisy, keep only the route-level top offenders in the retention window instead of all labels.
- If the backlog is healthy for a sustained period, reduce debug-level route detail to longer summary windows.
- Prefer strong alert logic on low-cardinality metrics over broad route-level retention.

## Definition of done for this policy

This item is complete when:

- raw metrics are retained long enough to investigate incidents,
- summarized dashboards remain available for trend review,
- high-cardinality metrics are not retained indefinitely,
- trace and log retention are aligned with incident response needs,
- the alert and dashboard workflows can operate without excessive storage cost.

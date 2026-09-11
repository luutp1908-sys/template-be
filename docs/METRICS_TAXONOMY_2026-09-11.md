# Metrics Taxonomy (BE)

Date: 2026-09-11  
Scope: Backend observability metrics contract for names, types, units, and labels.

## Purpose

Define a single source of truth for metric naming and semantics so dashboards, alerts, and incident analysis use consistent signals.

## Naming Rules

- Use lowercase snake_case names.
- Prefix by domain: `http_`, `queue_`, `db_`, `cache_`, `app_`.
- Counters end with `_total`.
- Durations use `_duration_ms`.
- Ratios are unitless values in `[0,1]` and end with `_ratio`.
- Bucketed values use suffix `_bucket` with explicit boundary labels.

## Metric Types

- Counter: monotonic increasing count.
- Gauge: current value at collection time.
- Histogram: bucketed distribution with count and sum.
- Summary Snapshot: computed percentile values from a bounded in-process set.

## Label Policy

Allowed labels (controlled cardinality):
- `service` (fixed value per app)
- `env` (`development`, `test`, `production`)
- `route` (templated route only, never raw URL with IDs)
- `method` (`GET`, `POST`, `PATCH`, `DELETE`, etc.)
- `status_class` (`2xx`, `3xx`, `4xx`, `5xx`)
- `status_code` (only when bounded and needed)
- `queue` (fixed queue names such as `pdf-export`)
- `operation` (bounded operation names)

Disallowed labels:
- `userId`, `email`, `requestId`, tokens, UUID IDs, raw search strings, file names.

## Implemented Metrics (Current)

These are currently exposed via the health metrics payload from [be/src/common/health/health.controller.ts](be/src/common/health/health.controller.ts).

| Metric name | Type | Unit | Labels | Source | Status |
| --- | --- | --- | --- | --- | --- |
| `http_requests_total` | Counter | requests | none | `requestsTotal` in metrics snapshot | implemented |
| `http_requests_by_status` | Counter map | requests | `status_code` (map key) | `requestsByStatus` | implemented |
| `http_error_ratio` | Gauge | ratio (0..1) | none | `errorRate` | implemented |
| `http_request_duration_ms_avg` | Gauge | ms | none | `requestLatencyMs.average` | implemented |
| `http_request_duration_ms_p50` | Gauge | ms | none | `requestLatencyMs.p50` | implemented |
| `http_request_duration_ms_p90` | Gauge | ms | none | `requestLatencyMs.p90` | implemented |
| `http_request_duration_ms_p95` | Gauge | ms | none | `requestLatencyMs.p95` | implemented |
| `http_request_duration_ms_min` | Gauge | ms | none | `requestLatencyMs.min` | implemented |
| `http_request_duration_ms_max` | Gauge | ms | none | `requestLatencyMs.max` | implemented |
| `http_request_duration_ms_bucket` | Histogram-style bucket map | requests | `le` (bucket upper bound) | `latencyBuckets` | implemented |
| `cache_hits_total` | Counter | operations | none | `cache.hits` | implemented |
| `cache_misses_total` | Counter | operations | none | `cache.misses` | implemented |
| `cache_sets_total` | Counter | operations | none | `cache.sets` | implemented |
| `cache_deletes_total` | Counter | operations | none | `cache.deletes` | implemented |
| `cache_fallback_events_total` | Counter | events | none | `cache.fallbackEvents` | implemented |
| `cache_backend_available` | Gauge | boolean (0 or 1) | none | `cache.backendAvailable` | implemented |
| `cache_bypass_enabled` | Gauge | boolean (0 or 1) | none | `cache.bypassEnabled` | implemented |
| `cache_force_refresh_enabled` | Gauge | boolean (0 or 1) | none | `cache.forceRefreshEnabled` | implemented |
| `cache_saturated` | Gauge | boolean (0 or 1) | none | `saturation.isSaturated` | implemented |

## Planned Canonical Metrics (Next)

### HTTP

| Metric name | Type | Unit | Labels | Status |
| --- | --- | --- | --- | --- |
| `http_requests_total` | Counter | requests | `route`, `method`, `status_class` | planned durable export |
| `http_request_duration_ms` | Histogram | ms | `route`, `method`, `status_class` | planned durable export |
| `http_exceptions_total` | Counter | exceptions | `code`, `status_class`, `operation` | planned durable export |

### Queue

| Metric name | Type | Unit | Labels | Status |
| --- | --- | --- | --- | --- |
| `queue_jobs_enqueued_total` | Counter | jobs | `queue`, `operation` | planned |
| `queue_jobs_processed_total` | Counter | jobs | `queue`, `operation` | planned |
| `queue_jobs_failed_total` | Counter | jobs | `queue`, `operation` | planned |
| `queue_jobs_retry_total` | Counter | retries | `queue`, `operation` | planned |
| `queue_backlog` | Gauge | jobs | `queue` | planned |
| `queue_processing_duration_ms` | Histogram | ms | `queue`, `operation` | planned |

### Database

| Metric name | Type | Unit | Labels | Status |
| --- | --- | --- | --- | --- |
| `db_queries_total` | Counter | queries | `operation`, `result` | planned |
| `db_query_duration_ms` | Histogram | ms | `operation` | planned |
| `db_connection_failures_total` | Counter | failures | `operation` | planned |

### Cache

| Metric name | Type | Unit | Labels | Status |
| --- | --- | --- | --- | --- |
| `cache_operations_total` | Counter | operations | `operation`, `result` | planned normalize |
| `cache_operation_duration_ms` | Histogram | ms | `operation` | planned |
| `cache_hit_ratio` | Gauge | ratio (0..1) | none | planned |

## Units and Conversions

- Durations are recorded in milliseconds.
- Booleans are exported as numeric gauges (`1=true`, `0=false`).
- Ratios remain fractional values in `[0,1]`.

## Collection and Export Expectations

- Current: JSON snapshot under `GET /api/v1/health/metrics`.
- Next: durable scrape-compatible metrics endpoint.
- Dashboard and alert queries must use the names in this document.

## Change Management

- Any metric rename requires updating:
  - this taxonomy
  - dashboard queries
  - alert rules
  - release notes
- New labels require cardinality review before merge.

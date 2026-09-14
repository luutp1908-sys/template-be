# DB and Cache Dashboard Spec (BE)

Date: 2026-09-14
Scope: operational dashboard for the backend database and Redis cache layers, using the Prometheus-compatible metrics exposed by the app and aligned to the BE metrics taxonomy.

## Purpose

Provide a single dashboard for database and cache triage with the minimum useful views needed to answer the key operational questions quickly:

- Is the database healthy and responsive?
- Are cache requests failing or falling back too often?
- Is the Redis backend saturating or degrading access patterns?
- Which DB or cache signals indicate a likely incident?

This is a documentation-level implementation of the DB/cache dashboard item in the observability plan. It does not add external monitoring infrastructure to the repo; it defines the exact panel layout and queries for the monitoring stack that consumes the metrics endpoint.

## Data source

- Prometheus-compatible scrape endpoint: `/api/metrics`
- Primary metrics used:
  - `db_queries_total`
  - `db_errors_total`
  - `db_query_duration_ms_bucket`
  - `db_query_duration_ms_sum`
  - `db_query_duration_ms_count`
  - `cache_hits_total`
  - `cache_misses_total`
  - `cache_fallback_events_total`
  - `cache_hit_ratio`

## Dashboard layout

### Row 1: Database health

#### Panel 1: DB query rate
- Title: Database query rate
- Type: Time series
- Query:
  - `sum(rate(db_queries_total[5m]))`
- Interpretation:
  - Confirms database throughput and workload level.

#### Panel 2: DB error rate
- Title: Database error rate
- Type: Time series
- Query:
  - `sum(rate(db_queries_total{result="error"}[5m])) / sum(rate(db_queries_total[5m]))`
- Interpretation:
  - Fast signal for DB instability or connectivity issues.

#### Panel 3: DB error count
- Title: Database errors
- Type: Time series
- Query:
  - `db_errors_total`
- Interpretation:
  - Tracks cumulative DB failures and helps identify sustained degradation.

### Row 2: Database latency

#### Panel 4: DB p95 latency
- Title: DB p95 query latency
- Type: Time series
- Query:
  - `histogram_quantile(0.95, sum(rate(db_query_duration_ms_bucket[5m])) by (le))`
- Interpretation:
  - Indicates whether latency is trending upward and affecting app responsiveness.

#### Panel 5: DB latency distribution
- Title: DB latency percentiles
- Type: Time series
- Query:
  - `histogram_quantile(0.50, sum(rate(db_query_duration_ms_bucket[5m])) by (le))`
  - `histogram_quantile(0.90, sum(rate(db_query_duration_ms_bucket[5m])) by (le))`
  - `histogram_quantile(0.95, sum(rate(db_query_duration_ms_bucket[5m])) by (le))`
- Interpretation:
  - Differentiates a broad latency shift from a tail-latency issue.

### Row 3: Cache behavior

#### Panel 6: Cache hit ratio
- Title: Cache hit ratio
- Type: Time series
- Query:
  - `cache_hit_ratio`
- Interpretation:
  - Primary indicator of whether cache is providing value or is falling behind demand.

#### Panel 7: Cache hits and misses
- Title: Cache hits vs misses
- Type: Time series
- Query:
  - `sum(rate(cache_hits_total[5m]))`
  - `sum(rate(cache_misses_total[5m]))`
- Interpretation:
  - Helps distinguish between workload shifts and genuine cache degradation.

#### Panel 8: Cache fallback events
- Title: Cache fallback events
- Type: Time series
- Query:
  - `sum(rate(cache_fallback_events_total[5m]))`
- Interpretation:
  - Indicates that cache-backed data is falling back to slower or less reliable paths.

### Row 4: Cross-service saturation and incident signals

#### Panel 9: DB query latency by bucket
- Title: Query latency buckets
- Type: Stacked bar or time series
- Query:
  - `sum(rate(db_query_duration_ms_bucket{le="10"}[5m]))`
  - `sum(rate(db_query_duration_ms_bucket{le="50"}[5m]))`
  - `sum(rate(db_query_duration_ms_bucket{le="100"}[5m]))`
  - `sum(rate(db_query_duration_ms_bucket{le="250"}[5m]))`
  - `sum(rate(db_query_duration_ms_bucket{le="1000"}[5m]))`
- Interpretation:
  - Shows where the latency tail is concentrated and whether the database is saturating.

#### Panel 10: Cache health summary
- Title: Cache health summary
- Type: Stat or gauge panel
- Query:
  - `cache_hit_ratio`
  - `sum(cache_fallback_events_total)`
- Interpretation:
  - Gives a quick operational summary of whether cache is healthy enough to absorb load.

## Alerting recommendations

Use these panels to trigger the first alert set:

- `db_error_rate > 5% for 5m`
- `db_query_latency_p95 > 250ms for 10m`
- `cache_hit_ratio < 0.75 for 15m`
- `sum(rate(cache_fallback_events_total[5m])) > 0 for 10m`
- `db_queries_total{result="error"} > 0 for 5m`

## Dashboard health criteria

This dashboard is considered complete when:

- query rate, latency, and error rate are visible without drilldown,
- cache hit ratio and fallback events are visible without drilldown,
- the database and Redis dependency state can be triaged in under a minute during an incident,
- it clearly distinguishes latency spikes from true DB/cache failure conditions.

## Notes

This is intentionally scoped to the Prisma/Postgres and Redis layers already instrumented in the backend. It stays within the learning and implementation bounds of the BE observability work without introducing a full external monitoring deployment into the repo.

# API Dashboard Spec (BE)

Date: 2026-09-13
Scope: operational dashboard for the backend API service, using the Prometheus-compatible metrics exposed by the app and aligned to the BE metrics taxonomy.

## Purpose

Provide a single dashboard for API triage with the minimum useful views needed to answer the three operational questions quickly:

- Is the service healthy?
- Are requests failing or slowing down?
- Which routes or operations need attention?

This is a documentation-level implementation of the dashboard item in the observability plan. It does not add external monitoring infrastructure to the repo; it defines the exact panel layout and queries for the monitoring stack that consumes the metrics endpoint.

## Data source

- Prometheus-compatible scrape endpoint: `/api/metrics`
- Primary metrics used:
  - `http_requests_total`
  - `http_exceptions_total`
  - `http_request_duration_ms_bucket`
  - `http_request_duration_ms_sum`
  - `http_request_duration_ms_count`

## Dashboard layout

### Row 1: Service health

#### Panel 1: Request rate
- Title: API request rate
- Type: Time series
- Query:
  - `sum(rate(http_requests_total[5m]))`
- Interpretation:
  - Confirms traffic volume and normal baseline.

#### Panel 2: Error rate
- Title: API error rate
- Type: Time series
- Query:
  - `sum(rate(http_exceptions_total{status_class=~"4xx|5xx"}[5m])) / sum(rate(http_requests_total[5m]))`
- Interpretation:
  - This is the best top-level health signal when the service is under load.

#### Panel 3: 5xx rate
- Title: 5xx rate
- Type: Time series
- Query:
  - `sum(rate(http_exceptions_total{status_class="5xx"}[5m])) / sum(rate(http_requests_total[5m]))`
- Interpretation:
  - Fast indicator for incidents needing escalation.

### Row 2: Latency

#### Panel 4: p95 latency
- Title: API p95 latency
- Type: Time series
- Query:
  - `histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le))`
- Interpretation:
  - Tracks user-facing latency and degradation trends.

#### Panel 5: p50 / p90 / p95 latency comparison
- Title: Latency percentiles
- Type: Time series
- Query:
  - `histogram_quantile(0.50, sum(rate(http_request_duration_ms_bucket[5m])) by (le))`
  - `histogram_quantile(0.90, sum(rate(http_request_duration_ms_bucket[5m])) by (le))`
  - `histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le))`
- Interpretation:
  - Shows whether latency is tail-heavy or broadly increasing.

### Row 3: Error breakdown

#### Panel 6: Exceptions by status class
- Title: Exceptions by status class
- Type: Bar or stacked time series
- Query:
  - `sum(rate(http_exceptions_total[5m])) by (status_class)`
- Interpretation:
  - Differentiates auth, validation, and server-side errors.

#### Panel 7: Exceptions by status code
- Title: Top HTTP status codes
- Type: Table or time series
- Query:
  - `sum(rate(http_exceptions_total[5m])) by (status_code)`
- Interpretation:
  - Highlights precise failure modes once status code-level metrics are needed.

### Row 4: Route-level drilldown (recommended operational view)

This section is ready for the next labeling step once route and method labels are added to the scrape series.

#### Panel 8: Top failing routes
- Title: Top failing routes
- Type: Table
- Query:
  - `sum(rate(http_exceptions_total[5m])) by (route, method) > 0`
- Interpretation:
  - Focuses attention on the highest-impact endpoints.

#### Panel 9: Slowest routes
- Title: p95 latency by route
- Type: Time series or table
- Query:
  - `histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (route, method, le))`
- Interpretation:
  - Identifies the endpoints contributing to the broad latency tail.

## Alerting recommendations

Use these panels to trigger the first alert set:

- `API 5xx rate > 2% for 5m`
- `API p95 latency > 600ms for 10m`
- `Error spike > 3x baseline over 15m`
- `Sustained request rate drop with non-zero errors`

## Dashboard health criteria

This dashboard is considered complete when:

- request rate and error rate remain visible in the first row,
- p95 latency is directly visible without drilldown,
- status class breakdown is visible for triage,
- route-level drilldown is available once route labels are enabled.

## Notes

This is intentionally scoped to the backend API and the metrics already exposed by the app. It stays within the learning and implementation bounds of the BE observability work without introducing a full external Grafana deployment or vendor-specific stack into the repo.

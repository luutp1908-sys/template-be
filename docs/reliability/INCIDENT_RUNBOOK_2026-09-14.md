# Incident Runbook (BE)

Date: 2026-09-14
Scope: operational response to API, queue, DB, cache, and infrastructure alerts for the BE service.

## Purpose

This runbook provides the first-pass incident response flow for the alert baseline. It is designed for fast triage in a production-like environment and to reduce mean time to identify and mitigate incidents.

The runbook intentionally focuses on the alert set already defined in the observability docs. Every alert maps to a likely root cause, a triage sequence, and a recommended mitigation.

## Incident response model

### Severity levels

- SEV-1: critical outage or severe degradation affecting customers or critical background jobs
- SEV-2: elevated error or latency affecting a meaningful portion of requests or job throughput
- SEV-3: degraded but recoverable condition that is monitored and should be addressed quickly

### Response ownership

- API incidents: backend owner
- Queue incidents: export worker owner
- DB/cache incidents: platform/data owner
- Infra incidents: DevOps/platform owner

## Common first-response workflow

1. Confirm the alert and time window.
2. Pull the dashboard and metrics endpoint for the affected signal.
3. Check whether the issue is isolated to one dependency or broad across the service.
4. Review recent deploy activity, queue pressure, Redis status, and DB health.
5. Trace the request or job ID through logs and spans.
6. Apply the smallest safe mitigation.
7. Record findings and follow-up actions.

## Alert-specific runbooks

### 1) API 5xx rate high

Symptoms:
- elevated 5xx rate on the API
- route-level spike visible in dashboard or logs

Checks:
- inspect the API dashboard error rate and route breakdown
- review recent deploy or config change
- verify DB and Redis health
- look for queue saturation and worker backlog

Likely causes:
- dependency outage
- bug introduced in a recent deploy
- DB connection saturation
- queue backlog causing request timeout or downstream failure

Mitigation:
- roll back the most recent deploy if the issue is newly introduced
- reduce queue pressure or pause heavy exports if the queue is overloaded
- verify DB connectivity and Redis connectivity before restarting app workers

### 2) API p95 latency high

Symptoms:
- user-facing latency increased for a sustained period
- p95 above 600ms or the configured threshold

Checks:
- compare p50/p90/p95 latency
- inspect route-level latency and error rate
- review DB and cache metrics
- review queue backlog and worker stale state

Likely causes:
- queue congestion
- underlying DB latency
- Redis degradation or cache misses
- CPU or memory saturation

Mitigation:
- scale horizontally if the app is resource-constrained
- pause non-critical background jobs to reduce queue pressure
- verify DB lock contention, slow queries, or failing cache operations

### 3) Redis degraded

Symptoms:
- queue alerts show degraded state
- worker health becomes stale or disconnected

Checks:
- confirm Redis availability and connection count
- inspect queue waiting/active/delayed counts
- look for worker heartbeat stale state

Likely causes:
- Redis unavailable or overloaded
- worker connection loss
- queue stuck behind slow job processing

Mitigation:
- restore Redis availability or fail over to a healthy instance
- restart queue workers if they are disconnected
- temporarily pause or reroute non-critical exports until healthy again

### 4) Queue backlog growth

Symptoms:
- waiting jobs keep increasing
- queue depth exceeds alert threshold

Checks:
- inspect waiting, delayed, active, and total queue depth
- determine if workers are healthy and processing jobs
- review job retry patterns and failure counts

Likely causes:
- worker crash or stalls
- downstream application latency
- job failure loop or repeated retry storm
- dependency slowdown causing job processing to lag

Mitigation:
- restart stalled workers if clear and safe
- pause or retry low-priority jobs
- fix the root cause of the slow processor if one job type is blocking the queue

### 5) Queue repeated failures

Symptoms:
- failed jobs count increases and stays elevated
- repeated failed jobs are being retried

Checks:
- inspect failure logs and job error payloads
- correlate with recent code changes or payload changes
- review Redis health and database health

Likely causes:
- code bug in export processing
- invalid payload or external dependency issue
- resource exhaustion or transient dependency failures

Mitigation:
- stop or quarantine the failing job type temporarily
- rollback the release if the failure pattern is newly introduced
- fix the bad payload or dependency contract before resuming automatic retries

### 6) Stale worker heartbeat

Symptoms:
- worker heartbeat stale state remains true
- queue processing stops or slows dramatically

Checks:
- inspect worker count and last heartbeat value
- confirm worker process is still alive and connected to Redis
- check if the worker is blocked on a hanging job

Likely causes:
- worker crash or OOM
- Redis connectivity interruption
- job deadlock or long-running stuck process

Mitigation:
- restart the worker container or process
- clear or recover stuck job states if needed
- verify Redis connectivity before resuming heavy processing

### 7) DB latency high

Symptoms:
- DB p95 latency exceeds threshold
- app response latency rises with DB pressure

Checks:
- inspect DB query histogram and query rate
- check DB connection pressure and lock contention
- correlate with queue activity or slow export jobs

Likely causes:
- slow query or missing index
- increased concurrency or backup/recovery activity
- connection pool exhaustion

Mitigation:
- reduce concurrent load or pause heavy operations
- address the slow query or DB resource issue
- if needed, scale DB compute or connection pool capacity

### 8) Cache hit ratio low

Symptoms:
- cache hit ratio falls below threshold for sustained period
- fallback events rise sharply

Checks:
- review cache hit ratio and fallback counts
- check Redis health and workload pattern
- inspect whether a code path bypassed cache or a recent change increased misses

Likely causes:
- Redis degraded or unavailable
- cache key churn
- workload change or cold cache

Mitigation:
- restore Redis or cache backend health
- warm critical entries if cache was cold
- reduce cache churn caused by high-cardinality keys or repeated misses

### 9) Service saturation high

Symptoms:
- CPU or memory usage is above target threshold
- app latency or restarts increase

Checks:
- review host or container CPU/memory utilization
- inspect restarts or OOM logs
- confirm whether saturation aligns with traffic spike or queue load

Likely causes:
- resource exhaustion or runaway process
- queue overload
- memory leak or unbounded retry loop

Mitigation:
- scale out or restart the affected process
- reduce enqueue rate or pause non-critical background jobs
- inspect memory usage and error logs for runaway loops

## Escalation matrix

| Alert | Primary owner | Secondary owner | Escalate when |
| --- | --- | --- | --- |
| API 5xx high | Backend owner | DevOps | customer-impacting or sustained beyond 10m |
| API p95 latency high | Backend owner | DevOps | latency exceeds 1s or persists past 15m |
| Redis degraded | Platform owner | Backend owner | outage exceeds 5m |
| Queue backlog growth | Export worker owner | Backend owner | backlog keeps rising or workers stall |
| Repeated queue failures | Export worker owner | Backend owner | failures persist after retry policy |
| Stale worker heartbeat | Platform owner | Backend owner | worker remains stale after restart |
| DB latency high | Data/platform owner | Backend owner | p95 exceeds 500ms or DB errors rise |
| Cache hit ratio low | Platform owner | Backend owner | cache fallback triggers sustained user latency |
| Service saturation high | DevOps/platform owner | Backend owner | saturation leads to restart or degraded response |

## Communication template

Use this short format when escalating:

- Incident: [alert name]
- Severity: [SEV-1/SEV-2/SEV-3]
- Started at: [time]
- Current signal: [error rate, latency, backlog, etc.]
- Impact: [customer or system impact]
- Likely cause: [DB, Redis, queue, app, infra]
- Mitigation taken: [rollback, scale, worker restart, pause queue]
- Next check: [resource health, trace, logs, queue depth]

## After-action review

Every incident should end with:

- root cause summary
- alert rule accuracy review
- whether the alert was noisy, delayed, or missed
- any threshold tuning or runbook changes needed
- follow-up tasks to reduce recurrence

## Definition of done

This runbook is complete when:

- each baseline alert has a clear triage path,
- owners and escalation paths are defined,
- the team has a standard communication format,
- the workflow is validated by at least one live or simulated incident drill.

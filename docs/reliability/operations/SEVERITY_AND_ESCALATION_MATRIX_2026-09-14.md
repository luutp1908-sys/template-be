# Severity and Escalation Matrix (BE)

Date: 2026-09-14
Scope: incident severity model and escalation ownership for the BE platform, including API, queue, cache, database, and infrastructure signals.

## Purpose

This document defines the service-level severity model and escalation ownership for alerts already described in the alert baseline and runbook. It provides a simple decision framework so the team can respond consistently and route incidents to the right owner with minimal ambiguity.

## Severity definitions

### SEV-1: critical outage

Definition:
- customer-visible outage or severe degradation of the API
- critical export or queue processing is blocked for a meaningful production use case
- data loss or integrity risk is likely
- requires immediate incident response and executive awareness

Examples:
- API is failing with sustained 5xx rate above 5%
- Redis or Postgres is unavailable enough to block the app or queue
- worker backlog is rising uncontrollably and jobs are not processing
- host or container saturation is causing repeated restarts or total service instability

Expected response:
- immediate incident bridge
- backend owner and platform owner engaged
- incident commander assigned
- mitigation or rollback initiated within 15 minutes

### SEV-2: major degradation

Definition:
- impact is measurable and operationally important but not fully customer-blocking
- latency or queue delay is elevated but recoverable
- a dependency is degraded but the service continues to function

Examples:
- API p95 latency above threshold for 10 minutes
- queue failure rate or backlog growth persists
- DB p95 latency is high but the app remains available
- cache hit ratio falls materially and performance is degraded

Expected response:
- owner notified within 10 minutes
- mitigation prioritized during the next operational window
- status update at least every 30 minutes until stable

### SEV-3: soft degradation or warning

Definition:
- condition is degraded but not currently impacting critical users or jobs
- issue is actionable but not urgent
- usually resolved by tuning, scaling, or targeted investigation

Examples:
- cache hit ratio is below target but app remains healthy
- minor queue delay that remains within a recoverable window
- early warning signal before a more serious issue develops

Expected response:
- owner acknowledgment within 1 hour
- planned follow-up and tuning review
- no incident bridge unless conditions worsen

## Ownership model

### Backend application owner

Primary owner for:
- API 5xx errors
- API latency spikes
- request-level regressions
- app-level dependency misuse or request failures

Secondary support for:
- queue backlog caused by application code paths
- DB performance issues tied to application queries

### Export / queue owner

Primary owner for:
- queue backlog growth
- repeated queue failures
- stale workers
- export performance regressions

Secondary support for:
- Redis degraded state when the queue is the primary dependency under stress

### Platform / DevOps owner

Primary owner for:
- Redis faults
- container saturation and restarts
- ECS/infra resource pressure
- host-level performance or dependency outages

Secondary support for:
- application-level optimization after infra root cause is ruled out

### Data / database owner

Primary owner for:
- Postgres latency or saturation
- DB connection pressure or lock contention
- persistent data-layer degradation

Secondary support for:
- query slowdowns caused by app-level misuse or change in workload pattern

## Escalation policy

### Automatic escalation triggers

Escalate to the secondary owner immediately when:
- the issue persists beyond 2x the warning duration
- the dependency chain is cross-cutting and not isolated to a single service
- either the queue or DB becomes degraded and the app is impacted
- the service is still degraded after a rollback or restart attempt

### Escalation ladder

1. Primary owner acknowledges the alert.
2. If unresolved or worsening, notify the secondary owner.
3. If the issue is SEV-1 or crosses customer impact, create the incident bridge and assign incident commander.
4. If the issue affects multiple subsystems, involve platform and backend owners together.
5. If there is a production data risk, escalate to the platform/data lead and engineering leadership.

## Alert-to-severity mapping

| Alert | Default severity | Primary owner | Secondary owner |
| --- | --- | --- | --- |
| API 5xx rate high | SEV-1 or SEV-2 | Backend | Platform |
| API p95 latency high | SEV-2 | Backend | Platform |
| API error surge | SEV-2 | Backend | Platform |
| Redis degraded | SEV-1 or SEV-2 | Platform | Backend |
| Queue backlog growth | SEV-2 | Export / Queue | Backend |
| Queue repeated failures | SEV-2 | Export / Queue | Backend |
| Stale worker heartbeat | SEV-1 | Export / Queue | Platform |
| DB latency high | SEV-2 | Data | Backend |
| Cache hit ratio low | SEV-3 | Platform | Backend |
| Service saturation high | SEV-2 | Platform | Backend |

## Communication and response expectations

- SEV-1: immediate response, status updates every 15 minutes until stabilized
- SEV-2: response within 10 minutes, updates every 30 minutes
- SEV-3: response within 1 hour, follow-up scheduled in the daily reliability review

## Operational checklist for each incident

1. Confirm alert condition and severity.
2. Assign primary owner.
3. Check the dashboards and relevant metrics.
4. Determine if the issue is app, queue, cache, DB, or infra.
5. Identify quick mitigation.
6. Escalate if the issue persists or expands.
7. Record root cause and close action items after recovery.

## Definition of done

This matrix is complete when:

- each baseline alert has a primary owner,
- each alert has a clear escalation path,
- every SEV level has a response expectation,
- the runbook and this matrix align on ownership and incident handling.

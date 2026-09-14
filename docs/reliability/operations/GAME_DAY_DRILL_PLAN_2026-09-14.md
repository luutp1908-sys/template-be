# Game Day Drill Plan (BE)

Date: 2026-09-14
Scope: production-like simulation of a high-severity incident affecting the BE API, queue, and dependency stack.

## Purpose

This plan turns the reliability work into a practised incident response exercise. The goal is to verify that the app, alerts, dashboards, and runbook work together under stress and that the team can detect, triage, and recover from a meaningful dependency failure.

The exercise is intentionally designed around a realistic failure that touches the metrics, tracing, logs, queue, and alerting path already built in this project.

## Drill objectives

- validate that alerts fire within the expected time window
- verify that the team knows which owner to call
- confirm the request ID and trace correlation path works across app and queue boundaries
- test whether the dashboard and runbook provide enough information to triage quickly
- confirm that mitigation and rollback steps are clear and safe

## Exercise scenario

### Primary scenario: Redis and queue degradation with API latency increase

The team simulates an incident in which Redis becomes degraded and the export queue begins piling up, while the API starts showing elevated latency and a small 5xx burst.

Stimulus:
- temporarily stop or simulate degraded Redis access
- increase queue backlog by enqueueing a burst of export jobs
- slow one downstream dependency or trigger a synthetic latency condition in the API

Expected system behavior:
- Redis degraded alert fires
- queue backlog growth alert fires
- stale worker alert may fire if workers stop heartbeating
- API p95 latency increases and a 5xx alert may fire if the condition remains sustained

## Roles

- Incident commander: owns the timeline and decision-making
- App owner: handles API and app-level triage
- Queue owner: handles worker, backlog, and BullMQ investigation
- Platform owner: checks Redis, infrastructure, and saturation signals
- Scribe: records timestamps, signals, actions, and conclusions

## Drill flow

### 1) Start with a healthy baseline

Before the incident:
- confirm the app is healthy
- confirm logs are emitting structured events and trace metadata
- confirm the dashboards are showing the normal baseline
- confirm the metrics endpoint is accessible

### 2) Trigger the simulated incident

Use a controlled sequence:

1. degrade Redis connection or queue health
2. enqueue a backlog of export jobs
3. trigger a temporary API latency spike or synthetic server failure
4. maintain the condition for 5-15 minutes

### 3) Observe detection

During the event, the team should:

- watch for queue and Redis alerts
- verify the logs include request IDs and trace metadata
- check the API dashboard for request rate, 5xx rate, and latency
- check whether the queue dashboard reflects backlog growth and failure trend

### 4) Triage using the runbook

The team should follow the runbook sequence and note:

- which alert fired first
- what the primary owner concluded
- whether the escalation matrix was correct
- which dashboard or log view was most useful
- whether the mitigation chosen was safe and effective

### 5) Mitigate

Recommended mitigations for this scenario:

- pause non-critical export jobs if queue depth continues rising
- restart the affected worker if stale heartbeat is confirmed
- restore Redis connectivity or fail over if available
- rollback the latest deploy if a code regression is likely
- reduce API load if saturation is a contributor

### 6) Capture findings

At the end of the drill, record:

- total time to detection
- time to vendor or dependency diagnosis
- time to mitigation
- decision quality and runbook usability
- any alert tuning required
- any missing docs or confusion in the operational path

## Success criteria

The drill is successful when:

- the incident is detected within the expected alert threshold window
- the team reaches the correct owner quickly
- the runbook leads to the right mitigation without large ambiguity
- trace/log correlation helps identify the root cause
- the team can explain the incident with dashboard evidence

## Debrief template

Use the following structure in the after-action review:

- What happened?
- Which alert fired first, and why?
- What signal turned out to be the most useful?
- Was the owner escalation correct and timely?
- What mitigation worked?
- What was missing from the runbook or docs?
- What should be tuned or improved?

## Follow-up actions

Any issues discovered during the drill should become concrete action items, such as:

- adjusting alert thresholds or windows
- clarifying ownership of a queue or infrastructure alert
- improving the dashboard for a missing signal
- updating the runbook for a neglected failure path
- changing trace sampling or log volume guardrails

## Definition of done

This drill is complete when:

- the event is executed in a non-production environment,
- findings are captured in a short debrief,
- each follow-up action is mapped to a concrete owner,
- the runbook and alerting setup are updated with the lessons learned.

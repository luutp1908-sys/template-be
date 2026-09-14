# Post-Drill Actions and Runbook Update (BE)

Date: 2026-09-14
Scope: follow-up actions from the observability game day and the required runbook updates to keep the reliability process current.

## Purpose

This document captures the required follow-up after a game day drill. The objective is to turn findings into concrete changes so the alerting, dashboards, ownership model, and runbook remain accurate and trustworthy.

A game day is only useful if the issues found are converted into action items and the runbook is updated to reflect what was learnable in practice.

## Required post-drill workflow

### 1) Capture the findings

During the debrief, record:

- which alert fired first
- how long detection took
- whether the alert was noisy, delayed, or missed
- whether the team reached the correct owner quickly
- which dashboard or log source was most helpful
- which mitigation worked and which did not
- whether the runbook steps were clear or ambiguous

### 2) Classify the findings

Each issue should be categorized as one of:

- alert tuning
- dashboard gap
- runbook gap
- ownership ambiguity
- missing instrumentation
- process/tooling problem

### 3) Convert findings to action items

Each action item should include:

- owner
- target date
- priority
- root cause summary
- expected change
- validation method

### 4) Update the runbook

Any runbook changes should be recorded in the main runbook, not just commentary from the debrief. Minimum updates:

- clarify ambiguous triage steps
- add missing escalation path if ownership was unclear
- add a note about the dashboard that was most useful during the incident
- add precise mitigation steps that were tested during the drill
- update the alert notes if the false-positive or false-negative pattern was discovered

## Sample follow-up template

Use the following template for each action item:

- Issue: [brief statement]
- Category: [alert tuning / dashboard / runbook / ownership / instrumentation / process]
- Owner: [person or team]
- Severity: [SEV-1 / SEV-2 / SEV-3]
- Root cause: [short summary]
- Planned change: [what will be updated]
- Validation: [how the change will be proven]
- Due date: [date]

## Typical outcomes from the BE observability drill

### Alert tuning outcomes

Possible updates:

- extend the alert duration window to reduce noise
- increase the threshold for a noisy metric
- add a second condition to prevent false positives
- refine the alert for high-cardinality data or transient spikes

### Dashboard improvements

Possible updates:

- add a route-level panel for the exact failing API path
- add a queue depth trend panel with a stronger visual threshold
- add a worker health summary panel to the queue dashboard
- add a DB latency bucket breakdown for faster triage

### Runbook improvements

Possible updates:

- clarify backup plan if Redis is degraded versus unavailable
- add explicit steps for when to pause the queue versus rollback the app
- add a field for which metric or log source to inspect first
- specify the exact escalation time and threshold for each severity level

### Ownership clarifications

Possible updates:

- set a default owner on the alert definition
- add a secondary owner in the notification path
- confirm the review cadence for cross-team incidents
- assign service-level accountability for queue and infra issues

## Closure rule

This item is considered complete when:

- the debrief is captured,
- the follow-up actions are assigned,
- the runbook is updated with the verified changes,
- the changes are reviewed in the next reliability check-in or handoff.

## Definition of done

The final closure step is done when all follow-up items from the game day are triaged and the runbook reflects the actual operational knowledge gathered from the drill.

# Queue Reliability Plan (BE)

Date: 2026-09-11
Scope: BullMQ-backed export queue in `be`, with emphasis on enqueue safety, worker resilience, job lifecycle correctness, and operational visibility.

## Goal

Make the `pdf-export` queue reliable enough that job creation, processing, retry behavior, and recovery from worker or Redis failures are predictable, observable, and safe.

## Current State

Already implemented:
- Queue root module wired through BullMQ and Redis.
- Queue enablement controlled by `QUEUE_ENABLED`.
- Readiness check verifies Redis connectivity, queue access, and worker heartbeat.
- Export worker emits heartbeat and basic structured logs.
- Export jobs persist status transitions through the export repository.

Current reliability gaps:
- Enqueue path does not explicitly defend against unhealthy queue state before `add`.
- No retry or backoff policy is declared for export jobs.
- No dead-letter or failed-job triage flow is defined.
- No explicit idempotency guard exists for duplicate or replayed export jobs.
- Output is still local filesystem based, which is weak for restart recovery.
- Queue metrics and alerts are not yet published in durable monitoring.

## Success Criteria

- Export job creation fails fast with a clear error when the queue is required but unavailable.
- Worker crashes or transient Redis failures do not silently lose jobs.
- Duplicate job execution does not corrupt export state or generate conflicting outputs.
- Failed jobs are retried with bounded backoff and leave actionable failure records.
- Operators can answer: queue healthy, backlog growing, retries spiking, worker stale, or jobs stuck.

## Core Questions

1. Are jobs enqueued only when the queue is healthy enough?
2. What happens if the worker crashes after a job is accepted?
3. Can the same export job be processed more than once without bad side effects?
4. How are failed or stuck jobs surfaced and recovered?
5. What evidence exists when Redis or the worker becomes degraded?

## Execution Plan

### Phase 1: Enqueue Safety

Objective: make job submission explicit and safe under queue degradation.

Tasks:
- [x] Add a queue submission guard in `ExportService` before `exportQueue.add(...)`.
- [x] Define behavior when queue is disabled or unhealthy:
  - fail request with a clear service-unavailable style error when exports require queue
  - keep mock-mode bypass behavior explicit and documented
- [x] Add structured logs for enqueue attempt, enqueue success, and enqueue failure.
- [x] Record enqueue operation names consistently with `module=queue` and `operation=export.enqueue`.
- [x] Add focused tests for queue unavailable and queue disabled behavior.

Exit criteria:
- Job creation does not pretend success if the queue cannot accept work.

### Phase 2: Retry and Failure Policy

Objective: make transient failures recover automatically and permanent failures diagnosable.

Tasks:
- [x] Define BullMQ job options for:
  - attempts
  - backoff strategy
  - remove-on-complete policy
  - retain-on-fail policy
- [x] Distinguish retryable failures from terminal failures in the worker.
- [x] Persist failure reason and attempt count in export job state where useful.
- [x] Add worker logs for retry, terminal failure, and exhaustion of attempts.
- [x] Add tests for transient failure then success, and repeated failure until terminal state.

Exit criteria:
- Temporary worker errors cause bounded retries instead of silent job loss.

### Phase 3: Idempotency and State Safety

Objective: make repeat processing safe.

Tasks:
- [x] Define idempotency rules for export jobs by `exportId`.
- [x] Prevent duplicate processing from overwriting a completed export unexpectedly.
- [x] Guard status transitions so invalid state changes are rejected or ignored safely.
- [x] Ensure repeated completion writes keep the same logical output contract.
- [x] Add tests for duplicate queue delivery and replayed worker execution.

Exit criteria:
- Reprocessing the same job cannot corrupt status or produce conflicting final state.

### Phase 4: Recovery and Durability

Objective: improve behavior across process restarts and infrastructure incidents.

Tasks:
- [x] Review BullMQ stalled-job behavior and document chosen settings.
- [ ] Add recovery expectations for worker restart during processing.
- [ ] Move export output from local `tmp/exports` to durable storage when ready.
- [ ] Define cleanup policy for completed and failed job artifacts.
- [ ] Document manual recovery steps for stuck or orphaned export records.

Exit criteria:
- Restart scenarios and stuck-job handling have explicit operational behavior.

### Phase 5: Observability and Operations

Objective: make queue failure visible quickly.

Tasks:
- [ ] Publish queue metrics taxonomy entries for enqueue, backlog, retries, failures, and processing duration.
- [ ] Expose queue backlog and failure signals through durable metrics export.
- [ ] Add alerts for:
  - worker heartbeat stale
  - repeated queue job failures
  - backlog growth
  - Redis connectivity degradation
- [ ] Document queue incident runbook:
  - job stuck in waiting
  - job stuck in active
  - worker stale
  - Redis outage
- [ ] Add one failure drill checklist for local learning.

Exit criteria:
- Queue incidents are visible through metrics, readiness, logs, and a runbook.

## Implementation Checklist

### Code Paths
- [x] `be/src/export/export.service.ts`
- [x] `be/src/export/export.processor.ts`
- [ ] `be/src/queue/queue.module.ts`
- [ ] `be/src/queue/queue-health.service.ts`
- [x] `be/src/export/export.repository.prisma.ts`
- [ ] `be/src/common/health/health.controller.ts`

### Tests
- [x] enqueue fails cleanly when Redis/queue is unavailable
- [x] queue disabled behavior is explicit and tested
- [x] retry policy behaves as configured
- [x] duplicate processing is idempotent
- [ ] stalled worker or stale heartbeat is surfaced

### Documentation
- [ ] retry/backoff policy documented
- [ ] failure-state meanings documented
- [ ] manual recovery steps documented
- [ ] alert thresholds documented

## Suggested Order

1. Enqueue safety in `ExportService`
2. Retry and backoff policy
3. Idempotent worker state transitions
4. Queue metrics and alerts
5. Durable output storage follow-up

## Notes

- The current readiness check is a good start, but readiness alone does not guarantee enqueue safety or idempotent processing.
- The current local filesystem output path is acceptable for learning, but not strong enough for robust recovery semantics.
- Queue reliability should be improved without widening scope into a full export rendering redesign unless durable storage requires it.
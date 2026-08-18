# PDF Export Implementation Plan

## Goal
Implement async PDF export from the editor with a Download button next to Save Draft. The frontend sends unsaved canvas data, backend creates an export job, frontend polls status, and downloads `template-name.pdf` when complete.

## Phases
1. API contract and flow definition (this step)
2. Backend persistence and queue orchestration
3. PDF generation strategy
4. Frontend editor integration
5. Verification and hardening

## Step 1 Scope (Completed in code for review)
- Define export endpoints under `export/jobs`:
  - `POST /api/v1/export/jobs` create export job
  - `GET /api/v1/export/jobs/:id` check export status
  - `GET /api/v1/export/jobs/:id/download` download exported file (contract endpoint; returns conflict until completed)
- Define DTO/entity contracts for async export jobs:
  - request payload for unsaved canvas pages + context
  - response payload for job status, file metadata, and error details
- Add ownership-aware access in service/repository flow using current user id.

## Confirmed Product Decisions
- Export mode: asynchronous job + status polling
- Export source: include unsaved FE canvas payload
- Filename format: `template-name.pdf`

## Deferred to Next Steps
- Prisma-backed durable storage for export jobs
- BullMQ queue worker and retries
- Actual PDF rendering and binary file streaming
- FE button wiring + polling loop + UX states
- Tests for end-to-end export lifecycle

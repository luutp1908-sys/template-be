# Monorepo Migration Plan

## Goal
Migrate the current backend project into a monorepo and extract the Export module as the first standalone service, while keeping existing behavior and API contracts stable.

## Current Decisions
- Monorepo tool: Nx
- First extracted service: Export
- API compatibility: keep existing `/api/v1/export/jobs` contract unchanged during phase 1 via proxying from the current backend
- Infrastructure in phase 1: share the current PostgreSQL and Redis instances

## Phases

### Phase 1: Baseline and Monorepo Setup
1. Capture the current backend baseline with build, test, and export-flow checks.
2. Create the Nx workspace structure and map the current backend into a monorepo layout.
3. Preserve TypeScript, Jest, ESLint, and Nest runtime behavior so the migration does not change app semantics.

### Phase 2: Extract Export Service
1. Move the Export module into its own Nest service app.
2. Preserve all Export DTOs, entities, repository contracts, queue usage, and processor behavior.
3. Keep the same authentication and ownership checks for export endpoints.
4. Keep the same queue name, job lifecycle, and file output behavior.

### Phase 3: Shared Infrastructure
1. Extract shared config and queue primitives into reusable workspace libraries.
2. Keep the Prisma schema and generated client aligned across apps.
3. Keep export file storage compatible with the current `tmp/exports` flow for the first cut.

### Phase 4: Compatibility Proxy
1. Route export requests from the current backend to the new export service.
2. Keep the editor and existing clients on the same endpoint paths.
3. Add an env-based switch for controlled rollout and rollback.

### Phase 5: Verification and Rollout
1. Port and run Export unit tests in the new service.
2. Add proxy contract tests to verify unchanged request and response behavior.
3. Run end-to-end checks for create job, poll status, and download PDF.
4. Roll out gradually and remove the embedded export path only after stability is confirmed.

## Export Service Dependencies
- `JwtAuthGuard` and `CurrentUser` from auth
- `PrismaService` and the `Export` Prisma model
- BullMQ queue backed by Redis
- Local PDF output path under `tmp/exports`

## Files to Watch
- `be/src/export/export.controller.ts`
- `be/src/export/export.service.ts`
- `be/src/export/export.processor.ts`
- `be/src/export/export.module.ts`
- `be/src/export/export.repository.prisma.ts`
- `be/src/export/export.repository.mock.ts`
- `be/src/export/dto/create-export.dto.ts`
- `be/src/export/export.entity.ts`
- `be/src/export/export.tokens.ts`
- `be/src/app.module.ts`
- `be/src/main.ts`
- `be/src/queue/queue.module.ts`
- `be/prisma/schema.prisma`

## Progress Checklist
- [x] Migration plan written down
- [x] Export module identified as the first extraction candidate
- [x] Monorepo tool decision made
- [x] API compatibility approach chosen
- [x] Nx workspace scaffolded
- [ ] Export service extracted
- [ ] Proxy layer implemented in the current backend
- [ ] Shared libs created
- [ ] Contract and end-to-end tests passing
- [ ] Rollout completed

## Notes
- This plan should be updated as each phase is completed.
- Keep the checklist current so it can be used as a migration tracker.
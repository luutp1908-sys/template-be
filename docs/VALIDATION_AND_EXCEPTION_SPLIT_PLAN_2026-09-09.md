# Validation and Exception Split Plan

Date: 2026-09-09
Scope: Backend modules under be/src (export, search, category, editor-type, related controller/DTO/test files)

## Progress Tracker

- Overall status: [ ] Not started [x] In progress [ ] Blocked [ ] Completed
- Start date: 2026-09-09
- Target completion date: __________
- Owner: __________
- Reviewer: luu (step-1 sign-off)
- Last updated: 2026-09-09

## Objective

Refactor backend error handling so request-shape validation is enforced at DTO/pipe level, services focus on domain/resource rules, and repositories keep persistence error mapping.

Success criteria:
- [ ] BadRequestException is used only for malformed request input.
- [ ] Resource-not-found cases return NotFoundException consistently.
- [ ] Domain/state conflicts return ConflictException consistently.
- [ ] Controllers no longer bypass DTO validation with raw body-field patterns.
- [ ] Tests cover invalid input, resource missing, and conflict scenarios.

## Step-by-Step Execution Plan

### Step 1: Freeze Taxonomy and Message Rules (blocking)

Target output: one agreed exception mapping used by all target modules.

- [x] Confirm mapping in team docs:
  - 400 Bad Request = malformed input shape/format/range
  - 404 Not Found = missing required resource
  - 403 Forbidden = permission/policy denied
  - 409 Conflict = domain/state invariant conflict
  - 500/503 = infrastructure/downstream failures
- [x] Define one message style per category (short user-safe message, no internal leakage).
- [x] Add one short "error taxonomy" note under backend docs for future contributors.

Checker:
- [x] Step 1 complete
- [x] Reviewed by: luu (chat sign-off)
- [x] Notes: Taxonomy finalized in be/docs/ERROR_TAXONOMY_AND_MESSAGE_CONVENTION_2026-09-09.md

### Step 2: Move Request Validation to DTOs and Pipes

Target output: request-shape validation runs before service logic.

- [x] Add UUID param pipes for route IDs in target controllers where applicable.
- [x] Replace raw body-field validation patterns with DTO-backed bodies.
- [x] Tighten permissive DTOs with non-empty/length/enum/range constraints.
- [x] Verify global ValidationPipe behavior still matches expected envelope.

Checker:
- [x] Export module input validation complete
- [x] Search module input validation complete
- [x] Category module input validation complete
- [x] Editor-type module input validation complete
- [x] Step 2 complete

### Step 3: Normalize Service-Layer Domain/Resource Exceptions

Target output: services keep domain logic only and throw semantically correct exceptions.

- [x] Export service: remove mixed BadRequest usage for missing resources; map to resource semantics.
- [ ] Category service: keep invariant checks in service and normalize to conflict semantics where appropriate.
- [ ] Search service: remove redundant request-format guards already enforced by DTOs.
- [ ] Editor-type service: remove or reduce redundant input checks already enforced upstream.
- [ ] Standardize error messages for repeated not-found/conflict cases.

Checker:
- [ ] Export service refactor complete
- [ ] Category service refactor complete
- [ ] Search service refactor complete
- [ ] Editor-type service refactor complete
- [ ] Step 3 complete

### Step 4: Align Controller Boundaries

Target output: controllers focus on transport concerns, not business/request-shape validation.

- [ ] Remove ad-hoc validation that belongs in DTOs/pipes.
- [ ] Keep controller responsibilities limited to request/response transport concerns.
- [ ] Confirm nullable-read endpoints remain intentionally nullable.
- [ ] Confirm throw-based endpoints remain explicit and documented.

Checker:
- [ ] Export controller alignment complete
- [ ] Category controller alignment complete
- [ ] Workspace controller alignment complete
- [ ] Step 4 complete

### Step 5: Tests and Regression Safety Net

Target output: behavior is locked with automated tests.

- [ ] Add/expand negative tests for invalid params/query/body (expect 400).
- [ ] Add/expand resource missing tests (expect 404).
- [ ] Add/expand domain conflict tests (expect 409).
- [ ] Assert error envelope shape stays stable via filter tests.
- [ ] Run targeted module tests first.
- [ ] Run full backend test suite.

Checker:
- [ ] Export tests updated
- [ ] Search tests updated
- [ ] Category tests updated
- [ ] Filter contract tests updated
- [ ] Full backend suite passing
- [ ] Step 5 complete

## Module-Level Checklist

### Export

- [x] Update DTO constraints in be/src/export/dto/create-export.dto.ts
- [x] Refactor service exception semantics in be/src/export/export.service.ts
- [ ] Keep controller transport semantics clear in be/src/export/export.controller.ts
- [x] Update tests in be/src/export/tests/export.service.spec.ts

### Search

- [ ] Keep all request-shape checks in be/src/search/dto/search-query.dto.ts
- [ ] Remove redundant manual checks in be/src/search/search.service.ts
- [ ] Update tests in be/src/search/tests/search.service.spec.ts

### Category

- [x] Tighten DTO constraints in be/src/category/dto/create-category.dto.ts
- [x] Tighten DTO constraints in be/src/category/dto/update-category.dto.ts
- [ ] Normalize domain/resource exception semantics in be/src/category/category.service.ts
- [ ] Align param validation and boundary behavior in be/src/category/category.controller.ts
- [ ] Update tests in be/src/category/tests/category.service.spec.ts

### Editor Type

- [ ] Remove redundant request-validation checks in be/src/editor-type/editor-type.service.ts
- [ ] Verify callers enforce editorTypeId constraints via DTO validation

## Verification Checklist

### API Behavior Verification

- [ ] Invalid UUID params return 400 with standardized envelope
- [ ] Unknown fields return 400 because forbidNonWhitelisted is enabled
- [ ] Invalid enum/range/length values return 400
- [ ] Well-formed but non-existent IDs return 404 where resource is required
- [ ] Domain invariant failures return 409 consistently

### Boundary Verification

- [ ] Services no longer duplicate request-shape validation already handled by DTO/pipes
- [ ] Controllers no longer use raw body-field validation patterns for domain inputs
- [ ] Exception filter output remains stable across all changed endpoints

### Regression Verification

- [ ] Targeted tests pass (export/search/category/editor-type)
- [ ] Full backend tests pass
- [ ] No unexpected API contract regressions found in manual smoke checks

## Scope Boundaries

Included:
- Backend modules in be/src tied to export/search/category/editor-type and directly related controller/DTO/test files

Excluded:
- Frontend projects
- Worker app under be/apps/export-service

## Notes and Risks

- [ ] Risk: existing clients may rely on previous 400 responses for missing resources.
- [ ] Mitigation: communicate endpoint-level status-code changes in release notes.
- [ ] Risk: partial rollout can create inconsistent semantics across modules.
- [ ] Mitigation: release by module with tests merged in same PR.

## Change Log

- [ ] YYYY-MM-DD - Initialized checklist version
- [x] 2026-09-09 - Step 1 started (taxonomy + message convention drafted)
- [x] 2026-09-09 - Step 1 completed (taxonomy + message convention signed off)
- [x] 2026-09-09 - Step 2 completed (UUID pipes + DTO boundary hardening)
- [ ] YYYY-MM-DD - Step 3 completed
- [ ] YYYY-MM-DD - Step 4 completed
- [ ] YYYY-MM-DD - Step 5 completed

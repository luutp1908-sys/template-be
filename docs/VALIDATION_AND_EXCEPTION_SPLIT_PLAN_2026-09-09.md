# Validation and Exception Split Plan

Date: 2026-09-09
Scope: Backend modules under be/src (export, search, category, editor-type, related controller/DTO/test files)

## Progress Tracker

- Overall status: [ ] Not started [x] In progress [ ] Blocked [ ] Completed
- Start date: 2026-09-09
- Target completion date: __________
- Owner: __________
- Reviewer: luu (step-1 sign-off)
- Last updated: 2026-09-09 (Step 5 completed)

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
- [x] Category service: keep invariant checks in service and normalize to conflict semantics where appropriate.
- [x] Search service: remove redundant request-format guards already enforced by DTOs.
- [x] Editor-type service: remove or reduce redundant input checks already enforced upstream.
- [x] Standardize error messages for repeated not-found/conflict cases.

Checker:
- [x] Export service refactor complete
- [x] Category service refactor complete
- [x] Search service refactor complete
- [x] Editor-type service refactor complete
- [x] Step 3 complete

### Step 4: Align Controller Boundaries

Target output: controllers focus on transport concerns, not business/request-shape validation.

- [x] Remove ad-hoc validation that belongs in DTOs/pipes.
- [x] Keep controller responsibilities limited to request/response transport concerns.
- [x] Confirm nullable-read endpoints remain intentionally nullable.
- [x] Confirm throw-based endpoints remain explicit and documented.

Checker:
- [x] Export controller alignment complete
- [x] Category controller alignment complete
- [x] Workspace controller alignment complete
- [x] Step 4 complete

### Step 5: Tests and Regression Safety Net

Target output: behavior is locked with automated tests.

- [ ] Add/expand negative tests for invalid params/query/body (expect 400).
- [ ] Add/expand resource missing tests (expect 404).
- [ ] Add/expand domain conflict tests (expect 409).
- [ ] Assert error envelope shape stays stable via filter tests.
- [ ] Run targeted module tests first.
- [ ] Run full backend test suite.
- [x] Add/expand negative tests for invalid params/query/body (expect 400).
- [x] Add/expand resource missing tests (expect 404).
- [x] Add/expand domain conflict tests (expect 409).
- [x] Assert error envelope shape stays stable via filter tests.
- [x] Run targeted module tests first.
- [x] Run full backend test suite.

Checker:
- [x] Export tests updated
- [x] Search tests updated
- [x] Category tests updated
- [x] Filter contract tests updated
- [x] Full backend suite passing
- [x] Step 5 complete

## Module-Level Checklist

### Export

- [x] Update DTO constraints in be/src/export/dto/create-export.dto.ts
- [x] Refactor service exception semantics in be/src/export/export.service.ts
- [x] Keep controller transport semantics clear in be/src/export/export.controller.ts
- [x] Update tests in be/src/export/tests/export.service.spec.ts

### Search

- [x] Keep all request-shape checks in be/src/search/dto/search-query.dto.ts
- [x] Remove redundant manual checks in be/src/search/search.service.ts
- [x] Update tests in be/src/search/tests/search.service.spec.ts

### Category

- [x] Tighten DTO constraints in be/src/category/dto/create-category.dto.ts
- [x] Tighten DTO constraints in be/src/category/dto/update-category.dto.ts
- [x] Normalize domain/resource exception semantics in be/src/category/category.service.ts
- [x] Align param validation and boundary behavior in be/src/category/category.controller.ts
- [x] Update tests in be/src/category/tests/category.service.spec.ts

### Editor Type

- [x] Remove redundant request-validation checks in be/src/editor-type/editor-type.service.ts
- [ ] Verify callers enforce editorTypeId constraints via DTO validation

## Verification Checklist

### API Behavior Verification

- [x] Invalid UUID params return 400 with standardized envelope
- [x] Unknown fields return 400 because forbidNonWhitelisted is enabled
- [x] Invalid enum/range/length values return 400
- [x] Well-formed but non-existent IDs return 404 where resource is required
- [x] Domain invariant failures return 409 consistently

### Boundary Verification

- [x] Services no longer duplicate request-shape validation already handled by DTO/pipes
- [x] Controllers no longer use raw body-field validation patterns for domain inputs
- [x] Nullable read endpoints in scoped modules remain intentionally nullable (category/editor-type/search service reads)
- [x] Throw-based endpoints are explicit and documented via controller-level API error response annotations
- [x] Exception filter output remains stable across all changed endpoints

### Regression Verification

- [x] Targeted tests pass (export/search/category/editor-type)
- [x] Full backend tests pass
- [x] No unexpected API contract regressions found in manual smoke checks

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
- [x] 2026-09-09 - Step 3 completed (service exception normalization for export/category/search/editor-type)
- [x] 2026-09-09 - Step 4 completed (controller boundary alignment and explicit throw-contract documentation)
- [x] 2026-09-09 - Step 5 completed (validation/error contract tests and full-suite regression pass)

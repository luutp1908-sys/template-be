# Prisma Conflict Normalization Plan

Date: 2026-09-09
Scope: Backend Prisma write paths under be/src that can return unique-constraint or missing-record errors.

## Progress Tracker

- Overall status: [ ] Not started [ ] In progress [ ] Blocked [x] Completed
- Start date: 2026-09-09
- Target completion date: __________
- Owner: __________
- Reviewer: __________
- Last updated: 2026-09-09 (Step 4 completed)

## Objective

Make Prisma write error handling consistent so the same database constraint produces the same API behavior across repositories and services. Keep the current HTTP semantics stable while removing repository-by-repository drift in unique-constraint and not-found mapping.

Success criteria:
- [ ] Prisma unique-constraint failures map consistently to ConflictException.
- [ ] Prisma missing-record failures map consistently to NotFoundException where applicable.
- [ ] Repositories that can raise P2002 or P2025 use the shared write-error mapper.
- [ ] Duplicate-message wording is standardized for the same constraint family.
- [ ] Tests cover the affected repository write paths.

## Step-by-Step Execution Plan

### Step 1: Audit Prisma write hotspots (blocking)

Target output: a complete list of write paths that can raise P2002 or P2025.

- [x] Identify every repository write method that can hit unique-constraint or not-found errors.
- [x] Separate true conflict hotspots from low-risk upserts or read-only code paths.
- [x] Record which modules already use the shared Prisma write-error mapper.
- [x] Record which modules still bypass the shared mapper.

Checker:
- [x] Hotspot list documented
- [x] Mapper coverage inventory completed
- [x] High-risk modules identified

Audit findings:
- Already using the shared mapper: [be/src/auth/auth.repository.prisma.ts](../src/auth/auth.repository.prisma.ts), [be/src/user/user.repository.ts](../src/user/user.repository.ts), [be/src/workspace/workspace.repository.ts](../src/workspace/workspace.repository.ts)
- High-risk gaps still bypassing the shared mapper: [be/src/category/category.repository.prisma.ts](../src/category/category.repository.prisma.ts), [be/src/template/template.repository.prisma.ts](../src/template/template.repository.prisma.ts), [be/src/editor-type/editor-type.repository.prisma.ts](../src/editor-type/editor-type.repository.prisma.ts)
- Lower-risk or non-primary hotspots: [be/src/template-content/template-content.repository.prisma.ts](../src/template-content/template-content.repository.prisma.ts), [be/src/export/export.repository.prisma.ts](../src/export/export.repository.prisma.ts), [be/src/user-draft/user-draft.repository.prisma.ts](../src/user-draft/user-draft.repository.prisma.ts)
- Constraint examples that need consistent handling: `User.email`, `WorkspaceMember(workspaceId, userId)`, `Category.slug`, `Template.slug`, `EditorType.key`

### Step 2: Apply the shared Prisma write-error mapper

Target output: write repositories use the same error translation entry point.

- [x] Update category repository write paths to use mapPrismaWriteError.
- [x] Update template repository write paths to use mapPrismaWriteError.
- [x] Update editor-type repository write paths to use mapPrismaWriteError.
- [x] Review any remaining write repositories with unique constraints and apply the mapper where needed.

Checker:
- [x] Category repository updated
- [x] Template repository updated
- [x] Editor-type repository updated
- [x] Remaining write hotspots updated

### Step 3: Standardize conflict messages by constraint family

Target output: same underlying constraint produces the same user-facing message.

- [x] Normalize duplicate-message text for shared constraints such as email, slug, and workspace membership.
- [x] Keep per-constraint messaging stable across services and repositories.
- [x] Preserve domain-specific wording where the same constraint is intentionally surfaced differently.
- [x] Avoid repository-specific fallback wording for the same Prisma code.

Checker:
- [x] Email conflict wording standardized
- [x] Slug conflict wording standardized
- [x] Workspace membership conflict wording standardized
- [x] Fallback wording reviewed

### Step 4: Add or update regression tests

Target output: the conflict mapping behavior is locked in by tests.

- [x] Update repository tests for the touched write paths.
- [x] Add tests for P2002 mapping to ConflictException.
- [x] Add tests for P2025 mapping to NotFoundException where applicable.
- [x] Add regression coverage for duplicate-message consistency when the same constraint appears in multiple layers.
- [x] Run targeted repository tests first, then run the full backend suite.

Checker:
- [x] Repository tests updated
- [x] P2002 coverage added
- [x] P2025 coverage added
- [x] Targeted tests passing
- [x] Full backend suite passing

## Module-Level Checklist

### Auth / User

- [x] Keep auth repository Prisma mapping consistent for user registration and token updates.
- [x] Confirm user repository write paths continue to use the shared mapper.
- [x] Standardize user email uniqueness wording across auth and user repositories.

### Workspace

- [x] Update workspace repository write paths that can hit workspace membership or workspace unique constraints.
- [x] Align workspace conflict messages with the service-level membership semantics.

### Category

- [x] Update category repository write paths to use shared Prisma conflict mapping.
- [x] Add regression tests for category slug or other uniqueness violations.

### Template

- [x] Update template repository write paths to use shared Prisma conflict mapping.
- [x] Add regression tests for template slug uniqueness behavior.

### Editor Type

- [x] Update editor-type repository write paths to use shared Prisma conflict mapping.
- [x] Add regression tests for editor-type key uniqueness behavior.

### Template Content / Export / User Draft

- [x] Review whether these repositories can surface Prisma uniqueness errors in normal writes.
- [x] Apply the shared mapper only where the schema or write path makes P2002/P2025 realistic.

## Notes and Risks

- [ ] Risk: changing duplicate messages may affect existing clients or tests that assert exact strings.
- [ ] Mitigation: keep messages short, stable, and constraint-oriented.
- [ ] Risk: partial adoption can keep the same Prisma error producing different API responses in different modules.
- [ ] Mitigation: update all hotspot repositories in one pass where possible.

## Change Log

- [x] 2026-09-09 - Initialized Prisma conflict normalization plan
- [x] 2026-09-09 - Step 1 audit completed (hotspots documented and mapper coverage inventory recorded)
- [x] 2026-09-09 - Step 2 completed (shared Prisma write-error mapper applied to category/template/editor-type repositories)
- [x] 2026-09-09 - Step 3 completed (email and workspace membership conflict wording standardized)
- [x] 2026-09-09 - Step 4 completed (repository regression tests added and passing)

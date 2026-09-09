# Authorization Error Refactor Plan

Date: 2026-09-09
Scope: Backend modules under be/src that currently express authorization decisions with NestJS HTTP exceptions, especially workspace and user-draft flows.

## Progress Tracker

- Overall status: [ ] Not started [x] In progress [ ] Blocked [ ] Completed
- Start date: 2026-09-09
- Target completion date: __________
- Owner: __________
- Reviewer: __________
- Last updated: 2026-09-09 (Step 3 completed)

## Objective

Refactor backend authorization handling so services and policies use framework-agnostic authorization errors, while HTTP status mapping remains in the NestJS boundary. This keeps the domain/application layer independent from NestJS HTTP exception types and preserves the current response envelope.

Success criteria:
- [ ] Authorization denials are represented by domain/application errors, not NestJS HTTP exceptions, inside services and policies.
- [ ] Missing authentication maps to 401 at the HTTP boundary.
- [ ] Access denied maps to 403 at the HTTP boundary.
- [ ] Resource missing and conflict semantics remain distinct from authorization errors.
- [ ] Tests cover the new domain error path and the HTTP mapping path.

## Step-by-Step Execution Plan

### Step 1: Define the authorization error contract (blocking)

Target output: a small reusable error abstraction for auth-related denials.

- [x] Create common authorization error types or a shared domain error base with stable code and message fields.
- [x] Decide whether unauthenticated and forbidden should be separate classes or code variants of one base class.
- [x] Document the status-code mapping contract for 401 and 403.
- [x] Keep the error shape framework-agnostic so services do not import NestJS HTTP exceptions.

Checker:
- [x] Authorization error model defined
- [x] Mapping contract documented
- [x] No service imports NestJS auth exceptions for authorization rules

### Step 2: Move authorization decisions to domain/application errors

Target output: workspace and draft authorization logic throw domain errors instead of NestJS HTTP exceptions.

- [x] Update WorkspaceAccessPolicy to express access denial through the new authorization error abstraction.
- [x] Update WorkspaceService permission checks to throw domain authorization errors for invite, update-role, and remove-member flows.
- [x] Update UserDraftService workspace access checks to throw domain authorization errors instead of ForbiddenException.
- [x] Keep resource-not-found and conflict cases on their existing semantics.

Checker:
- [x] Workspace policy updated
- [x] Workspace service updated
- [x] UserDraft service updated
- [x] Resource/conflict semantics preserved

### Step 3: Map authorization errors at the HTTP boundary

Target output: HTTP status translation happens only in the NestJS filter/boundary layer.

- [x] Extend the global exception filter to map the new authorization error classes to 401/403.
- [x] Preserve the existing canonical error envelope and logging fields.
- [x] Keep the filter fallback behavior for unknown errors unchanged.
- [x] Confirm controllers and guards remain thin transport layers.

Checker:
- [x] 401 mapping added
- [x] 403 mapping added
- [x] Envelope shape preserved
- [x] Unknown error fallback unchanged

### Step 4: Update tests and regression coverage

Target output: tests lock the new domain-to-HTTP boundary behavior.

- [ ] Update workspace service and policy tests to expect domain authorization errors.
- [ ] Update user-draft tests to expect domain authorization errors.
- [ ] Add or update filter tests to assert the new authorization error classes map to 401/403.
- [ ] Run targeted module tests first, then the full backend suite.

Checker:
- [ ] Workspace tests updated
- [ ] User-draft tests updated
- [ ] Filter tests updated
- [ ] Targeted tests passing
- [ ] Full backend suite passing

## Module-Level Checklist

### Workspace

- [x] Replace ForbiddenException usage in [be/src/workspace/policies/workspace-access.policy.ts](../src/workspace/policies/workspace-access.policy.ts)
- [x] Replace ForbiddenException usage in [be/src/workspace/workspace.service.ts](../src/workspace/workspace.service.ts)
- [ ] Update workspace tests in [be/src/workspace/tests/workspace.service.spec.ts](../src/workspace/tests/workspace.service.spec.ts)
- [ ] Update workspace guard tests in [be/src/workspace/tests/workspace-membership.guard.spec.ts](../src/workspace/tests/workspace-membership.guard.spec.ts)

### User Draft

- [x] Replace ForbiddenException usage in [be/src/user-draft/user-draft.service.ts](../src/user-draft/user-draft.service.ts)
- [ ] Update user-draft access tests if present under [be/src/user-draft/tests](../src/user-draft/tests)

### HTTP Boundary

- [x] Extend [be/src/common/filters/http-exception.filter.ts](../src/common/filters/http-exception.filter.ts) for authorization error mapping
- [ ] Extend [be/src/common/filters/http-exception.filter.spec.ts](../src/common/filters/http-exception.filter.spec.ts) for mapping coverage

## Notes and Risks

- [ ] Risk: changing 401/403 behavior may affect existing clients that expect the current response codes.
- [ ] Mitigation: document endpoint-level status changes and keep the response envelope stable.
- [ ] Risk: some workspace access paths may need a decision between 403 and 404 semantics.
- [ ] Mitigation: keep policy denial on 403 unless the endpoint is explicitly resource-addressed.

## Change Log

- [x] 2026-09-09 - Initialized authorization error refactor plan
- [x] 2026-09-09 - Step 1 completed (authorization error contract defined and documented)
- [x] 2026-09-09 - Step 2 completed (workspace and user-draft authorization decisions moved to domain errors)
- [x] 2026-09-09 - Step 3 completed (authorization errors mapped to HTTP 401/403 at the global boundary)

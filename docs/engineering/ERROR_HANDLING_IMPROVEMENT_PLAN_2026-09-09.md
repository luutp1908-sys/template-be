# Backend Error Handling Guide and Tracker

Date: 2026-09-09
Scope: Backend services and controllers with validation, business-rule violations, authorization, Prisma conflict translation, and response-code/message drift.

## Progress Tracker

- Overall status: [ ] Not started [ ] In progress [ ] Blocked [x] Completed
- Start date: 2026-09-09
- Target completion date: __________
- Owner: __________
- Reviewer: __________
- Last updated: 2026-09-09

## Objective

Make backend error handling clearer and more consistent by separating request-shape validation, business rules, authorization, and infrastructure failures; keeping controllers transport-focused; and aligning documented response codes/messages with runtime behavior.

Success criteria:
- [x] Business-rule violations use explicit NestJS or domain-semantic exceptions instead of raw Error.
- [x] Controller-level auth decisions are moved out of controllers.
- [x] Swagger response docs match the actual runtime error contract for write endpoints.
- [x] Error messages are short, stable, and consistent for the same failure family.
- [x] Regression tests cover the touched paths.

## Canonical Error Taxonomy

### 400 Bad Request

Use for malformed request input only.

Examples:
- Invalid UUID/path/query/body format
- Enum/range/length violations
- Unknown fields blocked by whitelist/forbidNonWhitelisted

Do not use for:
- Resource missing by a well-formed identifier
- Domain state conflicts

### 404 Not Found

Use when a required resource does not exist.

Examples:
- Workspace id is well-formed but no workspace exists
- Template id is well-formed but no template exists
- Category id is well-formed but no category exists

### 403 Forbidden

Use when caller is authenticated but not allowed by policy.

Examples:
- Role/membership denies operation
- Protected domain operation denied by business policy

### 409 Conflict

Use for domain/state invariant conflicts.

Examples:
- Cannot move category under itself
- Cannot move category into its descendant
- Cannot delete category while child categories/templates still exist
- Cannot transition resource to requested state

### 500 Internal Server Error / 503 Service Unavailable

Use for infrastructure and downstream failures.

Examples:
- Database write/read dependency failures not attributable to client input
- External service timeout or dependency outage

## Message Convention

### User-facing message rules
- Keep messages short and actionable.
- Do not expose internals (SQL, stack traces, secrets, low-level error payloads).
- Prefer stable phrasing for repeatable scenarios.

### Recommended message templates
- 400: "Invalid request: <field/reason>"
- 404: "<Resource> not found"
- 403: "You are not allowed to perform this action"
- 409: "Cannot <action>: <domain reason>"
- 500/503: "Request failed due to an internal error"

## Authorization Contract

Define a small framework-agnostic authorization error contract so backend services can express access decisions without importing NestJS HTTP exceptions.

- `AuthenticationRequiredError` means the caller is not authenticated.
- `AccessDeniedError` means the caller is authenticated but not allowed to perform the operation.
- Both errors carry a stable `code` and a user-safe `message`.
- Both errors remain free of NestJS HTTP types so they can be thrown from services, policies, or guards without coupling the domain layer to transport concerns.

HTTP mapping:
- `AuthenticationRequiredError` -> HTTP 401
- `AccessDeniedError` -> HTTP 403

Usage rule:
- Use these errors for authorization decisions only.
- Keep request-shape validation in DTOs and pipes.
- Keep resource-missing and conflict semantics on `NotFoundException` and `ConflictException`.

## Layer Responsibilities

- DTO/Pipes: request-shape validation (format/type/range/enum/unknown fields)
- Services: business rules, domain invariants, resource orchestration
- Repositories: persistence/infrastructure error translation
- Global exception filter: response envelope normalization and logging context

## Rollout Rule of Thumb

When you see BadRequestException in service code, verify if it is actually:
- request-shape validation -> move to DTO/pipe
- resource-missing check -> use NotFoundException
- domain/state conflict -> use ConflictException

## Completed Foundation

The following work has already been completed and is now documented here as the single reference point:

- Validation and exception split: request-shape validation moved to DTOs/pipes, while services own business-rule exceptions.
- Authorization refactor: authorization decisions use framework-agnostic errors at the service/policy layer and map to 401/403 at the HTTP boundary.
- Prisma conflict normalization: repository write paths translate duplicate and missing-record failures consistently.
- Current error-handling improvement pass: raw business-rule errors were removed, controller-owned auth branching was moved into the service layer, and controller docs were aligned with runtime behavior.

## Step-by-Step Execution Plan

### Step 1: Replace raw business-rule errors

Target output: no raw Error for request- or domain-like violations in service logic.

- [x] Replace unsupported editor-type invariant throws with a structured client-facing exception.
- [x] Standardize the message used for unsupported editor type ids.
- [x] Update editor-type tests to assert the new exception type and message.

Checker:
- [ ] Raw editor-type Error removed
- [ ] Message standardized
- [ ] Editor-type test updated

### Step 2: Move controller-owned auth checks out of controllers

Target output: controllers stay transport-focused and delegate auth decisions to the service layer.

- [x] Move template create MOCK_MODE authorization logic out of the controller.
- [x] Keep the controller focused on request/response transport concerns.
- [x] Update template service tests to cover the missing-auth path.

Checker:
- [ ] Template controller no longer contains auth branching
- [ ] Template service owns the auth decision
- [ ] Unauthorized template create path covered by tests

### Step 3: Align response-code documentation

Target output: controller Swagger annotations reflect real conflict/authorization behavior.

- [x] Add missing conflict/unauthorized response docs to write endpoints that can actually return them.
- [x] Keep not-found response docs where the service/repository can return them.
- [x] Ensure the create/update endpoints expose the same high-level error contract as runtime behavior.

Checker:
- [ ] Category controller docs aligned
- [ ] Template controller docs aligned
- [ ] Workspace controller docs aligned

### Step 4: Regression tests and verification

Target output: the touched error-handling behavior is locked with tests.

- [x] Add or update targeted unit tests for editor-type and template service behavior.
- [x] Run focused tests for the touched modules.
- [x] Run the full backend test suite.

Checker:
- [ ] Targeted tests passing
- [ ] Full backend suite passing

## Module-Level Checklist

### Editor Type

- [ ] Replace raw invariant Error in [be/src/editor-type/editor-type.service.ts](../src/editor-type/editor-type.service.ts)
- [ ] Update [be/src/editor-type/tests/editor-type.service.spec.ts](../src/editor-type/tests/editor-type.service.spec.ts)

### Template

- [ ] Move auth branching out of [be/src/template/template.controller.ts](../src/template/template.controller.ts)
- [ ] Add unauthorized coverage in [be/src/template/tests/template.service.spec.ts](../src/template/tests/template.service.spec.ts)
- [ ] Align [be/src/template/template.controller.ts](../src/template/template.controller.ts) response docs

### Category

- [ ] Align [be/src/category/category.controller.ts](../src/category/category.controller.ts) response docs for create/update conflict behavior

### Workspace

- [ ] Align [be/src/workspace/workspace.controller.ts](../src/workspace/workspace.controller.ts) response docs for create conflict behavior

## Notes and Risks

- [ ] Risk: changing error types may require updating a few tests that assert exact exception classes or messages.
- [ ] Mitigation: keep the new messages short and update tests in the same change set.
- [ ] Risk: controller docs can lag behind runtime behavior again.
- [ ] Mitigation: keep write-endpoint response annotations in sync with the service/repository contract.

## Change Log

- [ ] 2026-09-09 - Initialized error handling improvement plan
- [x] 2026-09-09 - Merged error taxonomy, authorization contract, and implementation tracker into one canonical document

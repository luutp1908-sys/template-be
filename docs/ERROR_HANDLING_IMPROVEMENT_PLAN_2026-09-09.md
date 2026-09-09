# Error Handling Improvement Plan

Date: 2026-09-09
Scope: Backend services and controllers with business-rule violations, controller-owned auth checks, and response-code/message drift.

## Progress Tracker

- Overall status: [ ] Not started [ ] In progress [ ] Blocked [x] Completed
- Start date: 2026-09-09
- Target completion date: __________
- Owner: __________
- Reviewer: __________
- Last updated: 2026-09-09

## Objective

Make backend error handling clearer and more consistent by removing raw errors from business-rule paths, keeping controllers transport-focused, and aligning documented response codes/messages with runtime behavior.

Success criteria:
- [x] Business-rule violations use explicit NestJS or domain-semantic exceptions instead of raw Error.
- [x] Controller-level auth decisions are moved out of controllers.
- [x] Swagger response docs match the actual runtime error contract for write endpoints.
- [ ] Error messages are short, stable, and consistent for the same failure family.
- [ ] Regression tests cover the touched paths.

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

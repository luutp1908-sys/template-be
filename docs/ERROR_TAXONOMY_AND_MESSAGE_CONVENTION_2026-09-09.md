# Error Taxonomy and Message Convention

Date: 2026-09-09
Applies to: be/src backend API modules
Status: Step 1 completed and approved for implementation

## Purpose

Define a single, consistent exception taxonomy and message convention so validation, business rules, resource checks, and infrastructure failures are clearly separated.

## Exception Taxonomy

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

## Review Checklist

- [x] Taxonomy adopted for current implementation phase
- [x] Message templates approved for current implementation phase
- [ ] Applied to export, search, category, editor-type modules
- [ ] Added to implementation PR description and release notes

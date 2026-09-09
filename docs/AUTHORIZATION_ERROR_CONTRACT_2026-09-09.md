# Authorization Error Contract

Date: 2026-09-09
Applies to: be/src services, policies, and the HTTP exception boundary

## Purpose

Define a small framework-agnostic authorization error contract so backend services can express access decisions without importing NestJS HTTP exceptions.

## Contract

- `AuthenticationRequiredError` means the caller is not authenticated.
- `AccessDeniedError` means the caller is authenticated but not allowed to perform the operation.
- Both errors carry a stable `code` and a user-safe `message`.
- Both errors remain free of NestJS HTTP types so they can be thrown from services, policies, or guards without coupling the domain layer to transport concerns.

## HTTP Mapping Rule

- `AuthenticationRequiredError` -> HTTP 401
- `AccessDeniedError` -> HTTP 403

## Usage Rule

- Use these errors for authorization decisions only.
- Keep request-shape validation in DTOs and pipes.
- Keep resource-missing and conflict semantics on `NotFoundException` and `ConflictException` until a later refactor explicitly changes them.

## Review Checklist

- [x] Authorization error classes are defined in the common backend layer.
- [x] The mapping contract is documented for 401 and 403.
- [x] Services and policies can throw these errors without importing NestJS auth exceptions.
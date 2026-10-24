# BE Idempotency Key Audit for Write Operations

Date: 2026-10-24

## Summary

No global HTTP idempotency layer is currently wired (no key parsing/interceptor/guard), so idempotency decisions are effectively per endpoint.

## High Priority (Should Require Idempotency Key)

These endpoints can create duplicate side effects on client retries/timeouts and should require `Idempotency-Key`.

- `POST /v1/export/jobs`
  - Controller: `src/export/export.controller.ts`
- `POST /v1/export/jobs` (proxy path)
  - Controller: `src/export-proxy/export-proxy.controller.ts`
- `POST /v1/user-draft`
  - Controller: `src/user-draft/user-draft.controller.ts`
- `POST /v1/workspace`
  - Controller: `src/workspace/workspace.controller.ts`
- `POST /v1/workspace/:id/invite-member`
  - Controller: `src/workspace/workspace.controller.ts`
- `POST /v1/category`
  - Controller: `src/category/category.controller.ts`
- `POST /v1/template`
  - Controller: `src/template/template.controller.ts`
- `POST /v1/user` (admin)
  - Controller: `src/user/user.controller.ts`

## Medium Priority (Strongly Consider Idempotency Key)

These operations are mutations where retries can still cause repeated writes, race behavior, or replay ambiguity.

- `PUT /v1/template-content/:templateId`
  - Controller: `src/template-content/template-content.controller.ts`
  - Note: This is upsert-based and structurally idempotent by key, but endpoint-level idempotency still helps replay responses and avoid repeated heavy writes.
- `PATCH /v1/user-draft/:id`
  - Controller: `src/user-draft/user-draft.controller.ts`
- `PATCH /v1/user-draft/:id/open`
  - Controller: `src/user-draft/user-draft.controller.ts`
- `PATCH /v1/workspace/:id`
  - Controller: `src/workspace/workspace.controller.ts`
- `PATCH /v1/workspace/:id/members/:memberId`
  - Controller: `src/workspace/workspace.controller.ts`
- `PATCH /v1/category/:id`
  - Controller: `src/category/category.controller.ts`
- `POST /v1/category/:id/move`
  - Controller: `src/category/category.controller.ts`
- `PATCH /v1/template/:id`
  - Controller: `src/template/template.controller.ts`
- `PATCH /v1/template/:id/publish`
  - Controller: `src/template/template.controller.ts`
- `PATCH /v1/template/:id/archive`
  - Controller: `src/template/template.controller.ts`
- `PATCH /v1/user/me`
  - Controller: `src/user/user.controller.ts`
- `PATCH /v1/user/me/password`
  - Controller: `src/user/user.controller.ts`

## Usually Excluded from Idempotency-Key Requirement

Auth flows are usually excluded from strict HTTP idempotency-key enforcement due to session/token semantics.

- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

Controller: `src/auth/auth.controller.ts`

## Lower Immediate Priority (Currently In-Memory Repositories)

These create endpoints currently write to in-memory stores (not Prisma-backed), so they are lower immediate priority for request-level idempotency hardening.

- `POST /v1/ai`
  - Controller: `src/ai/ai.controller.ts`
  - Repository: `src/ai/ai.repository.ts`
- `POST /v1/asset`
  - Controller: `src/asset/asset.controller.ts`
  - Repository: `src/asset/asset.repository.ts`
- `POST /v1/tag`
  - Controller: `src/tag/tag.controller.ts`
  - Repository: `src/tag/tag.repository.ts`

## Important Nuance

Export worker/repository logic already contains internal idempotency-like protections in status transitions. However, request-level `POST /export/jobs` can still create duplicate jobs without endpoint-level idempotency keys.

- Worker: `src/export/export.processor.ts`
- Repository: `src/export/export.repository.prisma.ts`

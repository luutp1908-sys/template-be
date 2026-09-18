# Export Service Contract Freeze

## Status

- Task: Phase 0 — freeze and inventory
- Status: complete for the current repo state
- Scope: export API contract and runtime dependencies only

## Definition of done

- [x] Export endpoints captured
- [x] Payload and job model captured
- [x] Runtime dependencies captured
- [x] Monolith compatibility behavior captured
- [x] Freeze gate documented

### Actual inventory captured for the first task

This is the contract and dependency inventory derived from the current export-service implementation.

#### HTTP contract

Source: [be/apps/export-service/src/export/export.controller.ts](be/apps/export-service/src/export/export.controller.ts#L1-L75)

- `POST /api/v1/export/jobs`
  - Auth required via `JwtAuthGuard`
  - Body: `CreateExportDto`
  - Response: `ExportEntity`
  - Purpose: enqueue an async export job for a workspace/template/draft

- `GET /api/v1/export/jobs/:id`
  - Auth required via `JwtAuthGuard`
  - Response: `ExportEntity`
  - Purpose: fetch job status for the current user

- `GET /api/v1/export/jobs/:id/download`
  - Auth required via `JwtAuthGuard`
  - Response: PDF file stream with `Content-Disposition` attachment header
  - Purpose: download final generated file when status is `completed`

#### Request and payload contract

Source: [be/apps/export-service/src/export/dto/create-export.dto.ts](be/apps/export-service/src/export/dto/create-export.dto.ts#L1-L35)

```ts
CreateExportDto {
  format: 'pdf';
  content: {
    pages: unknown[];
    meta?: Record<string, unknown>;
  };
  draftId?: string;
  templateId?: string;
  workspaceId?: string;
  templateName?: string;
}
```

#### Job model contract

Source: [be/apps/export-service/src/export/export.entity.ts](be/apps/export-service/src/export/export.entity.ts#L1-L23)

```ts
ExportEntity {
  id: string;
  requestedByUserId: string;
  format: 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName: string;
  content: ExportContentDto;
  draftId?: string;
  templateId?: string;
  workspaceId?: string;
  downloadPath?: string;
  errorMessage?: string;
  attemptCount?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Runtime dependencies to move with the service

Source: [be/apps/export-service/src/export-service-app.module.ts](be/apps/export-service/src/export-service-app.module.ts#L1-L71), [be/apps/export-service/src/queue/queue.module.ts](be/apps/export-service/src/queue/queue.module.ts#L1-L19), [be/apps/export-service/src/config/configuration.ts](be/apps/export-service/src/config/configuration.ts#L1-L70), [be/apps/export-service/src/config/env.validation.ts](be/apps/export-service/src/config/env.validation.ts#L1-L92)

- `NestJS` app bootstrap and global middleware configuration
- `JwtAuthGuard` and auth flow for export endpoints
- `DatabaseModule` + Prisma-backed export repository
- `QueueModule` + BullMQ connection to Redis
- `pdf-export` queue name and worker registration
- `ExportService` submission logic and job status checks
- `ExportProcessor` background file-generation behavior
- `tmp/exports`-style generated file storage and PDF download flow
- Redis config: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Database config: `DATABASE_URL`
- JWT config: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- throttle and logging configuration values
- environment validation rules for production and mock mode

#### Monolith compatibility contract

Source: [be/src/export-proxy/export-proxy.service.ts](be/src/export-proxy/export-proxy.service.ts#L1-L101) and [be/src/app.module.ts](be/src/app.module.ts#L33-L91)

- The monolith uses `EXPORT_SERVICE_URL` as the switch to call the external service.
- If the env var is present, the monolith routes export operations through the proxy.
- If absent, it keeps using the embedded export module.
- This must remain as the compatibility layer during the split.

#### Freeze gate for this task

Do not proceed to repo split until all of the above are agreed and captured in the new service repo.
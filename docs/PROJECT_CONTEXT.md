# Backend Project Context (be)

## What This Project Is
This is the main backend API for the template platform.

- Framework: NestJS
- Database access: Prisma (PostgreSQL)
- Queue/async infra: BullMQ + Redis
- Auth: JWT + cookie-based refresh flow

## Runtime Defaults
- API server: http://localhost:4000
- API prefix: /api
- Versioned routes: /v1
- Effective base URL used by clients: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/docs

## Core Responsibilities
- User authentication and session refresh
- User profile management
- Workspace and member management
- Category and template management
- Template content and related editor data
- Asset and export operations

## Main Commands
Run from this folder.

```bash
yarn install
yarn prisma:deploy
yarn start:dev
```

Useful extras:

```bash
yarn build
yarn test
yarn prisma:studio
```

## Environment Notes
See .env.example for required values.

Important keys:

- PORT (default 4000)
- API_PREFIX (default api)
- SWAGGER_PATH (default docs)
- DATABASE_URL (PostgreSQL)
- REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
- JWT_ACCESS_SECRET / JWT_REFRESH_SECRET

## How Other Projects Connect To This API
- fe/apps/editor calls this backend directly with VITE_API_ORIGIN or VITE_API_BASE (fallback http://localhost:4000).
- fe/apps/admin calls this backend with VITE_BE_API_BASE (fallback varies by module: http://localhost:4000 or http://localhost:4000/api/v1).
- homepage uses two patterns:
  - Direct browser auth calls to backend (NEXT_PUBLIC_BE_API_BASE or fallback http://localhost:4000).
  - Next.js server route handlers under homepage/src/app/api/* that proxy requests to this backend using BE_URL (fallback http://localhost:4000).

## Quick Mental Model
If frontend data is wrong, check this backend first:

1. Is backend running on 4000?
2. Are /api/v1 endpoints reachable?
3. Is DB migrated and seeded?
4. Are auth cookies/tokens being sent by client?

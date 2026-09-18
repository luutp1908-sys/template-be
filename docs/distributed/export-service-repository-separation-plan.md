# Export Service Repository Separation Plan

## Goal

Move the export service out of the monorepo so that the export app becomes a standalone repository with its own build, deploy, and runtime lifecycle. After the cutover, the `be` project should no longer depend on the export service as a Nx app inside the same repo.

## Progress Tracker

Use this checklist to track the migration state. Replace each `[ ]` with `[x]` once the task is complete, and keep notes inline when a task is blocked or partially done.

### Milestone Checklist

- [x] Phase 0: freeze and inventory complete
- [x] Phase 1: new export repo created
- [x] Phase 1: build and tests pass in the new repo
- [x] Phase 2: monorepo coupling reduced
- [x] Phase 2: monolith proxy path still validated
- [ ] Phase 3: git history split completed
- [ ] Phase 4: standalone service hardening complete
- [ ] Phase 5: cutover to external service validated
- [ ] Phase 6: monolith export path removed
- [ ] Final: production deployment and rollback tested

### Checker Placeholder Format

Use this format for each task as you work through the migration:

- [ ] Task name — owner: <name> | due: <date> | status: not started | notes: <short note>

Example:

- [ ] Create standalone repo — owner: <name> | due: 2026-09-20 | status: in progress | notes: repo scaffold created, waiting on service copy

## Current State

The current backend already has a clear split in code structure:

- `be/src` is the main monolith app.
- the export app is a second NestJS application configured as an Nx project.
- The monolith can operate in dual mode:
  - local embedded export flow
  - proxy mode via `EXPORT_SERVICE_URL`

This means the architecture is already close to a true service boundary, but the repository still couples them together.

## Target State

After migration, we will have two repositories:

1. `template-saas-backend`
   - owns the monolith app and all shared product concerns
   - no longer contains the export service code

2. `template-saas-export-service`
   - owns the export service app, queue workers, and export runtime logic
   - has its own CI/CD pipeline, Docker image, deployment environment, and separate service registry

The monolith continues to call the export service over HTTP via a feature flag, but it no longer owns the implementation.

---

## Migration Principles

1. Preserve API contracts
   - Keep the HTTP route and response schema intact during the cutover.
   - Keep `EXPORT_SERVICE_URL` as the operational switch.

2. Preserve deployment safety
   - Do not remove the monolith path until the new repo has passed build and export-flow validation.

3. Keep ownership clean
   - Export code belongs to the export repo only.
   - Monolith code should no longer reference export app internals.

4. Minimize downtime
   - Use a two-phase split: create new repo first, validate, then remove monolith-side export implementation.

---

## Phase 0: Freeze and Inventory

### Tasks

- Capture the current export API contract.
- Confirm all important endpoints, DTOs, and file outputs.
- Inventory env vars and infrastructure dependencies.
- Record queue names, Redis usage, Prisma usage, and upload/storage behavior.
- Confirm the current working branch and repo state before splitting.

### Checklist

- [ ] Export endpoints identified and documented
- [ ] Job lifecycle mapped (`create -> status -> download`)
- [ ] Env vars inventoried
- [ ] Redis/BullMQ queue names identified
- [ ] Prisma model usage confirmed
- [ ] Filesystem output path confirmed (`tmp/exports` or equivalent)
- [ ] Build/test baseline captured

### Deliverable

A migration document in the new repo describing:

- API contract
- runtime dependencies
- env variables
- deployment mode
- known cutover risks

### Contract freeze reference

This phase is now captured in the dedicated freeze document:

- [be/docs/distributed/export-service-contract.md](be/docs/distributed/export-service-contract.md)

Use that file as the source of truth for the API and dependency inventory during the split.

---

## Phase 1: Create the New Export Repo

### Repository layout

Create a new standalone repo with this structure:

```text
template-saas-export-service/
  Dockerfile
  package.json
  tsconfig.json
  nest-cli.json
  .env.example
  .gitignore
  src/
    main.ts
    app.module.ts
    auth/
    common/
    config/
    database/
    export/
    queue/
  prisma/
    schema.prisma
  scripts/
  test/
```

### Repo setup rules

- Use NestJS as a standalone application repo, not an Nx workspace.
- Keep `package.json` scripts focused on this service only.
- Remove Nx project references from the new repo.
- Create a clean deployment path: Docker image, build script, and health checks.

### Implementation actions

- Create a fresh git repository for the service.
- Copy the export application code from the legacy export app into the new repo.
- Keep the service-specific code only; do not carry backend monolith app code.
- Add a standalone `Dockerfile` and runtime health endpoint.
- Add `README.md` with:
  - service purpose
  - required env vars
  - local run steps
  - deployment steps

### Validation

- `npm install`
- `npm run build`
- `npm test`
- `npm run start` or local container boot

---

## Phase 2: Reduce Monorepo Coupling

This phase is about removing the export service from the `be` repo without breaking the main app.

### Phase 2 checklist

- [x] Freeze compatibility mode in the monolith (`EXPORT_SERVICE_URL` path remains authoritative)
- [x] Remove Nx app references for `export-service` from the backend workspace
- [x] Remove the old app path from the monorepo references after validation
- [x] Remove `export-service` target entries from `be/nest-cli.json`
- [x] Remove `export-service` project scripts from root `be/package.json`
- [x] Keep the proxy controller/service in place as the compatibility layer during transition
- [x] Confirm the monolith still boots with the embedded export flow and the proxy flow
- [x] Validate that all export-related business logic now lives in the standalone repo only

### Delete or disable from `be` monorepo

- Remove the old app path from the monorepo references only after validation
- Remove `export-service` entry from `be/nest-cli.json`
- Remove `export-service` project config from the app project metadata if still present
- Remove any Nx scripts referencing the old app name
- Remove export-service-specific scripts from root `be/package.json`

### Keep compatibility temporarily

The monolith should keep a proxy pattern during the transition:

- `EXPORT_SERVICE_URL` empty => monolith remains in embedded mode
- `EXPORT_SERVICE_URL` set => monolith calls the external service

This pattern is already visible in [be/src/app.module.ts](be/src/app.module.ts#L38-L79) and should remain as a safe transition mechanism.

### Code ownership cleanup

- Move all export-related business logic to the new repo
- Remove duplicated auth/config/database utilities from the monolith after the new repo is validated
- Keep shared contracts documented and stable

---

## Phase 3: Move Git History Cleanly

Use a proper git split so the service is truly independent.

### Recommended approach

Use a subtree split from the monolith repo:

```bash
git checkout main
git subtree split --prefix=<legacy-export-app-path> --branch export-service-extraction
```

Then create the new repository and push the split branch:

```bash
git clone <new-repo-url>
cd <new-repo>
git fetch <old-repo-url> export-service-extraction
git checkout -b main FETCH_HEAD
```

### Important cleanup after split

- Remove `.nx` files and monorepo config if present in the extracted repo
- Remove references to `be/` or root workspace paths
- Remove any shared monorepo package references that are not needed

---

## Phase 4: Standalone Service Hardening

### Required work in the new repo

- Standalone env validation
- Health endpoint
- Docker build and production run config
- CI pipeline for build/test/deploy
- Cloud deployment target (ECS, App Runner, or other runtime)
- Separate secrets and config management
- Independent logging, metrics, and alerting

### Specific checks

- Queue worker health should be exposed independently
- Export job queue should not depend on monolith bootstrapping
- Output generation should be isolated from the monolith runtime
- Auth validation should match the previous contract exactly

---

## Phase 5: Cutover in the Monolith

Once the new export repo is stable:

1. Deploy the standalone service
2. Set `EXPORT_SERVICE_URL` in the monolith environment
3. Validate export jobs via the monolith proxy path
4. Confirm file generation, status polling, and download behavior remain unchanged
5. Turn on the external service for production traffic

### Cutover checklist

- [ ] New export-service repository is live
- [ ] Health checks pass
- [ ] Redis/queue connectivity works
- [ ] Export API returns same response shape
- [ ] Download flow works
- [ ] Logs and tracing are correctly separated
- [ ] Rollback plan is documented

---

## Phase 6: Remove Monolith Export Path

Only after a safe deployment window:

- Remove embedded export module from the monolith
- Remove the fallback path for local export execution
- Remove old export app files and references
- Remove repo-level docs that assume a monorepo export service
- Confirm the monolith only speaks to the external export service

### Final state

- `be` repo: main backend only
- `export-service` repo: standalone service only
- Deployment and ownership are cleanly separated

---

## Risk Register

### 1. Shared code drift

Risk: auth, config, or queue code diverges after split.

Mitigation:
- freeze shared contracts before split
- keep a strict compatibility layer during transition
- minimize shared code before separation

### 2. Deployment mismatch

Risk: the standalone service runs differently in prod than the monolith expected.

Mitigation:
- use the same Docker runtime and environment contract
- validate with a staging deployment
- keep a rollback toggle in the monolith

### 3. Queue or Redis dependency mismatch

Risk: service cannot connect to the same broker or data backend.

Mitigation:
- confirm queue name, Redis config, and TLS settings before cutover
- test both dev and prod connection paths before removing the local mode

### 4. Contract drift in route or payload

Risk: export API response changes during the migration.

Mitigation:
- keep a contract test suite
- compare request/response payloads before and after the split
- maintain versioning and compatibility where required

---

## Suggested Execution Order

1. Freeze the export contract
2. Build the standalone repo copy
3. Validate the new repo locally
4. Deploy the standalone repo to staging
5. Set the monolith proxy flag
6. Verify parity
7. Move traffic to the new repo
8. Remove the old export app from the monolith
9. Delete the old repo code and clean up docs

---

## Success Criteria

The migration is complete when all are true:

- the legacy export app no longer exists in the `be` repo
- export service runs in its own repository
- monolith calls the service via HTTP only
- deployment pipeline is independent
- build/test/deploy pass in the new repo
- rollback path is documented and tested

---

## Recommended Next Step

Start with a repository split branch and a staged migration branch in the `be` repo. Do not delete the monolith export path until the new repository has passed the same export smoke tests and the proxy path has been validated in a real environment.

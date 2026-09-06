# Module Boundaries

## 1. Purpose

This document defines the responsibility, ownership, public interfaces, and dependency boundaries of the major backend modules.

The goal is to prevent business logic from becoming tightly coupled across modules and to establish clear ownership of domain data.

The major modules covered are:

* Auth
* Workspace
* Template
* Asset
* Export

---

# 2. Architectural Principles

## 2.1 Module Ownership

Each business module owns its domain data and business rules.

Other modules must not directly access another module's:

* Repository
* Database queries
* Internal entities
* Internal implementation details
* Private business logic

Cross-module communication should happen through an explicitly exposed service or interface.

## 2.2 Public vs Internal API

A module should expose only the functionality required by other modules.

Example:

```text
WorkspaceModule
    ├── WorkspaceController       Internal to module boundary
    ├── WorkspaceService          Public application API
    ├── WorkspaceRepository       Internal
    ├── WorkspaceAccessPolicy     Internal
    └── WorkspaceMembershipGuard  Internal
```

Another module should depend on `WorkspaceService`, not `WorkspaceRepository`.

## 2.3 Database Ownership

A module should be the owner of the tables/entities representing its domain.

Other modules may reference another module's identifiers but should not directly manipulate its data.

---

# 3. Auth Module

## Responsibility

The Auth module is responsible for:

* User authentication
* Login/logout
* JWT authentication
* Access-token validation
* Refresh-token/session flow
* Authentication-related authorization guards
* Authentication strategies

The project currently exposes authentication functionality through `AuthService` and authentication/authorization guards.

## Owned Data

The Auth module owns:

```text
User authentication credentials
Authentication sessions / refresh-token state
Authentication-related data
```

The exact database ownership should remain aligned with the Prisma schema.

## Public Interfaces

The module may expose:

```text
AuthService
JwtAuthGuard
RolesGuard
PermissionsGuard
```

The current `AuthModule` explicitly exports these services/guards.

## Internal Implementation

The following should remain internal:

```text
AuthRepository
JwtStrategy
LocalStrategy
LocalAuthGuard
Repository implementations
Authentication-specific DTOs
```

## Allowed Dependencies

```text
Auth
 └── Shared infrastructure
      ├── Config
      └── Database
```

Auth should not depend on:

```text
WorkspaceRepository
TemplateRepository
AssetRepository
ExportRepository
```

---

# 4. Workspace Module

## Responsibility

The Workspace module owns workspace and membership management.

Responsibilities include:

* Creating workspaces
* Updating workspaces
* Removing workspaces
* Listing user's workspaces
* Workspace membership
* Inviting members
* Updating member roles
* Removing members
* Workspace access rules

The existing module contains `WorkspaceService`, `WorkspaceRepository`, `WorkspaceAccessPolicy`, and `WorkspaceMembershipGuard`.

## Owned Data

```text
Workspace
WorkspaceMember
Workspace membership / role information
```

`WorkspaceEntity` represents workspace-owned data such as id, name, slug, type, description, and avatar URL.

## Public Interfaces

Primary public API:

```text
WorkspaceService
```

The current `WorkspaceModule` exports `WorkspaceService`.

Example public operations:

```text
WorkspaceService.findById()
WorkspaceService.findMany()
WorkspaceService.create()
WorkspaceService.update()
WorkspaceService.remove()
```

## Internal Implementation

```text
WorkspaceRepository
WorkspaceAccessPolicy
WorkspaceMembershipGuard
WorkspaceMapper
Workspace DTO implementation details
```

## Allowed Dependencies

```text
Workspace
 └── Auth
       └── authenticated user identity
```

Workspace may use the authenticated user's identity, but should not directly access Auth's repository.

## Forbidden Dependencies

Workspace must not directly access:

```text
TemplateRepository
AssetRepository
ExportRepository
AuthRepository
```

---

# 5. Template Module

## Responsibility

The Template module owns template-related business functionality.

Responsibilities include:

* Creating templates
* Reading templates
* Updating templates
* Publishing templates
* Archiving templates
* Removing templates
* Template listing/search
* Template statistics
* Template-related caching

The existing `TemplateService` contains these operations.

## Owned Data

```text
Template
Template content
Template metadata
Template status
Template statistics
```

The exact entity/table ownership should follow the Prisma schema.

## Public Interfaces

Primary public API:

```text
TemplateService
```

The current `TemplateModule` exports `TemplateService`.

Example:

```text
TemplateService.findById()
TemplateService.findMany()
TemplateService.create()
TemplateService.update()
TemplateService.publish()
TemplateService.archive()
```

## Internal Implementation

```text
TemplateRepository
Template data repository
Template cache implementation
Template-specific DTOs
Template-specific database queries
```

## Allowed Dependencies

Template may depend on:

```text
Workspace public API
Auth user identity
Shared infrastructure
Cache
```

For example, if a template belongs to a workspace:

```text
TemplateService
       ↓
WorkspaceService
       ↓
Workspace ownership/access rules
```

## Forbidden Dependencies

Template must not directly access:

```text
WorkspaceRepository
AuthRepository
AssetRepository
ExportRepository
```

---

# 6. Asset Module

## Responsibility

The Asset module owns asset management.

Responsibilities include:

* Creating assets
* Reading assets
* Updating asset metadata
* Removing assets
* Asset storage metadata
* Asset-related persistence

The current module contains `AssetController`, `AssetService`, and `AssetRepository`.

## Owned Data

```text
Asset
Asset metadata
Asset storage references
```

## Public Interfaces

Primary public API:

```text
AssetService
```

The current `AssetModule` exports `AssetService`.

## Internal Implementation

```text
AssetRepository
Asset database queries
Asset-specific DTOs
Storage implementation details
```

## Allowed Dependencies

```text
Asset
 ├── Auth user identity
 └── Shared storage/infrastructure
```

If assets belong to a workspace, the module may use a workspace public interface to validate ownership/access.

## Forbidden Dependencies

Asset must not directly access:

```text
WorkspaceRepository
TemplateRepository
AuthRepository
ExportRepository
```

---

# 7. Export Module

## Responsibility

The Export module owns asynchronous export jobs.

Responsibilities include:

* Creating export jobs
* Tracking export status
* Queueing export work
* Processing export jobs
* Managing export-specific persistence
* Communicating with the export worker/service

The current module contains `ExportService`, `ExportProcessor`, an export repository abstraction, and a BullMQ `pdf-export` queue.

## Owned Data

```text
ExportJob
Export status
Export metadata
Export result information
```

## Public Interfaces

Primary public API:

```text
ExportService
```

Current public operations include:

```text
ExportService.createJob()
ExportService.findJobStatus()
```

The module exports `ExportService`.

## Internal Implementation

```text
ExportRepository
ExportProcessor
BullMQ queue implementation
Prisma repository implementation
Mock repository
Export-specific DTOs
```

## Allowed Dependencies

```text
Export
 ├── Queue infrastructure
 ├── Database
 └── Template public API / export data contract
```

The export module should receive the information necessary for rendering through an explicit contract rather than reaching directly into Template's database.

## Forbidden Dependencies

Export must not directly access:

```text
TemplateRepository
WorkspaceRepository
AssetRepository
AuthRepository
```

---

# 8. Dependency Rules

The preferred dependency direction is:

```text
                 ┌──────────┐
                 │   Auth   │
                 └────┬─────┘
                      │
                      │ identity
                      ▼
              ┌───────────────┐
              │   Workspace   │
              └───────┬───────┘
                      │
              public API only
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
     ┌──────────┐            ┌─────────┐
     │ Template │            │  Asset  │
     └────┬─────┘            └────┬────┘
          │                       │
          └───────────┬───────────┘
                      ▼
                 ┌─────────┐
                 │ Export  │
                 └─────────┘
```

This diagram represents logical ownership and interaction, not necessarily direct NestJS imports.

## Important Rule

A dependency on another module must target its public interface.

### Allowed

```text
TemplateService
    ↓
WorkspaceService
```

### Not allowed

```text
TemplateService
    ↓
WorkspaceRepository
```

### Not allowed

```text
ExportService
    ↓
Prisma
    ↓
Template table
```

The Export module should instead consume an explicit template/export contract.

---

# 9. Cross-Module Access Rules

| Access                                                  | Allowed? | Reason                             |
| ------------------------------------------------------- | -------: | ---------------------------------- |
| Module → another module's public Service                |        ✅ | Explicit module API                |
| Module → another module's Repository                    |        ❌ | Breaks ownership                   |
| Module → another module's Prisma queries                |        ❌ | Bypasses domain boundary           |
| Module → another module's private entity implementation |        ❌ | Creates coupling                   |
| Module → another module's DTO                           |       ⚠️ | Prefer shared contracts/interfaces |
| Module → shared infrastructure                          |        ✅ | Infrastructure is cross-cutting    |
| Module → authenticated user identity                    |        ✅ | Authentication context             |
| Module → another module's database table directly       |        ❌ | Violates data ownership            |

---

# 10. Current Architectural Violations To Investigate

The following must be verified against the actual import graph.

## ARCH-01-V1 — Repository Cross-Access

Search for imports such as:

```text
../workspace/workspace.repository
../template/template.repository
../asset/asset.repository
../export/export.repository
../auth/auth.repository
```

If one business module imports another module's repository, create a follow-up architecture task.

## ARCH-01-V2 — Direct Prisma Cross-Access

Search for modules querying tables owned by another module.

Example:

```text
TemplateService
    ↓
Prisma
    ↓
workspace table
```

This should be replaced by a Workspace public interface where appropriate.

## ARCH-01-V3 — Entity Ownership Violations

Identify cases where one module modifies another module's entity.

Example:

```text
AssetService
    ↓
WorkspaceEntity
    ↓
UPDATE
```

The owning module should perform the business operation.

## ARCH-01-V4 — Circular Dependencies

Check for:

```text
Workspace → Template → Workspace
```

or:

```text
Template → Asset → Template
```

Circular dependencies should be removed or replaced with an explicit interface/event/contract.

---

# 11. Definition of Done

ARCH-01 is complete when:

* [x] Major modules are identified.
* [x] Each module has a documented responsibility.
* [x] Each module has documented data ownership.
* [x] Each module has documented public interfaces.
* [x] Allowed dependencies are documented.
* [x] Forbidden dependencies are documented.
* [ ] Actual imports are checked against these rules.
* [ ] Repository cross-access violations are identified.
* [ ] Direct Prisma cross-module access is identified.
* [ ] Circular dependencies are identified.
* [ ] Violations are converted into follow-up architecture tickets.

---

# 12. Target Architecture

The desired architecture is:

```text
                    ┌─────────────┐
                    │    Auth     │
                    │             │
                    │ Public API  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Workspace   │
                    │             │
                    │ Public API  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Template │ │  Asset   │ │  Export  │
        │          │ │          │ │          │
        │ Public   │ │ Public   │ │ Public   │
        │ API      │ │ API      │ │ API      │
        └──────────┘ └──────────┘ └──────────┘
```

Each module follows:

```text
                Public API
                    │
                    ▼
             ┌─────────────┐
             │   Service   │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │ Repository  │
             └──────┬──────┘
                    │
                    ▼
                 Database
```

The critical architectural rule is:

> **Modules communicate through public contracts, while each module retains ownership of its own business logic and persistence.**

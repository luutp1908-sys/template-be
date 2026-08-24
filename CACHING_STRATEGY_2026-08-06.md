# Caching Strategy (2026-08-06)

## Goal

Reduce database load and improve p95 latency by adding Redis-backed caching for the highest-value read paths first, with explicit invalidation on related writes.

## Rollout Approach

Implement in slices rather than one large change.

1. Slice 1: Cache foundation plus category tree caching.
   - [x] add shared Redis-backed cache service with graceful fallback when cache is unavailable
   - [x] add cache config and env validation for enabled flag, Redis host/port, key prefix, and category tree TTL
   - [x] cache category tree reads using a single stable key and read-through pattern
   - [x] invalidate the category tree cache on category create, update, delete, and move
   - [x] validate with focused category tests and a clean build
2. Slice 2: Template list caching for common query shapes. (implemented)
3. Slice 3: Short-TTL auth user context caching.
4. Slice 4: Metrics, cache bypass controls, and broader invalidation coverage.

## Why This Approach

1. It limits correctness risk from stale data.
2. It makes cache bugs easier to isolate.
3. It gives measurable performance wins early.
4. It fits the current backend, which does not yet have a shared cache abstraction.

## First-Wave Targets

### 1. Category tree
- Endpoint: `GET /api/v1/category/tree`
- Why first: public/read-heavy, low write frequency, expensive rebuild in service layer, simple invalidation.
- TTL: long-lived relative to other caches.
- Invalidate on: category create, update, delete, move.

### 2. Template list
- Endpoint: `GET /api/v1/template`
- Why next: public endpoint with joined reads and pagination.
- TTL: moderate.
- Invalidate on: template create, update, delete, publish, archive.

### 3. Auth user context
- Internal read path: auth user lookup by id for protected requests.
- Why later: high frequency, but correctness sensitivity is higher because of roles/permissions.
- TTL: short.
- Invalidate on: role change, permission change, profile change if user payload depends on it.

## First Slice Scope

1. Add a shared cache service with Redis-backed storage and graceful fallback when cache is unavailable.
2. Add cache config and env validation.
3. Cache category tree reads using a single stable key.
4. Invalidate that key on category writes.
5. Validate with focused category tests and a clean build.

## Operational Rules

1. Cache should degrade gracefully if Redis is unavailable.
2. Writes must continue to succeed even if cache invalidation fails.
3. Cache keys should be explicit and namespaced.
4. Each new cached endpoint must define its TTL and invalidation triggers up front.

## Success Criteria

1. Repeated category tree requests hit cache after first miss.
2. Category create/update/delete/move clears the tree cache.
3. Build passes and category tests remain green.
4. Application continues to function if cache backend is unavailable.

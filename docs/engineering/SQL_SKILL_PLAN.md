# SQL Skill Improvement Plan for BE

## Goal
Build practical SQL strength inside the existing NestJS + Prisma backend by implementing features in increasing difficulty.

## Recommended Feature Sequence (Easy -> Hard)

### 1) Template Popularity Analytics
Why this first:
- Fast win using existing template module.
- Teaches foundational query design and index-aware aggregation.

SQL concepts practiced:
- JOIN
- GROUP BY
- COUNT
- ORDER BY
- Basic indexing for sort/filter paths

API ideas:
- GET /api/v1/templates/stats/popularity?editorTypeId=0&limit=10
- GET /api/v1/templates/stats/by-category

Likely files:
- src/template/template.repository.prisma.ts
- src/template/template.service.ts
- src/template/template.controller.ts
- prisma/schema.prisma

---

### 2) Category Hierarchy Stats
Why second:
- Your category tree is ideal for recursive queries.
- Builds deeper SQL thinking without heavy concurrency concerns.

SQL concepts practiced:
- WITH RECURSIVE
- UNION ALL
- Depth computation
- Descendant aggregation

API ideas:
- GET /api/v1/categories/:id/hierarchy-stats
- GET /api/v1/categories/orphaned

Likely files:
- src/category/category.repository.prisma.ts
- src/category/category.service.ts
- src/category/category.controller.ts

---

### 3) Full-Text Search for Templates + Categories
Why third:
- You already have a search module to extend.
- Introduces Postgres-native search and relevance ranking.

SQL concepts practiced:
- tsvector
- tsquery
- @@ operator
- GIN index
- ts_rank ordering

API ideas:
- GET /api/v1/search?q=react+hooks&type=template
- GET /api/v1/search/advanced?q=design&scope=category,template&limit=20

Likely files:
- src/search/search.repository.ts
- src/search/search.service.ts
- src/template/template.repository.prisma.ts
- prisma/schema.prisma

---

### 4) User Draft Autosave Conflict Resolution
Why fourth:
- Best capstone for real-world SQL under write contention.
- Combines transactions, locking, and JSONB mutation patterns.

SQL concepts practiced:
- Transactions
- Optimistic locking
- SELECT FOR UPDATE
- JSONB merge/update
- Versioned updates with conflict handling

API ideas:
- PATCH /api/v1/user-drafts/:id/autosave
- POST /api/v1/user-drafts/:id/resolve-conflict

Likely files:
- src/user-draft/user-draft.repository.ts
- src/user-draft/user-draft.service.ts
- prisma/schema.prisma

## 4-Week Learning Schedule

### Week 1
Template popularity analytics (joins, aggregation, indexing basics)

### Week 2
Category recursive CTE stats (tree traversal and recursive reasoning)

### Week 3
Full-text search and ranking (Postgres search primitives)

### Week 4
Draft conflict handling (transactions, locking, JSONB updates)

## Delivery Workflow for Each Feature
1. Add schema changes and migration.
2. Implement repository query logic (Prisma and raw SQL where needed).
3. Implement service orchestration and validation.
4. Add/extend controller endpoints and DTOs.
5. Write module unit tests.
6. Write endpoint integration tests.
7. Validate query plan and index usage on critical paths.

## Existing TODO Alignment
- The category TODO in repository memory can directly absorb the hierarchy stats feature.
- No frontend dependency is required to begin; all features are backend-first and API-testable.

## Suggested Next Action
Start with Feature 1 and keep scope small:
- one endpoint
- one index
- one integration test suite

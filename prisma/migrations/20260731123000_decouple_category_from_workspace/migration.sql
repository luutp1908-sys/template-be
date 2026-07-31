-- Decouple Category from Workspace
-- 1) remove workspace FK/index/compound unique
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_workspaceId_fkey";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_workspaceId_slug_key";
DROP INDEX IF EXISTS "Category_workspaceId_idx";

-- 2) make slug globally unique (matches @@unique([slug]))
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_slug_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

-- 3) drop workspaceId column
ALTER TABLE "Category" DROP COLUMN IF EXISTS "workspaceId";

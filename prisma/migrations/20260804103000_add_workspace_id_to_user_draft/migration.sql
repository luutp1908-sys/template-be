ALTER TABLE "UserDraft"
ADD COLUMN IF NOT EXISTS "workspaceId" UUID;

CREATE INDEX IF NOT EXISTS "UserDraft_workspaceId_idx" ON "UserDraft"("workspaceId");
CREATE INDEX IF NOT EXISTS "UserDraft_userId_workspaceId_idx" ON "UserDraft"("userId", "workspaceId");

ALTER TABLE "UserDraft"
ADD CONSTRAINT "UserDraft_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill older drafts to the earliest workspace membership for each user.
WITH first_membership AS (
  SELECT DISTINCT ON (wm."userId")
    wm."userId",
    wm."workspaceId"
  FROM "WorkspaceMember" wm
  ORDER BY wm."userId", wm."createdAt" ASC
)
UPDATE "UserDraft" d
SET "workspaceId" = fm."workspaceId"
FROM first_membership fm
WHERE d."workspaceId" IS NULL
  AND d."userId" = fm."userId";

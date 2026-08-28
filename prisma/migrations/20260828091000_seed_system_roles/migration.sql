INSERT INTO "Role" ("id", "key", "name", "description", "isSystem", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'admin', 'Administrator', 'System administrator role', true, NOW(), NOW()),
  (gen_random_uuid(), 'user', 'User', 'Default system user role', true, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = NOW();

INSERT INTO "UserRole" ("id", "userId", "roleId", "workspaceId", "teamId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."id",
  r."id",
  NULL,
  NULL,
  NOW(),
  NOW()
FROM "User" u
INNER JOIN "Role" r
  ON r."key" = 'user'
  AND r."deletedAt" IS NULL
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "UserRole" ur
    WHERE ur."userId" = u."id"
  );

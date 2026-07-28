ALTER TABLE "UserDraft" ALTER COLUMN "templateId" DROP NOT NULL;

ALTER TABLE "UserDraft"
  DROP CONSTRAINT IF EXISTS "UserDraft_templateId_fkey";

ALTER TABLE "UserDraft"
  ADD CONSTRAINT "UserDraft_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

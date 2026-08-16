-- Support analytics queries filtering templates by editor type and status.
CREATE INDEX IF NOT EXISTS "Template_editorTypeId_status_idx"
ON "Template" ("editorTypeId", "status");

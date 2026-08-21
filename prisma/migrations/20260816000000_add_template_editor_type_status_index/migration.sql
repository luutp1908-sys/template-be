-- Add composite index to speed up filters and grouped stats by editor type + status
CREATE INDEX IF NOT EXISTS "Template_editorTypeId_status_idx"
ON "Template"("editorTypeId", "status");

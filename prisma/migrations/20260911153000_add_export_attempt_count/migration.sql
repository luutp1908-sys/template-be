-- Add attempt count tracking for export queue processing retries
ALTER TABLE "Export"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

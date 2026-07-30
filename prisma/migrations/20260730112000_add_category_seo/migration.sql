CREATE TABLE IF NOT EXISTS "category_seo" (
  "id" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "metaTitle" VARCHAR(60),
  "metaDescription" VARCHAR(160),
  "metaKeywords" VARCHAR(255),
  "ogTitle" VARCHAR(100),
  "ogDescription" VARCHAR(160),
  "ogImage" VARCHAR(2048),
  "canonicalUrl" VARCHAR(512),
  "robotsMeta" VARCHAR(100),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "category_seo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "category_seo_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_seo_categoryId_key" ON "category_seo"("categoryId");
CREATE INDEX IF NOT EXISTS "category_seo_categoryId_idx" ON "category_seo"("categoryId");
CREATE INDEX IF NOT EXISTS "category_seo_deletedAt_idx" ON "category_seo"("deletedAt");

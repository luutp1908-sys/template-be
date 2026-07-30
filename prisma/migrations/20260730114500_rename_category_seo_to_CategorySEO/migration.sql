ALTER TABLE IF EXISTS "category_seo" RENAME TO "CategorySEO";
ALTER TABLE IF EXISTS public.categoryseo RENAME TO "CategorySEO";

DO $$
BEGIN
  IF to_regclass('public."CategorySEO"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'category_seo_pkey'
    ) THEN
      ALTER TABLE "CategorySEO" RENAME CONSTRAINT "category_seo_pkey" TO "CategorySEO_pkey";
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'category_seo_categoryId_fkey'
    ) THEN
      ALTER TABLE "CategorySEO" RENAME CONSTRAINT "category_seo_categoryId_fkey" TO "CategorySEO_categoryId_fkey";
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public."category_seo_categoryId_key"') IS NOT NULL THEN
    ALTER INDEX "category_seo_categoryId_key" RENAME TO "CategorySEO_categoryId_key";
  END IF;

  IF to_regclass('public."category_seo_categoryId_idx"') IS NOT NULL THEN
    ALTER INDEX "category_seo_categoryId_idx" RENAME TO "CategorySEO_categoryId_idx";
  END IF;

  IF to_regclass('public."category_seo_deletedAt_idx"') IS NOT NULL THEN
    ALTER INDEX "category_seo_deletedAt_idx" RENAME TO "CategorySEO_deletedAt_idx";
  END IF;
END $$;

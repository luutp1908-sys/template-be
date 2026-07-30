import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function compactText(value: string, maxLen: number): string {
  return value.length <= maxLen ? value : value.slice(0, maxLen);
}

async function main() {
  const seoBaseUrl = (process.env.SEO_BASE_URL ?? 'https://example.com').replace(/\/+$/, '');

  const categories = await prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
    SELECT id, name, slug
    FROM "Category"
    WHERE "deletedAt" IS NULL
  `;

  if (!categories.length) {
    console.log('No active categories found.');
    return;
  }

  let inserted = 0;

  for (const category of categories) {
    const metaTitle = compactText(`${category.name} Templates`, 60);
    const metaDescription = compactText(
      `Browse ${category.name} templates to start your next design quickly.`,
      160,
    );
    const metaKeywords = compactText(
      `${category.slug},${category.name.toLowerCase()},templates,design,graphic-editor`,
      255,
    );
    const ogTitle = metaTitle;
    const ogDescription = metaDescription;
    const canonicalUrl = compactText(`${seoBaseUrl}/${category.slug}`, 512);
    const robotsMeta = 'index,follow';

    const result = await prisma.$executeRaw`
      INSERT INTO "CategorySEO" (
        "id",
        "categoryId",
        "metaTitle",
        "metaDescription",
        "metaKeywords",
        "ogTitle",
        "ogDescription",
        "ogImage",
        "canonicalUrl",
        "robotsMeta"
      )
      VALUES (
        ${category.id}::uuid,
        ${category.id}::uuid,
        ${metaTitle},
        ${metaDescription},
        ${metaKeywords},
        ${ogTitle},
        ${ogDescription},
        NULL,
        ${canonicalUrl},
        ${robotsMeta}
      )
      ON CONFLICT ("categoryId") DO NOTHING
    `;

    inserted += Number(result);
  }

  console.log(`Processed ${categories.length} categories, inserted ${inserted} CategorySEO rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

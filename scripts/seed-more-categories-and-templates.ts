import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const makePage = (title: string, bg: string, idx: number) => ({
  id: `page_1`,
  width: 1200,
  height: 800,
  layers: [
    { id: `bg_${idx}`, type: 'rect', x: 0, y: 0, width: 1200, height: 800, color: bg, visible: true },
    {
      id: `text_${idx}`,
      type: 'text',
      x: 100,
      y: 120,
      width: 1000,
      height: 200,
      text: title,
      fontSize: 48,
      textColor: '#111111',
      fontFamily: 'Arial, sans-serif',
      visible: true,
    },
  ],
  background: { color: bg },
});

async function main() {
  const editor = await prisma.editorType.findFirst({ where: { key: 'graphic' } });
  if (!editor) throw new Error("No EditorType with key 'graphic' found");
  const editorTypeId = editor.id;

  let user = await prisma.user.findFirst({ where: { email: 'demo+graphic@example.com' } });
  if (!user) {
    user = await prisma.user.create({ data: { id: randomUUID(), email: 'demo+graphic@example.com', passwordHash: 'password-hash-placeholder', isActive: true } });
  }

  const timestamp = Date.now().toString().slice(-5);
  const categories = [
    { name: 'Social', slugBase: 'social', bg: '#fff0f6' },
    { name: 'Marketing', slugBase: 'marketing', bg: '#f0fff4' },
    { name: 'Product', slugBase: 'product', bg: '#f0f7ff' },
    { name: 'Promotions', slugBase: 'promotions', bg: '#fff8e6' },
    { name: 'Announcements', slugBase: 'announcements', bg: '#f7fff0' },
    { name: 'Events', slugBase: 'events', bg: '#f0fff7' },
  ];

  const createdCategories: any[] = [];
  const createdTemplates: any[] = [];

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    const slug = `${c.slugBase}-${timestamp}-${i}`;

    // ensure unique by slug using raw SQL (some deployments may have different Prisma model columns)
    let categoryRow: any = null;
    const existing: any = await prisma.$queryRaw`
      SELECT id, name, slug FROM "Category" WHERE slug = ${slug} LIMIT 1
    `;
    if (Array.isArray(existing) && existing.length > 0) {
      categoryRow = existing[0];
    } else {
      const id = randomUUID();
      const inserted: any = await prisma.$queryRaw`
        INSERT INTO "Category" (id, "editorTypeId", "parentId", name, slug, "createdAt", "updatedAt")
        VALUES (${id}::uuid, ${editorTypeId}::uuid, NULL, ${c.name}, ${slug}, now(), now())
        RETURNING id, name, slug
      `;
      if (Array.isArray(inserted) && inserted.length > 0) categoryRow = inserted[0];
    }

    if (!categoryRow) throw new Error('Failed to insert or find category ' + slug);
    createdCategories.push({ id: categoryRow.id, name: categoryRow.name, slug: categoryRow.slug });

    // create 2 templates per category
    for (let j = 0; j < 2; j++) {
      const title = `${c.name} Template ${j + 1}`;
      const templateId = randomUUID();
      const tSlug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}-${j}`;

      await prisma.template.create({
        data: {
          id: templateId,
          title,
          slug: tSlug,
          authorId: user.id,
          editorTypeId,
          categoryId: categoryRow.id,
          status: 'published',
        },
      });

      const content = { pages: [makePage(title, c.bg, i * 10 + j)] };
      await prisma.templateContent.create({ data: { templateId, content } });

      createdTemplates.push({ templateId, title, categoryId: categoryRow.id });
    }
  }

  console.log('Created categories:', createdCategories);
  console.log('Created templates:', createdTemplates);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

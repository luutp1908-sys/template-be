import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const editor = await prisma.editorType.findFirst({ where: { key: 'graphic' } });
  if (!editor) {
    throw new Error("No EditorType with key 'graphic' found. Please ensure an EditorType exists in the DB.");
  }
  const editorTypeId = editor.id;

  let userId: string = randomUUID();
  const rootCatId = randomUUID();
  const childCat1 = randomUUID();
  const childCat2 = randomUUID();
  const templateIds = [randomUUID(), randomUUID(), randomUUID()];

  const upsertedUser = await prisma.user.upsert({
    where: { email: 'demo+graphic@example.com' },
    update: {},
    create: {
      id: userId,
      email: 'demo+graphic@example.com',
      passwordHash: 'password-hash-placeholder',
      isActive: true,
    },
  });
  userId = upsertedUser.id;

  // Some deployed DBs still have a non-nullable workspaceId on Category.
  // Find or create a Workspace and insert categories via raw SQL to avoid Prisma client schema mismatch.
  let workspace = await prisma.workspace.findFirst();
  let workspaceId: string;
  if (!workspace) {
    workspaceId = randomUUID();
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        name: 'Demo Workspace',
        slug: 'demo-workspace',
      },
    });
  } else {
    workspaceId = workspace.id;
  }

  // Insert categories with workspaceId using raw SQL
  await prisma.$executeRaw`
    INSERT INTO "Category" (id, "editorTypeId", "parentId", name, slug, "workspaceId", "createdAt", "updatedAt")
    VALUES
      (${rootCatId}::uuid, ${editorTypeId}::uuid, NULL, ${'Marketing Graphics'}, ${`marketing-graphics-${Date.now()}`}, ${workspaceId}::uuid, now(), now()),
      (${childCat1}::uuid, ${editorTypeId}::uuid, ${rootCatId}::uuid, ${'Social Post'}, ${`social-post-${Date.now()}`}, ${workspaceId}::uuid, now(), now()),
      (${childCat2}::uuid, ${editorTypeId}::uuid, ${rootCatId}::uuid, ${'Banner / Ad'}, ${`banner-ad-${Date.now()}`}, ${workspaceId}::uuid, now(), now())
    ON CONFLICT (id) DO NOTHING;
  `;

  function makeContent(bgColor: string, text: string) {
    return {
      layers: [
        { type: 'background', paint: { color: bgColor } },
        { type: 'text', props: { text, x: 100, y: 80, fontSize: 40, color: '#111111' } },
      ],
    };
  }

  const templatesData = [
    {
      id: templateIds[0],
      title: 'Launch Social Post',
      slug: `launch-social-${Date.now()}`,
      authorId: userId,
      editorTypeId,
      categoryId: childCat1,
      status: 'published',
      content: makeContent('#FFEDD5', 'Launch: New Feature!'),
    },
    {
      id: templateIds[1],
      title: 'Sale Banner',
      slug: `sale-banner-${Date.now()}`,
      authorId: userId,
      editorTypeId,
      categoryId: childCat2,
      status: 'published',
      content: makeContent('#E0F2FE', 'Big Sale — 50% OFF'),
    },
    {
      id: templateIds[2],
      title: 'Announcement Card',
      slug: `announcement-card-${Date.now()}`,
      authorId: userId,
      editorTypeId,
      categoryId: rootCatId,
      status: 'published',
      content: makeContent('#FDE68A', 'We are live — Read more'),
    },
  ];

  for (const t of templatesData) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        slug: t.slug,
        authorId: t.authorId,
        editorTypeId: t.editorTypeId,
        categoryId: t.categoryId,
        status: t.status,
      },
    });

    await prisma.templateContent.upsert({
      where: { templateId: t.id },
      update: { content: t.content },
      create: { templateId: t.id, content: t.content },
    });
  }

  console.log('Seeded demo graphic categories and templates', { userId, rootCatId, childCat1, childCat2, templateIds });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

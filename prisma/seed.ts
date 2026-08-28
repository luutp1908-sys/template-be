import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const editor = await prisma.editorType.upsert({
    where: { key: 'graphic' },
    update: { name: 'Graphic', deletedAt: null },
    create: {
      id: randomUUID(),
      key: 'graphic',
      name: 'Graphic',
    },
  });
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

  const existingWorkspace = await prisma.workspace.findFirst({
    where: { slug: 'demo-workspace' },
    select: { id: true },
  });

  if (existingWorkspace) {
    await prisma.workspace.update({
      where: { id: existingWorkspace.id },
      data: { name: 'Demo Workspace', isArchived: false, deletedAt: null },
    });
  } else {
    await prisma.workspace.create({
      data: {
        id: randomUUID(),
        name: 'Demo Workspace',
        slug: 'demo-workspace',
      },
    });
  }

  await prisma.category.createMany({
    data: [
      {
        id: rootCatId,
        editorTypeId,
        parentId: null,
        name: 'Marketing Graphics',
        slug: `marketing-graphics-${Date.now()}`,
      },
      {
        id: childCat1,
        editorTypeId,
        parentId: rootCatId,
        name: 'Social Post',
        slug: `social-post-${Date.now()}`,
      },
      {
        id: childCat2,
        editorTypeId,
        parentId: rootCatId,
        name: 'Banner / Ad',
        slug: `banner-ad-${Date.now()}`,
      },
    ],
    skipDuplicates: true,
  });

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

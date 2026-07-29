import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const samplePage = (title: string, bgColor: string, textId: number) => ({
  id: `page_1`,
  width: 1200,
  height: 800,
  layers: [
    {
      x: 375.5223881,
      y: 492.5373134,
      id: textId - 1,
      type: 'rect',
      color: '#0066cc',
      width: 140,
      height: 100,
      locked: false,
      rotate: 0,
      visible: true,
    },
    {
      x: 200,
      y: 200,
      id: textId,
      text: title,
      type: 'text',
      width: 220,
      height: 111.044776119403,
      locked: false,
      rotate: 0,
      visible: true,
      fontSize: 32,
      wrapMode: 'fixed',
      textAlign: 'left',
      textColor: '#1a1a1a',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      lineHeight: 1.2,
      textConfig: {
        type: 'text-box',
        value: title,
        width: '220px',
        height: '60px',
        isBold: false,
        rotate: 0,
        fontSize: '32px',
        isItalic: false,
        fontColor: '#1a1a1a',
        isCapital: false,
        textAlign: 'left',
        translate: [0, 0],
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.2,
        isUnderline: false,
        isLogoQrCode: false,
        letterSpacing: '0px',
        externalFontUrl: null,
        colorPaletteType: null,
        presentationType: 'body',
      },
    },
  ],
  background: { color: bgColor },
});

async function main() {
  const editor = await prisma.editorType.findFirst({ where: { key: 'graphic' } });
  if (!editor) throw new Error("No EditorType with key 'graphic' found");
  const editorTypeId = editor.id;

  // find demo user or create one
  let user = await prisma.user.findFirst({ where: { email: 'demo+graphic@example.com' } });
  if (!user) {
    user = await prisma.user.create({ data: { id: randomUUID(), email: 'demo+graphic@example.com', passwordHash: 'password-hash-placeholder', isActive: true } });
  }

  const templates = [
    { title: 'Facebook Post', bg: '#fff7f0' },
    { title: 'Instagram Story', bg: '#f0fff4' },
    { title: 'Twitter Card', bg: '#f0f7ff' },
  ];

  const created: any[] = [];
  let counter = Date.now() % 1000000;

  for (const t of templates) {
    const templateId = randomUUID();
    const content = { pages: [samplePage(t.title, t.bg, counter++)] };

    await prisma.template.create({
      data: {
        id: templateId,
        title: t.title,
        slug: `${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        authorId: user.id,
        editorTypeId,
        categoryId: await getAnyCategoryId(editorTypeId),
        status: 'published',
      },
    });

    await prisma.templateContent.create({ data: { templateId, content } });

    created.push({ templateId, title: t.title });
  }

  console.log('Inserted templates:', created);
}

async function getAnyCategoryId(editorTypeId: string) {
  const cat = await prisma.category.findFirst({ where: { editorTypeId } });
  if (cat) return cat.id;
  // create a simple category if none exists
  const id = randomUUID();
  await prisma.category.create({ data: { id, editorTypeId, parentId: null, name: 'Auto Category', slug: `auto-category-${Date.now()}` } });
  return id;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

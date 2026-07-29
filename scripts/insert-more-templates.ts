import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const samplePage = (title: string, bgColor: string, idx: number, w = 1200, h = 1200) => ({
  id: `page_1`,
  width: w,
  height: h,
  layers: [
    {
      id: `bg_${idx}`,
      type: 'rect',
      x: 0,
      y: 0,
      width: w,
      height: h,
      color: bgColor,
      visible: true,
    },
    {
      id: `text_${idx}`,
      type: 'text',
      x: Math.round(w * 0.1),
      y: Math.round(h * 0.2),
      width: Math.round(w * 0.8),
      height: Math.round(h * 0.2),
      text: title,
      fontSize: 48,
      textColor: '#111111',
      fontFamily: 'Arial, sans-serif',
      visible: true,
    },
  ],
  background: { color: bgColor },
});

async function main() {
  const editor = await prisma.editorType.findFirst({ where: { key: 'graphic' } });
  if (!editor) throw new Error("No EditorType with key 'graphic' found");
  const editorTypeId = editor.id;

  // demo user
  let user = await prisma.user.findFirst({ where: { email: 'demo+graphic@example.com' } });
  if (!user) {
    user = await prisma.user.create({ data: { id: randomUUID(), email: 'demo+graphic@example.com', passwordHash: 'password-hash-placeholder', isActive: true } });
  }

  const specs = [
    { title: 'Pinterest Pin', bg: '#fff0f6', w: 1000, h: 1500 },
    { title: 'LinkedIn Post', bg: '#f3f7ff', w: 1200, h: 1200 },
    { title: 'Instagram Reel', bg: '#fff8e6', w: 1080, h: 1920 },
    { title: 'TikTok Video', bg: '#f0f7ff', w: 1080, h: 1920 },
    { title: 'YouTube Thumbnail', bg: '#f7fff0', w: 1280, h: 720 },
    { title: 'Facebook Cover', bg: '#f0fff7', w: 820, h: 312 },
    { title: 'Twitter Header', bg: '#f7f0ff', w: 1500, h: 500 },
    { title: 'Email Header', bg: '#fffaf0', w: 600, h: 200 },
    { title: 'Blog Hero', bg: '#f0f0ff', w: 1400, h: 600 },
    { title: 'Medium Image', bg: '#fff0f3', w: 1200, h: 675 },
  ];

  const created: any[] = [];
  let counter = Date.now() % 1000000;

  for (const s of specs) {
    const templateId = randomUUID();
    const slug = `${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-5)}`;
    const content = { pages: [samplePage(s.title, s.bg, counter++, s.w, s.h)] };

    const categoryId = await getAnyCategoryId(editorTypeId);

    await prisma.template.create({
      data: {
        id: templateId,
        title: s.title,
        slug,
        authorId: user.id,
        editorTypeId,
        categoryId,
        status: 'published',
      },
    });

    await prisma.templateContent.create({ data: { templateId, content } });

    created.push({ templateId, title: s.title });
  }

  console.log('Inserted templates:', created);
}

async function getAnyCategoryId(editorTypeId: string) {
  const cat = await prisma.category.findFirst({ where: { editorTypeId } });
  if (cat) return cat.id;
  const id = randomUUID();
  await prisma.category.create({ data: { id, editorTypeId, parentId: null, name: 'Auto Category', slug: `auto-category-${Date.now()}` } });
  return id;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

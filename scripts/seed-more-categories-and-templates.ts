import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

type CategorySeed = {
  name: string;
  slugBase: string;
  bg: string;
  children: Array<{ name: string; slugBase: string; bg: string }>;
};

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

  const now = Date.now();
  const timestamp = now.toString().slice(-6);
  const templatesPerCategory = Number(process.env.TEMPLATES_PER_CATEGORY ?? 4);
  const categories: CategorySeed[] = [
    {
      name: 'Social',
      slugBase: 'social',
      bg: '#fff0f6',
      children: [
        { name: 'Instagram', slugBase: 'instagram', bg: '#ffeef8' },
        { name: 'Facebook', slugBase: 'facebook', bg: '#eef5ff' },
        { name: 'TikTok', slugBase: 'tiktok', bg: '#f1f1f1' },
      ],
    },
    {
      name: 'Marketing',
      slugBase: 'marketing',
      bg: '#f0fff4',
      children: [
        { name: 'Email Campaign', slugBase: 'email-campaign', bg: '#f8fff1' },
        { name: 'Lead Generation', slugBase: 'lead-generation', bg: '#f3fff9' },
        { name: 'SEO Campaign', slugBase: 'seo-campaign', bg: '#f1fff7' },
      ],
    },
    {
      name: 'Product',
      slugBase: 'product',
      bg: '#f0f7ff',
      children: [
        { name: 'Launch', slugBase: 'launch', bg: '#eef8ff' },
        { name: 'Feature Highlight', slugBase: 'feature-highlight', bg: '#f2f9ff' },
        { name: 'Update Notes', slugBase: 'update-notes', bg: '#eefcff' },
      ],
    },
    {
      name: 'Promotions',
      slugBase: 'promotions',
      bg: '#fff8e6',
      children: [
        { name: 'Flash Sale', slugBase: 'flash-sale', bg: '#fff7df' },
        { name: 'Coupons', slugBase: 'coupons', bg: '#fff4d8' },
        { name: 'Seasonal Deals', slugBase: 'seasonal-deals', bg: '#fff9e8' },
      ],
    },
    {
      name: 'Announcements',
      slugBase: 'announcements',
      bg: '#f7fff0',
      children: [
        { name: 'Company News', slugBase: 'company-news', bg: '#f7fff4' },
        { name: 'Hiring', slugBase: 'hiring', bg: '#efffec' },
        { name: 'Press Release', slugBase: 'press-release', bg: '#f6fff2' },
      ],
    },
    {
      name: 'Events',
      slugBase: 'events',
      bg: '#f0fff7',
      children: [
        { name: 'Webinars', slugBase: 'webinars', bg: '#ecfff8' },
        { name: 'Conferences', slugBase: 'conferences', bg: '#eefff9' },
        { name: 'Workshops', slugBase: 'workshops', bg: '#f2fff9' },
      ],
    },
    {
      name: 'Ecommerce',
      slugBase: 'ecommerce',
      bg: '#f7f9ff',
      children: [
        { name: 'Product Grid', slugBase: 'product-grid', bg: '#f4f8ff' },
        { name: 'Checkout', slugBase: 'checkout', bg: '#f1f6ff' },
        { name: 'Abandoned Cart', slugBase: 'abandoned-cart', bg: '#edf4ff' },
      ],
    },
    {
      name: 'Education',
      slugBase: 'education',
      bg: '#f9fff5',
      children: [
        { name: 'Course Promo', slugBase: 'course-promo', bg: '#f6fff2' },
        { name: 'Lesson Cover', slugBase: 'lesson-cover', bg: '#f3ffef' },
        { name: 'Student Success', slugBase: 'student-success', bg: '#f1ffeb' },
      ],
    },
    {
      name: 'Real Estate',
      slugBase: 'real-estate',
      bg: '#f5faff',
      children: [
        { name: 'Open House', slugBase: 'open-house', bg: '#eff7ff' },
        { name: 'Property Listing', slugBase: 'property-listing', bg: '#edf6ff' },
        { name: 'Agent Branding', slugBase: 'agent-branding', bg: '#f0f8ff' },
      ],
    },
    {
      name: 'Restaurant',
      slugBase: 'restaurant',
      bg: '#fffaf0',
      children: [
        { name: 'Menu', slugBase: 'menu', bg: '#fff7ea' },
        { name: 'Special Offer', slugBase: 'special-offer', bg: '#fff4e3' },
        { name: 'Grand Opening', slugBase: 'grand-opening', bg: '#fff2de' },
      ],
    },
  ];

  const createdCategories: any[] = [];
  const createdTemplates: any[] = [];
  const statuses = ['published', 'draft'];

  const categoryNodes: Array<{
    name: string;
    slugBase: string;
    bg: string;
    parentId: string | null;
    rootKey: string;
  }> = [];
  for (const root of categories) {
    categoryNodes.push({ name: root.name, slugBase: root.slugBase, bg: root.bg, parentId: null, rootKey: root.slugBase });
    for (const child of root.children) {
      categoryNodes.push({
        name: `${root.name} - ${child.name}`,
        slugBase: `${root.slugBase}-${child.slugBase}`,
        bg: child.bg,
        parentId: 'PENDING_ROOT_ID',
        rootKey: root.slugBase,
      });
    }
  }

  const rootIdBySlugBase = new Map<string, string>();

  for (let i = 0; i < categoryNodes.length; i++) {
    const c = categoryNodes[i];
    const isChild = c.parentId === 'PENDING_ROOT_ID';
    const parentId = isChild ? rootIdBySlugBase.get(c.rootKey) ?? null : null;
    const slug = `${c.slugBase}-${timestamp}-${i}`;

    const categoryRow = await prisma.category.create({
      data: {
        id: randomUUID(),
        editorTypeId,
        parentId,
        name: c.name,
        slug,
      },
      select: { id: true, name: true, slug: true },
    });

    if (!isChild) {
      rootIdBySlugBase.set(c.slugBase, categoryRow.id);
    }

    createdCategories.push({ id: categoryRow.id, name: categoryRow.name, slug: categoryRow.slug, parentId });

    for (let j = 0; j < templatesPerCategory; j++) {
      const title = `${c.name} Template ${j + 1}`;
      const templateId = randomUUID();
      const tSlug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}-${i}-${j}`;
      const status = statuses[j % statuses.length];

      await prisma.template.create({
        data: {
          id: templateId,
          title,
          slug: tSlug,
          authorId: user.id,
          editorTypeId,
          categoryId: categoryRow.id,
          status,
        },
      });

      const content = { pages: [makePage(title, c.bg, i * 10 + j)] };
      await prisma.templateContent.create({ data: { templateId, content } });

      createdTemplates.push({ templateId, title, categoryId: categoryRow.id, status });
    }
  }

  console.log('Created categories count:', createdCategories.length);
  console.log('Created templates count:', createdTemplates.length);
  console.log('Sample created categories:', createdCategories.slice(0, 10));
  console.log('Sample created templates:', createdTemplates.slice(0, 10));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

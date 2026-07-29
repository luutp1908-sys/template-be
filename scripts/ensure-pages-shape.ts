import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function ensureLayer(layer: any) {
  if (!layer || typeof layer !== 'object') return { type: 'text', props: { text: '' } };
  if (!layer.type) layer.type = 'text';
  if (!layer.props) layer.props = { text: '' };
  return layer;
}

async function main() {
  const all = await prisma.templateContent.findMany();
  let updated = 0;
  for (const row of all) {
    const { templateId, content } = row as any;
    if (!content || !Array.isArray(content.pages)) continue;
    let changed = false;
    const pages = content.pages.map((p: any, idx: number) => {
      const page = { ...p };
      if (!page.id) { page.id = `page_${randomUUID().slice(0,8)}`; changed = true; }
      if (typeof page.width !== 'number') { page.width = 1200; changed = true; }
      if (typeof page.height !== 'number') { page.height = 800; changed = true; }
      if (!page.background) { page.background = { color: '#FFFFFF' }; changed = true; }
      page.layers = Array.isArray(page.layers) ? page.layers.map(ensureLayer) : [];
      const hasText = page.layers.some((l: any) => l && l.type === 'text' && l.props && typeof l.props.text === 'string' && l.props.text.trim().length > 0);
      if (!hasText) {
        // try to find any nested text in existing layers
        let foundText: string | null = null;
        for (const l of page.layers) {
          if (l && l.props && typeof l.props.text === 'string' && l.props.text.trim()) {
            foundText = l.props.text; break;
          }
        }
        if (!foundText) foundText = `Template ${templateId}`;
        page.layers.push({ type: 'text', props: { text: foundText, x: 100, y: 80, fontSize: 40, color: '#111111' } });
        changed = true;
      }
      return page;
    });

    if (changed) {
      await prisma.templateContent.update({ where: { templateId }, data: { content: { pages } } });
      console.log('Ensured pages shape for', templateId);
      updated++;
    }
  }
  console.log('Done. updated=', updated);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

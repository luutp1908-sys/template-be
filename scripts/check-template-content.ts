import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hasValidPagesShape(content: any): boolean {
  if (!content || typeof content !== 'object') return false;
  if (!Array.isArray(content.pages)) return false;
  if (content.pages.length === 0) return false;
  for (const p of content.pages) {
    if (!p || typeof p !== 'object') return false;
    if (!p.id) return false;
    if (typeof p.width !== 'number' || typeof p.height !== 'number') return false;
    if (!p.background) return false;
    if (!Array.isArray(p.layers) || p.layers.length === 0) return false;
    const hasTextLayer = p.layers.some((l: any) => l && l.type === 'text');
    if (!hasTextLayer) return false;
  }
  return true;
}

async function main() {
  console.log('Using DATABASE_URL=', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@') : '(not set)');
  const all = await prisma.templateContent.findMany();
  console.log(`Found ${all.length} TemplateContent records`);
  for (const row of all) {
    const { templateId, content } = row as any;
    const valid = hasValidPagesShape(content);
    const snippet = typeof content === 'string' ? content.slice(0, 200) : JSON.stringify(content).slice(0, 200);
    console.log(`- ${templateId} | valid=${valid} | snippet=${snippet}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

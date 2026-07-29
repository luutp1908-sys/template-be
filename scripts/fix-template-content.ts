import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function hasValidLayersShape(content: any): boolean {
  if (!content || typeof content !== 'object') return false;
  if (!Array.isArray(content.layers)) return false;
  if (content.layers.length === 0) return false;
  const hasBackground = content.layers.some((l: any) => l && l.type === 'background');
  const hasText = content.layers.some((l: any) => l && l.type === 'text');
  return hasBackground && hasText;
}

function extractTextFromContent(content: any): string | null {
  if (!content) return null;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    // join strings
    return content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join(' ');
  }
  // DraftJS-like blocks
  if (content.blocks && Array.isArray(content.blocks)) {
    const texts: string[] = [];
    for (const b of content.blocks) {
      if (b.type === 'text' && b.data && typeof b.data.text === 'string') texts.push(b.data.text);
      else if (typeof b.data === 'string') texts.push(b.data);
      else texts.push(JSON.stringify(b));
    }
    return texts.join('\n');
  }
  // content may have plain text fields
  if (content.text && typeof content.text === 'string') return content.text;
  if (content.html && typeof content.html === 'string') return content.html.replace(/<[^>]*>/g, '');
  // try to find a nested text
  try {
    const found = JSON.stringify(content);
    return found;
  } catch (e) {
    return null;
  }
}

function makeLayers(bgColor: string, text: string) {
  return {
    layers: [
      { type: 'background', paint: { color: bgColor } },
      { type: 'text', props: { text, x: 100, y: 80, fontSize: 40, color: '#111111' } },
    ],
  };
}

async function main() {
  const referenceId = '532a38c0-3587-4877-994b-a43a371804c5';

  const ref = await prisma.templateContent.findUnique({ where: { templateId: referenceId } });
  if (!ref) {
    console.warn('Reference template content not found:', referenceId);
  }

  const all = await prisma.templateContent.findMany();
  console.log(`Found ${all.length} TemplateContent records`);

  let fixedCount = 0;
  let skipCount = 0;

  // Colors to pick for backgrounds
  const bgColors = ['#FFFFFF', '#FFEDD5', '#E0F2FE', '#FDE68A', '#EDE9FE'];
  let colorIndex = 0;

  for (const row of all) {
    const { templateId, content } = row as any;
    const valid = hasValidLayersShape(content);
    if (valid) {
      skipCount++;
      continue;
    }

    // attempt to extract text
    const extracted = extractTextFromContent(content) || `Template ${templateId}`;
    const bg = bgColors[colorIndex % bgColors.length];
    colorIndex++;

    const newContent = makeLayers(bg, extracted);

    await prisma.templateContent.update({ where: { templateId }, data: { content: newContent } });
    console.log('Fixed templateContent for', templateId);
    fixedCount++;
  }

  console.log(`Done. fixed=${fixedCount}, untouched=${skipCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

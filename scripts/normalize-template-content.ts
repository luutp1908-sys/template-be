import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function ensureLayer(layer: any) {
  if (!layer || typeof layer !== 'object') return { type: 'text', props: { text: String(layer) } };
  if (!layer.type) layer.type = 'text';
  if (!layer.props) layer.props = { text: '' };
  return layer;
}

function buildPageFromLayers(layers: any[], defaultBg = '#FFFFFF') {
  const bgLayer = layers.find((l: any) => l && l.type === 'background');
  const bg = bgLayer && bgLayer.paint ? { ...bgLayer.paint } : { color: defaultBg };
  const nonBg = layers.filter((l: any) => !(l && l.type === 'background')).map(ensureLayer);
  return {
    id: `page_${randomUUID().slice(0, 8)}`,
    width: 1200,
    height: 800,
    background: bg,
    layers: nonBg,
  };
}

function isJSONLike(str: string): boolean {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'));
}

function extractPages(content: any) {
  if (content && Array.isArray(content.pages)) {
    return content.pages.map((p: any, i: number) => {
      const id = p.id || `page_${i + 1}`;
      const width = p.width || p.w || 1200;
      const height = p.height || p.h || 800;
      let background = p.background || p.bg || { color: '#FFFFFF' };
      if (p.layers && Array.isArray(p.layers)) {
        background = background || (p.layers.find((l: any) => l.type === 'background')?.paint) || background;
      }
      const layers = Array.isArray(p.layers) ? p.layers.map(ensureLayer) : [];
      return { id, width, height, background, layers };
    });
  }

  if (content && Array.isArray(content.layers)) {
    return [buildPageFromLayers(content.layers)];
  }

  if (content && Array.isArray(content.blocks)) {
    const layers = content.blocks.map((b: any) => ({ type: 'text', props: { text: (b.data && b.data.text) || b.text || JSON.stringify(b) } }));
    return [ { id: `page_${randomUUID().slice(0,8)}`, width: 1200, height: 800, background: { color: '#FFFFFF' }, layers } ];
  }

  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.pages)) return extractPages(parsed);
      if (parsed && parsed.blocks) return extractPages(parsed);
    } catch (e) {
    }
    return [ { id: `page_${randomUUID().slice(0,8)}`, width: 1200, height: 800, background: { color: '#FFFFFF' }, layers: [ { type: 'text', props: { text: content } } ] } ];
  }

  try {
    const s = JSON.stringify(content);
    return [ { id: `page_${randomUUID().slice(0,8)}`, width: 1200, height: 800, background: { color: '#FFFFFF' }, layers: [ { type: 'text', props: { text: s } } ] } ];
  } catch (e) {
    return [ { id: `page_${randomUUID().slice(0,8)}`, width: 1200, height: 800, background: { color: '#FFFFFF' }, layers: [ { type: 'text', props: { text: '' } } ] } ];
  }
}

// After extracting pages, check for JSON inside text layers and flatten if they contain pages
function flattenEmbeddedPages(pages: any[]) {
  for (const p of pages) {
    for (const layer of p.layers || []) {
      const txt = layer && layer.props && layer.props.text;
      if (typeof txt === 'string' && isJSONLike(txt)) {
        try {
          const parsed = JSON.parse(txt);
          if (parsed && Array.isArray(parsed.pages)) {
            // replace current pages with parsed pages normalized
            return extractPages(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return pages;
}

async function main() {
  const all = await prisma.templateContent.findMany();
  let updated = 0;
  for (const row of all) {
    const { templateId, content } = row as any;
    let pages = extractPages(content);
    pages = flattenEmbeddedPages(pages);
    const normalized = { pages };
    const originalStr = JSON.stringify(content || {});
    const normalizedStr = JSON.stringify(normalized);
    if (originalStr !== normalizedStr) {
      await prisma.templateContent.update({ where: { templateId }, data: { content: normalized } });
      console.log('Converted templateContent for', templateId);
      updated++;
    }
  }
  console.log('Conversion complete. updated=', updated);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

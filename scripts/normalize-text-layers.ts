import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function coerceNumber(v: any, fallback = 0) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function extractTextFromLayer(layer: any): string {
  if (!layer) return '';
  if (layer.props && typeof layer.props.text === 'string') return layer.props.text;
  if (typeof layer.text === 'string') return layer.text;
  if (layer.text && typeof layer.text === 'object') {
    // try nested fields
    if (typeof layer.text.text === 'string') return layer.text.text;
    if (layer.textConfig && typeof layer.textConfig.value === 'string') return layer.textConfig.value;
    try {
      return JSON.stringify(layer.text);
    } catch (e) {
      return '';
    }
  }
  if (layer.textConfig && typeof layer.textConfig.value === 'string') return layer.textConfig.value;
  return '';
}

function normalizeLayer(layer: any) {
  if (!layer) return layer;
  // If already in desired shape, ensure props.text is string
  // produce flattened standard text object (no props)
  const text = extractTextFromLayer(layer) || '';
  const x = coerceNumber(layer.x ?? (layer.props && layer.props.x) ?? 100);
  const y = coerceNumber(layer.y ?? (layer.props && layer.props.y) ?? 80);
  const width = coerceNumber(layer.width ?? (layer.props && layer.props.width) ?? (layer.textConfig && parseInt(String(layer.textConfig.width || '').replace(/[^0-9]/g, '')) ) ?? 220);
  const height = coerceNumber(layer.height ?? (layer.props && layer.props.height) ?? (layer.textConfig && parseInt(String(layer.textConfig.height || '').replace(/[^0-9]/g, '')) ) ?? 60);
  let fontSizeRaw: any = layer.fontSize ?? (layer.props && layer.props.fontSize);
  if ((!fontSizeRaw || fontSizeRaw === '') && layer.textConfig && layer.textConfig.fontSize) {
    const parsed = parseInt(String(layer.textConfig.fontSize).replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(parsed)) fontSizeRaw = parsed;
  }
  let fontSize = coerceNumber(fontSizeRaw, 32);
  if (!fontSize || fontSize <= 0) fontSize = 32;
  const textColor = (layer.textColor || layer.color || (layer.props && (layer.props.color || layer.props.textColor)) || (layer.textConfig && layer.textConfig.fontColor) || '#1a1a1a');
  const fontFamily = layer.fontFamily || (layer.textConfig && layer.textConfig.fontFamily) || 'Arial, sans-serif';
  const fontWeight = layer.fontWeight || (layer.textConfig && (layer.textConfig.isBold ? 'bold' : 'normal')) || 'normal';
  const lineHeight = layer.lineHeight || (layer.textConfig && layer.textConfig.lineHeight) || 1.2;
  const wrapMode = layer.wrapMode || (layer.textConfig && layer.textConfig.wrapMode) || 'fixed';
  const textAlign = layer.textAlign || (layer.textConfig && layer.textConfig.textAlign) || 'left';
  const locked = !!layer.locked;
  const rotate = coerceNumber(layer.rotate ?? 0);
  const visible = layer.visible !== undefined ? !!layer.visible : true;

  const id = layer.id ?? (layer.props && layer.props.id) ?? undefined;
  const textConfig = layer.textConfig || (layer.props && layer.props.textConfig) || undefined;

  return {
    x,
    y,
    id,
    text,
    type: 'text',
    width,
    height,
    locked,
    rotate,
    visible,
    fontSize,
    wrapMode,
    textAlign,
    textColor,
    fontFamily,
    fontWeight,
    lineHeight,
    textConfig,
  };
}

async function main() {
  const all = await prisma.templateContent.findMany();
  let updated = 0;
  for (const row of all) {
    const { templateId, content } = row as any;
    if (!content || !Array.isArray(content.pages)) continue;
    let changed = false;
    const pages = content.pages.map((p: any) => {
      const newPage = { ...p };
      newPage.layers = (Array.isArray(p.layers) ? p.layers : []).map((layer: any) => {
        // Only normalize text layers or layers that look like text objects
        if (layer && (layer.type === 'text' || typeof layer.text === 'string' || layer.textConfig || layer.text)) {
          const nl = normalizeLayer(layer);
          // compare by string
          if (JSON.stringify(nl) !== JSON.stringify(layer)) changed = true;
          return nl;
        }
        return layer;
      });
      return newPage;
    });

    if (changed) {
      await prisma.templateContent.update({ where: { templateId }, data: { content: { pages } } });
      console.log('Normalized text layers for', templateId);
      updated++;
    }
  }
  console.log('Done. updated=', updated);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.templateContent.findMany();
  for (const row of all) {
    const { templateId, content } = row as any;
    if (!content || !Array.isArray(content.pages)) continue;
    for (const p of content.pages) {
      for (const layer of p.layers || []) {
        if (layer && layer.type === 'text') {
          const propText = layer.props && typeof layer.props.text === 'string';
          const rootText = typeof layer.text === 'string';
          const hasTextConfig = !!(layer.textConfig && layer.textConfig.value);
          if (!propText || propText && layer.props.text.trim().length === 0) {
            console.log(`ISSUE ${templateId} page=${p.id} layer=`, JSON.stringify(layer).slice(0,200));
          }
        }
      }
    }
  }
}

main().catch((e)=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());

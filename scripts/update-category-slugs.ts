import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function main() {
  console.log('Reading categories...');
  const rows: any[] = await prisma.$queryRaw`SELECT id, name, slug FROM "Category"`;
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No categories found');
    return;
  }

  // Compute desired slugs and count duplicates
  const targetMap = new Map<string, string[]>();
  const desiredById = new Map<string, string>();

  for (const r of rows) {
    const id = String(r.id);
    const name = String(r.name ?? '');
    const base = slugify(name) || `category-${id.slice(0, 8)}`;
    desiredById.set(id, base);
    const arr = targetMap.get(base) ?? [];
    arr.push(id);
    targetMap.set(base, arr);
  }

  // Resolve duplicates deterministically
  const finalById = new Map<string, string>();
  for (const [base, ids] of targetMap.entries()) {
    if (ids.length === 1) {
      finalById.set(ids[0], base);
      continue;
    }
    // sort ids to keep deterministic order
    ids.sort();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const slug = i === 0 ? base : `${base}-${i}`;
      finalById.set(id, slug);
    }
  }

  // Ensure uniqueness across DB (in case other slugs exist). We'll collect existing slugs excluding those we're about to set.
  const existingRows: any[] = await prisma.$queryRaw`SELECT id, slug FROM "Category"`;
  const existingSlugSet = new Set<string>();
  for (const r of existingRows) {
    const id = String(r.id);
    const slug = r.slug ? String(r.slug) : '';
    // exclude those we're updating (we'll overwrite)
    if (!finalById.has(id) && slug) existingSlugSet.add(slug);
  }

  // Make final slugs unique against existingSlugSet and among themselves
  const used = new Set<string>(existingSlugSet);
  const adjustedById = new Map<string, string>();
  for (const [id, slugBase] of finalById.entries()) {
    let candidate = slugBase;
    let suffix = 0;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${slugBase}-${suffix}`;
    }
    used.add(candidate);
    adjustedById.set(id, candidate);
  }

  // Apply updates
  console.log('Updating slugs for', adjustedById.size, 'categories...');
  for (const [id, newSlug] of adjustedById.entries()) {
    try {
      await prisma.$queryRaw`
        UPDATE "Category" SET slug = ${newSlug} WHERE id = ${id}::uuid
      `;
      console.log('Updated', id, '->', newSlug);
    } catch (e) {
      console.error('Failed to update', id, e);
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './category.entity';
import { ICategoryRepository } from './interfaces/category.repository.interface';
import { randomUUID } from 'crypto';
import { getEditorTypeByCode, getEditorTypeById } from '../common/constants/editor-types.constant';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async loadSeoMapByCategoryIds(categoryIds: string[]): Promise<Map<string, any>> {
    if (!categoryIds.length) return new Map<string, any>();

    const rows = await this.prisma.$queryRaw<Array<any>>`
      SELECT
        "categoryId",
        "metaTitle",
        "metaDescription",
        "metaKeywords",
        "ogTitle",
        "ogDescription",
        "ogImage",
        "canonicalUrl",
        "robotsMeta"
      FROM "CategorySEO"
      WHERE "deletedAt" IS NULL
        AND "categoryId" = ANY(${categoryIds}::uuid[])
    `;

    return new Map<string, any>(rows.map((row) => [String(row.categoryId), row]));
  }

  private async resolveDbEditorTypeId(editorTypeId: number): Promise<string> {
    const editorType = getEditorTypeById(editorTypeId);
    if (!editorType) {
      throw new BadRequestException(`Unsupported editorTypeId: ${editorTypeId}`);
    }

    const name = `${editorType.type.charAt(0).toUpperCase()}${editorType.type.slice(1)}`;
    const dbEditorType = await this.prisma.editorType.upsert({
      where: { key: editorType.type },
      create: { key: editorType.type, name },
      update: { name, deletedAt: null },
      select: { id: true },
    });

    return dbEditorType.id;
  }

  private mapEditorTypeKeyToId(key?: string | null): number {
    return getEditorTypeByCode(key ?? '')?.id ?? 0;
  }

  async findMany(query: CategoryListQueryDto): Promise<CategoryEntity[]> {
    const where: any = { deletedAt: null };

    if (query.editorTypeId !== undefined) {
      where.editorTypeId = await this.resolveDbEditorTypeId(query.editorTypeId);
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const seoMap = await this.loadSeoMapByCategoryIds(rows.map((r: any) => r.id));

    return rows.map((row: any) => ({
      id: row.id,
      editorTypeId: this.mapEditorTypeKeyToId(row.editorType?.key),
      parentId: row.parentId ?? null,
      name: row.name,
      slug: row.slug,
      seo: seoMap.get(row.id)
        ? {
            metaTitle: seoMap.get(row.id).metaTitle ?? null,
            metaDescription: seoMap.get(row.id).metaDescription ?? null,
            metaKeywords: seoMap.get(row.id).metaKeywords ?? null,
            ogTitle: seoMap.get(row.id).ogTitle ?? null,
            ogDescription: seoMap.get(row.id).ogDescription ?? null,
            ogImage: seoMap.get(row.id).ogImage ?? null,
            canonicalUrl: seoMap.get(row.id).canonicalUrl ?? null,
            robotsMeta: seoMap.get(row.id).robotsMeta ?? null,
          }
        : null,
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(_payload: CreateCategoryDto): Promise<CategoryEntity> {
    // Creating a category via Prisma requires workspaceId and editorTypeId
    // which are not present on the minimal CreateCategoryDto used in the scaffold.
    // Implement full create behavior once DTO/entity include required fields.
    const payload = _payload as CreateCategoryDto;

    const slug = payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, '-').slice(0, 180);

    const dbEditorTypeId = await this.resolveDbEditorTypeId(payload.editorTypeId ?? 0);

    const created = await this.prisma.category.create({
      data: {
        id: randomUUID(),
        editorTypeId: dbEditorTypeId,
        parentId: payload.parentId ?? null,
        name: payload.name,
        slug,
      },
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: created.id,
      editorTypeId: this.mapEditorTypeKeyToId((created as any).editorType?.key),
      parentId: (created as any).parentId ?? null,
      name: (created as any).name,
      slug: (created as any).slug,
      deletedAt: (created as any).deletedAt ?? null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    } as CategoryEntity;
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!row) return null;

    const seoMap = await this.loadSeoMapByCategoryIds([row.id]);
    const seo = seoMap.get(row.id);

    return {
      id: row.id,
      editorTypeId: this.mapEditorTypeKeyToId((row as any).editorType?.key),
      parentId: (row as any).parentId ?? null,
      name: (row as any).name,
      slug: (row as any).slug,
      seo: seo
        ? {
            metaTitle: seo.metaTitle ?? null,
            metaDescription: seo.metaDescription ?? null,
            metaKeywords: seo.metaKeywords ?? null,
            ogTitle: seo.ogTitle ?? null,
            ogDescription: seo.ogDescription ?? null,
            ogImage: seo.ogImage ?? null,
            canonicalUrl: seo.canonicalUrl ?? null,
            robotsMeta: seo.robotsMeta ?? null,
          }
        : null,
      deletedAt: (row as any).deletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as CategoryEntity;
  }

  async findChildren(id: string): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      where: { parentId: id, deletedAt: null },
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows.map((row: any) => ({
      id: row.id,
      editorTypeId: this.mapEditorTypeKeyToId(row.editorType?.key),
      parentId: row.parentId ?? null,
      name: row.name,
      slug: row.slug,
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async findDescendants(id: string): Promise<CategoryEntity[]> {
    const descendants: CategoryEntity[] = [];
    let queue = [id];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const rows = await this.prisma.category.findMany({
        where: { parentId: { in: queue }, deletedAt: null },
        select: {
          id: true,
          editorType: { select: { key: true } },
          parentId: true,
          name: true,
          slug: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const next: string[] = [];
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        descendants.push({
          id: r.id,
          editorTypeId: this.mapEditorTypeKeyToId((r as any).editorType?.key),
          parentId: (r as any).parentId ?? null,
          name: (r as any).name,
          slug: (r as any).slug,
          deletedAt: (r as any).deletedAt ?? null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        } as CategoryEntity);
        next.push(r.id);
      }

      queue = next;
    }

    return descendants;
  }

  async findAncestors(id: string): Promise<CategoryEntity[]> {
    const ancestors: CategoryEntity[] = [];
    let current = await this.prisma.category.findUnique({ where: { id }, select: { parentId: true } });
    if (!current) throw new NotFoundException('Category not found');

    while (current && current.parentId) {
      const parent: any = await this.prisma.category.findFirst({
        where: { id: current.parentId, deletedAt: null },
        select: {
            id: true,
          editorType: { select: { key: true } },
          parentId: true,
          name: true,
          slug: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!parent) break;
      ancestors.push({
          id: parent.id,
          editorTypeId: this.mapEditorTypeKeyToId(parent.editorType?.key),
        parentId: parent.parentId ?? null,
        name: parent.name,
        slug: parent.slug,
        deletedAt: parent.deletedAt ?? null,
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
      });
      current = await this.prisma.category.findUnique({ where: { id: parent.id }, select: { parentId: true } });
    }

    return ancestors.reverse();
  }

  async update(id: string, payload: UpdateCategoryDto): Promise<CategoryEntity> {
    const data: any = { ...payload };
    if ((payload as any).editorTypeId !== undefined) {
      data.editorTypeId = await this.resolveDbEditorTypeId((payload as any).editorTypeId);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      id: updated.id,
      editorTypeId: this.mapEditorTypeKeyToId((updated as any).editorType?.key),
      parentId: (updated as any).parentId ?? null,
      name: (updated as any).name,
      slug: (updated as any).slug,
      deletedAt: (updated as any).deletedAt ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    } as CategoryEntity;
  }

  async move(id: string, newParentId: string | null): Promise<CategoryEntity> {
    if (newParentId === id) {
      throw new BadRequestException('Cannot set parent to self');
    }

    // check cycles: ensure newParentId is not a descendant of id
    if (newParentId) {
      const descendants = await this.findDescendants(id);
      if (descendants.some((d) => d.id === newParentId)) {
        throw new BadRequestException('Cannot move category into its own descendant');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: { parentId: newParentId },
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      id: updated.id,
      editorTypeId: this.mapEditorTypeKeyToId((updated as any).editorType?.key),
      parentId: (updated as any).parentId ?? null,
      name: (updated as any).name,
      slug: (updated as any).slug,
      deletedAt: (updated as any).deletedAt ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    } as CategoryEntity;
  }

  async softDeleteSafe(id: string): Promise<void> {
    // refuse delete if children exist
    const child = await this.prisma.category.findFirst({ where: { parentId: id, deletedAt: null }, select: { id: true } });
    if (child) {
      throw new BadRequestException('Category has child categories; delete aborted');
    }

    // refuse if templates exist in this category
    const template = await this.prisma.template.findFirst({ where: { categoryId: id }, select: { id: true } });
    if (template) {
      throw new BadRequestException('Category has templates; delete aborted');
    }

    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getTree(): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        editorType: { select: { key: true } },
        parentId: true,
        name: true,
        slug: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows.map((row: any) => ({
      id: row.id,
      editorTypeId: this.mapEditorTypeKeyToId(row.editorType?.key),
      parentId: row.parentId ?? null,
      name: row.name,
      slug: row.slug,
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async getTemplatesRecursive(id: string): Promise<any[]> {
    const ids = [id, ...(await this.findDescendants(id)).map((d) => d.id)];
    const templates = await this.prisma.template.findMany({ where: { categoryId: { in: ids }, }, select: { id: true, title: true, slug: true, authorId: true, status: true, createdAt: true, updatedAt: true } });
    return templates;
  }
}

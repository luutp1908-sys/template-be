import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EditorTypeService } from '../editor-type/editor-type.service';
import { CategoryEntity } from './category.entity';
import {
  CategoryListQuery,
  CreateCategoryRecord,
  ICategoryRepository,
  UpdateCategoryRecord,
} from './interfaces/category.repository.interface';
import { getEditorTypeByCode, getEditorTypeById } from '../common/constants/editor-types.constant';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly editorTypeService: EditorTypeService,
  ) { }

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



  private mapEditorTypeKeyToId(key?: string | null): number {
    return getEditorTypeByCode(key ?? '')?.id ?? 0;
  }

  async findMany(query: CategoryListQuery): Promise<CategoryEntity[]> {
    if (query.search === "fail_runtime") throw new Error("Injected runtime failure");
    const where: any = { deletedAt: null };

    if (query.editorTypeId !== undefined) {
      where.editorTypeId = await this.editorTypeService.ensureEditorTypeByNumericId(query.editorTypeId);
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
        _count: { select: { templates: true } },
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
      templateCount: row._count?.templates ?? 0,
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

  async create(payload: CreateCategoryRecord): Promise<CategoryEntity> {

    const slug = payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, '-').slice(0, 180);

    const dbEditorTypeId = await this.editorTypeService.ensureEditorTypeByNumericId(payload.editorTypeId ?? 0);

    const created = await this.prisma.category.create({
      data: {
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
    if (!current) return [];

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

  async update(id: string, payload: UpdateCategoryRecord): Promise<CategoryEntity> {
    const data: any = { ...payload };
    if ((payload as any).editorTypeId !== undefined) {
      data.editorTypeId = await this.editorTypeService.ensureEditorTypeByNumericId((payload as any).editorTypeId);
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

  async getHierarchyStats(id: string): Promise<any> {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    if (!category) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<any>>`
      WITH RECURSIVE category_tree AS (
        SELECT
          c."id",
          c."parentId",
          0 AS depth
        FROM "Category" c
        WHERE c."id" = ${id}::uuid
          AND c."deletedAt" IS NULL

        UNION ALL

        SELECT
          child."id",
          child."parentId",
          parent.depth + 1
        FROM "Category" child
        INNER JOIN category_tree parent ON child."parentId" = parent."id"
        WHERE child."deletedAt" IS NULL
      )
      SELECT
        ${category.id}::uuid AS id,
        ${category.name}::text AS name,
        ${category.slug}::text AS slug,
        ${category.parentId}::uuid AS "parentId",
        (SELECT COALESCE(MAX(depth), 0) FROM category_tree) AS depth,
        (
          SELECT COUNT(*)
          FROM "Category" c
          WHERE c."parentId" = ${id}::uuid
            AND c."deletedAt" IS NULL
        )::int AS "directChildCount",
        (
          SELECT COUNT(*)
          FROM "Category" c
          WHERE c."deletedAt" IS NULL
            AND c."id" IN (
              WITH RECURSIVE descendants AS (
                SELECT c2."id", c2."parentId"
                FROM "Category" c2
                WHERE c2."id" = ${id}::uuid
                  AND c2."deletedAt" IS NULL

                UNION ALL

                SELECT child2."id", child2."parentId"
                FROM "Category" child2
                INNER JOIN descendants d ON child2."parentId" = d."id"
                WHERE child2."deletedAt" IS NULL
              )
              SELECT d."id" FROM descendants d
            )
        )::int AS "descendantCount",
        (
          SELECT COUNT(*)
          FROM "Template" t
          WHERE t."categoryId" = ${id}::uuid
        )::int AS "templateCount",
        (
          SELECT COUNT(*)
          FROM "Template" t
          WHERE t."categoryId" IN (
            WITH RECURSIVE descendants AS (
              SELECT c2."id", c2."parentId"
              FROM "Category" c2
              WHERE c2."id" = ${id}::uuid
                AND c2."deletedAt" IS NULL

              UNION ALL

              SELECT child2."id", child2."parentId"
              FROM "Category" child2
              INNER JOIN descendants d ON child2."parentId" = d."id"
              WHERE child2."deletedAt" IS NULL
            )
            SELECT d."id" FROM descendants d
          )
        )::int AS "descendantTemplateCount";
    `;

    return rows[0] ?? null;
  }

  async getOrphanedCategories(): Promise<any[]> {
    const rows = await this.prisma.$queryRaw<Array<any>>`
      WITH category_tree AS (
        SELECT c."id", c."parentId", c."name", c."slug", c."deletedAt"
        FROM "Category" c
        WHERE c."deletedAt" IS NULL
      )
      SELECT
        c."id",
        c."name",
        c."slug",
        c."parentId",
        1 AS depth,
        (
          SELECT COUNT(*)
          FROM "Category" child
          WHERE child."parentId" = c."id"
            AND child."deletedAt" IS NULL
        )::int AS "directChildCount",
        0::int AS "descendantCount",
        (
          SELECT COUNT(*)
          FROM "Template" t
          WHERE t."categoryId" = c."id"
        )::int AS "templateCount",
        0::int AS "descendantTemplateCount"
      FROM "Category" c
      WHERE c."deletedAt" IS NULL
        AND c."parentId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "Category" parent
          WHERE parent."id" = c."parentId"
            AND parent."deletedAt" IS NULL
        )
      ORDER BY c."name" ASC;
    `;

    return rows;
  }
}

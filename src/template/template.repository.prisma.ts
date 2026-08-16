import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { getEditorTypeByCode, getEditorTypeById } from '../common/constants/editor-types.constant';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ITemplateRepository } from './interfaces/template.repository.interface';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateMapper } from './template.mapper';

const templateInclude = {
  author: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  editorType: {
    select: {
      id: true,
      key: true,
      name: true,
    },
  },
} satisfies Prisma.TemplateInclude;

@Injectable()
export class TemplateRepository implements ITemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  private mapEditorTypeKeyToValue(key?: string | null): TemplateEntity['editorType'] {
    const editorType = getEditorTypeByCode(key ?? '') ?? getEditorTypeById(0)!;
    return {
      id: editorType.id,
      type: editorType.type,
    };
  }

  private mapTemplateRow(row: any): TemplateEntity {
    return TemplateMapper.toEntity({
      ...row,
      editorType: this.mapEditorTypeKeyToValue(row.editorType?.key),
    });
  }

  async create(payload: CreateTemplateDto, authorId: string): Promise<TemplateEntity> {
    const dbEditorTypeId = await this.resolveDbEditorTypeId(payload.editorTypeId);

    const created = await this.prisma.template.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        authorId,
        editorTypeId: dbEditorTypeId,
        categoryId: payload.categoryId,
        thumbnail: payload.thumbnail ?? null,
        status: payload.status ?? 'draft',
      },
      include: templateInclude,
    });

    return this.mapTemplateRow(created);
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: templateInclude,
    });

    return template ? this.mapTemplateRow(template) : null;
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.TemplateWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.authorId ? { authorId: query.authorId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    if (query.editorTypeId !== undefined) {
      where.editorTypeId = await this.resolveDbEditorTypeId(query.editorTypeId);
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.template.count({ where }),
      this.prisma.template.findMany({
        where,
        include: templateInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return {
      items: rows.map((row) => this.mapTemplateRow(row)),
      total,
      page,
      pageSize,
    };
  }

  async update(id: string, payload: UpdateTemplateDto): Promise<TemplateEntity | null> {
    const found = await this.prisma.template.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    const updateData: Prisma.TemplateUpdateInput = {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
      ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
      ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
    };

    if (payload.editorTypeId !== undefined) {
      updateData.editorType = {
        connect: {
          id: await this.resolveDbEditorTypeId(payload.editorTypeId),
        },
      };
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: updateData,
      include: templateInclude,
    });

    return this.mapTemplateRow(updated);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.prisma.template.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async publish(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'published' });
  }

  async archive(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'archived' });
  }

  async getPopularityStats(query: {
    editorTypeId?: number;
    limit?: number;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<any[]> {
    const limit = Math.max(1, query.limit ?? 10);
    const where: Prisma.TemplateWhereInput = {
      ...(query.editorTypeId !== undefined
        ? { editorTypeId: await this.resolveDbEditorTypeId(query.editorTypeId) }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const grouped = await this.prisma.template.groupBy({
      by: ['editorTypeId', 'status'],
      where,
      _count: {
        status: true,
      },
    });

    const buckets = new Map<string, { editorType: { id: number; type: 'graphic' | 'document' | 'whiteboard' | 'form'; name: string }; templateCount: number; publishedCount: number; draftCount: number }>();

    for (const row of grouped) {
      const mappedEditor = await this.mapDbEditorTypeIdToValue(row.editorTypeId);
      const current = buckets.get(row.editorTypeId) ?? {
        editorType: {
          id: mappedEditor.id,
          type: mappedEditor.type,
          name: mappedEditor.name,
        },
        templateCount: 0,
        publishedCount: 0,
        draftCount: 0,
      };

      const count = Number(row._count.status ?? 0);
      current.templateCount += count;
      if (row.status === 'published') current.publishedCount += count;
      if (row.status === 'draft') current.draftCount += count;
      buckets.set(row.editorTypeId, current);
    }

    return [...buckets.values()]
      .sort((a, b) => b.templateCount - a.templateCount || a.editorType.id - b.editorType.id)
      .slice(0, limit);
  }

  async getCategoryStats(query: {
    editorTypeId?: number;
    limit?: number;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<any[]> {
    const limit = Math.max(1, query.limit ?? 10);
    const where: Prisma.TemplateWhereInput = {
      ...(query.editorTypeId !== undefined
        ? { editorTypeId: await this.resolveDbEditorTypeId(query.editorTypeId) }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const grouped = await this.prisma.template.groupBy({
      by: ['categoryId', 'status'],
      where,
      _count: {
        status: true,
      },
    });

    const categoryIds = Array.from(new Set(grouped.map((row) => row.categoryId)));
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, editorTypeId: true },
    });
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    const buckets = new Map<string, { categoryId: string; categoryName: string; editorTypeId: number; templateCount: number; publishedCount: number }>();

    for (const row of grouped) {
      const category = categoryMap.get(row.categoryId);
      const editorTypeId = category ? await this.mapDbEditorTypeIdToNumeric(category.editorTypeId) : query.editorTypeId ?? 0;
      const current = buckets.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        categoryName: category?.name ?? 'Unknown Category',
        editorTypeId,
        templateCount: 0,
        publishedCount: 0,
      };

      const count = Number(row._count.status ?? 0);
      current.templateCount += count;
      if (row.status === 'published') current.publishedCount += count;
      buckets.set(row.categoryId, current);
    }

    return [...buckets.values()]
      .sort((a, b) => b.templateCount - a.templateCount || a.categoryId.localeCompare(b.categoryId))
      .slice(0, limit);
  }

  private async mapDbEditorTypeIdToValue(dbEditorTypeId: string): Promise<{ id: number; type: 'graphic' | 'document' | 'whiteboard' | 'form'; name: string }> {
    const editorType = await this.prisma.editorType.findUnique({
      where: { id: dbEditorTypeId },
      select: { id: true, key: true, name: true },
    });

    const mapped = getEditorTypeByCode(editorType?.key ?? '') ?? getEditorTypeById(0)!;
    return {
      id: mapped.id,
      type: mapped.type,
      name: editorType?.name ?? mapped.type.charAt(0).toUpperCase() + mapped.type.slice(1),
    };
  }

  private async mapDbEditorTypeIdToNumeric(dbEditorTypeId: string): Promise<number> {
    const editorType = await this.prisma.editorType.findUnique({
      where: { id: dbEditorTypeId },
      select: { key: true },
    });

    return getEditorTypeByCode(editorType?.key ?? '')?.id ?? 0;
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { getEditorTypeById } from '../common/constants/editor-types.constant';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchEntity, SearchListEntity } from './search.entity';
import { ISearchRepository } from './interfaces/search.repository.interface';

@Injectable()
export class SearchRepository implements ISearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveDbEditorTypeId(editorTypeId?: number): Promise<string | undefined> {
    if (editorTypeId === undefined) return undefined;

    const editorType = getEditorTypeById(editorTypeId);
    if (!editorType) {
      return undefined;
    }

    const dbEditorType = await this.prisma.editorType.upsert({
      where: { key: editorType.type },
      create: { key: editorType.type, name: editorType.type },
      update: { name: editorType.type, deletedAt: null },
      select: { id: true },
    });

    return dbEditorType.id;
  }

  async search(query: SearchQueryDto): Promise<SearchListEntity> {
    const q = (query.q ?? '').trim();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const where: Prisma.TemplateWhereInput = {
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };

    if (query.editorTypeId !== undefined) {
      const editorTypeId = await this.resolveDbEditorTypeId(query.editorTypeId);
      if (editorTypeId) {
        where.editorTypeId = editorTypeId;
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.template.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          editorType: { select: { id: true, key: true, name: true } },
          author: { select: { id: true, email: true, displayName: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      items: items.map((row) => ({
        id: row.id,
        title: row.title,
        kind: 'template',
        slug: row.slug,
        description: null,
        editorTypeId: Number(row.editorTypeId),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async create(payload: { id?: string; title?: string; kind?: 'template' | 'category' }): Promise<SearchEntity> {
    return {
      id: payload.id ?? 'search-item-1',
      title: payload.title ?? 'Untitled search item',
      kind: payload.kind ?? 'template',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async findById(id: string): Promise<SearchEntity | null> {
    return this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    }).then((row) => (row ? {
      id: row.id,
      title: row.title,
      kind: 'template',
      slug: row.slug,
      description: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } : null));
  }
}

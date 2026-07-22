import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ITemplateRepository } from './interfaces/template.repository.interface';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateMapper } from './template.mapper';

type TemplateStatus = 'draft' | 'published' | 'archived';

interface MockTemplateRecord {
  id: string;
  title: string;
  slug: string;
  editorTypeId: string;
  categoryId: string;
  authorId: string | null;
  thumbnail: string | null;
  status: TemplateStatus;
  createdAt: Date;
  updatedAt: Date;
}

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
  private readonly isMockMode: boolean;
  private readonly mockStore = new Map<string, MockTemplateRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isMockMode = this.configService.get<boolean>('app.mockMode', false);
  }

  async create(payload: CreateTemplateDto, authorId: string): Promise<TemplateEntity> {
    if (this.isMockMode) {
      const now = new Date();
      const record: MockTemplateRecord = {
        id: randomUUID(),
        title: payload.title,
        slug: payload.slug,
        editorTypeId: payload.editorTypeId,
        categoryId: payload.categoryId,
        authorId,
        thumbnail: payload.thumbnail ?? null,
        status: payload.status ?? 'draft',
        createdAt: now,
        updatedAt: now,
      };

      this.mockStore.set(record.id, record);
      return TemplateMapper.toEntity({
        ...record,
        author: authorId
          ? {
              id: authorId,
              email: '',
              displayName: null,
            }
          : null,
        category: {
          id: payload.categoryId,
          name: '',
          slug: '',
        },
        editorType: {
          id: payload.editorTypeId,
          key: '',
          name: '',
        },
      });
    }

    const created = await this.prisma.template.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        authorId,
        editorTypeId: payload.editorTypeId,
        categoryId: payload.categoryId,
        thumbnail: payload.thumbnail ?? null,
        status: payload.status ?? 'draft',
      },
      include: templateInclude,
    });

    return TemplateMapper.toEntity(created);
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    if (this.isMockMode) {
      const record = this.mockStore.get(id);
      if (!record) {
        return null;
      }

      return TemplateMapper.toEntity({
        ...record,
        author: record.authorId
          ? {
              id: record.authorId,
              email: '',
              displayName: null,
            }
          : null,
        category: {
          id: record.categoryId,
          name: '',
          slug: '',
        },
        editorType: {
          id: record.editorTypeId,
          key: '',
          name: '',
        },
      });
    }

    const template = await this.prisma.template.findUnique({
      where: { id },
      include: templateInclude,
    });

    return template ? TemplateMapper.toEntity(template) : null;
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    if (this.isMockMode) {
      const filtered = [...this.mockStore.values()].filter((item) => {
        if (query.editorTypeId && item.editorTypeId !== query.editorTypeId) {
          return false;
        }
        if (query.categoryId && item.categoryId !== query.categoryId) {
          return false;
        }
        if (query.authorId && item.authorId !== query.authorId) {
          return false;
        }
        if (query.status && item.status !== query.status) {
          return false;
        }
        if (query.search && !item.title.toLowerCase().includes(query.search.toLowerCase())) {
          return false;
        }
        return true;
      });

      filtered.sort((a, b) => {
        const aValue = a[sortBy] ?? '';
        const bValue = b[sortBy] ?? '';
        if (aValue < bValue) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });

      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      return {
        items: paged.map((item) =>
          TemplateMapper.toEntity({
            ...item,
            author: item.authorId
              ? {
                  id: item.authorId,
                  email: '',
                  displayName: null,
                }
              : null,
            category: {
              id: item.categoryId,
              name: '',
              slug: '',
            },
            editorType: {
              id: item.editorTypeId,
              key: '',
              name: '',
            },
          }),
        ),
        total: filtered.length,
        page,
        pageSize,
      };
    }

    const where: Prisma.TemplateWhereInput = {
      ...(query.editorTypeId ? { editorTypeId: query.editorTypeId } : {}),
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
      items: rows.map((row) => TemplateMapper.toEntity(row)),
      total,
      page,
      pageSize,
    };
  }

  async update(id: string, payload: UpdateTemplateDto): Promise<TemplateEntity | null> {
    if (this.isMockMode) {
      const current = this.mockStore.get(id);
      if (!current) {
        return null;
      }

      current.title = payload.title ?? current.title;
      current.slug = payload.slug ?? current.slug;
      current.editorTypeId = payload.editorTypeId ?? current.editorTypeId;
      current.categoryId = payload.categoryId ?? current.categoryId;
      current.thumbnail = payload.thumbnail ?? current.thumbnail;
      current.status = payload.status ?? current.status;
      current.updatedAt = new Date();

      return TemplateMapper.toEntity({
        ...current,
        author: current.authorId
          ? {
              id: current.authorId,
              email: '',
              displayName: null,
            }
          : null,
        category: {
          id: current.categoryId,
          name: '',
          slug: '',
        },
        editorType: {
          id: current.editorTypeId,
          key: '',
          name: '',
        },
      });
    }

    const found = await this.prisma.template.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
        ...(payload.editorTypeId !== undefined ? { editorTypeId: payload.editorTypeId } : {}),
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
      },
      include: templateInclude,
    });

    return TemplateMapper.toEntity(updated);
  }

  async remove(id: string): Promise<boolean> {
    if (this.isMockMode) {
      return this.mockStore.delete(id);
    }

    const result = await this.prisma.template.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async publish(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'published' });
  }

  async archive(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'archived' });
  }
}
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { ITemplateRepository } from './interfaces/template.repository.interface';
import { TemplateMapper } from './template.mapper';

type TemplateStatus = 'draft' | 'published' | 'archived';

interface MockTemplateRecord {
  id: string;
  title: string;
  slug: string;
  workspaceId: string;
  editorTypeId: string;
  authorId: string | null;
  thumbnailAssetId: string | null;
  status: TemplateStatus;
  publishedAt: Date | null;
  deletedAt: Date | null;
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
  workspace: {
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
  thumbnailAsset: {
    select: {
      publicUrl: true,
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

  async create(payload: CreateTemplateDto, authorId: string | null): Promise<TemplateEntity> {
    if (this.isMockMode) {
      const now = new Date();
      const id = randomUUID();

      const mockTemplate: MockTemplateRecord = {
        id,
        title: payload.title,
        slug: payload.slug,
        workspaceId: payload.workspaceId,
        editorTypeId: payload.editorTypeId,
        authorId,
        thumbnailAssetId: payload.thumbnailAssetId ?? null,
        status: payload.status ?? 'draft',
        publishedAt: payload.status === 'published' ? now : null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      this.mockStore.set(id, mockTemplate);

      return TemplateMapper.toEntity({
        ...mockTemplate,
        thumbnail: null,
        author: authorId
          ? {
              id: authorId,
              email: '',
              displayName: null,
            }
          : null,
        workspace: {
          id: payload.workspaceId,
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
        workspaceId: payload.workspaceId,
        editorTypeId: payload.editorTypeId,
        authorId,
        thumbnailAssetId: payload.thumbnailAssetId ?? null,
        status: payload.status ?? 'draft',
        publishedAt: payload.status === 'published' ? new Date() : null,
      },
      include: templateInclude,
    });

    return TemplateMapper.toEntity(created);
  }

  async findById(id: string, includeDeleted = false): Promise<TemplateEntity | null> {
    if (this.isMockMode) {
      const mockTemplate = this.mockStore.get(id);
      if (!mockTemplate) {
        return null;
      }

      if (!includeDeleted && mockTemplate.deletedAt) {
        return null;
      }

      return TemplateMapper.toEntity({
        ...mockTemplate,
        thumbnail: null,
        author: mockTemplate.authorId
          ? {
              id: mockTemplate.authorId,
              email: '',
              displayName: null,
            }
          : null,
        workspace: {
          id: mockTemplate.workspaceId,
          name: '',
          slug: '',
        },
        editorType: {
          id: mockTemplate.editorTypeId,
          key: '',
          name: '',
        },
      });
    }

    const template = await this.prisma.template.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: templateInclude,
    });

    if (!template) {
      return null;
    }

    return TemplateMapper.toEntity(template);
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    if (this.isMockMode) {
      const filtered = [...this.mockStore.values()].filter((item) => {
        if (!query.includeDeleted && item.deletedAt) {
          return false;
        }
        if (query.workspaceId && item.workspaceId !== query.workspaceId) {
          return false;
        }
        if (query.editorTypeId && item.editorTypeId !== query.editorTypeId) {
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
            thumbnail: null,
            author: item.authorId
              ? {
                  id: item.authorId,
                  email: '',
                  displayName: null,
                }
              : null,
            workspace: {
              id: item.workspaceId,
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
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
      ...(query.editorTypeId ? { editorTypeId: query.editorTypeId } : {}),
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
      if (!current || current.deletedAt) {
        return null;
      }

      current.title = payload.title ?? current.title;
      current.slug = payload.slug ?? current.slug;
      current.workspaceId = payload.workspaceId ?? current.workspaceId;
      current.editorTypeId = payload.editorTypeId ?? current.editorTypeId;
      current.thumbnailAssetId = payload.thumbnailAssetId ?? current.thumbnailAssetId;
      current.status = payload.status ?? current.status;
      current.updatedAt = new Date();
      current.publishedAt =
        current.status === 'published' ? (current.publishedAt ?? new Date()) : null;

      return TemplateMapper.toEntity({
        ...current,
        thumbnail: null,
        author: current.authorId
          ? {
              id: current.authorId,
              email: '',
              displayName: null,
            }
          : null,
        workspace: {
          id: current.workspaceId,
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

    const found = await this.prisma.template.findFirst({
      where: { id, deletedAt: null },
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
        ...(payload.workspaceId !== undefined ? { workspaceId: payload.workspaceId } : {}),
        ...(payload.editorTypeId !== undefined ? { editorTypeId: payload.editorTypeId } : {}),
        ...(payload.thumbnailAssetId !== undefined
          ? { thumbnailAssetId: payload.thumbnailAssetId }
          : {}),
        ...(payload.status !== undefined
          ? {
              status: payload.status,
              publishedAt: payload.status === 'published' ? new Date() : null,
            }
          : {}),
      },
      include: templateInclude,
    });

    return TemplateMapper.toEntity(updated);
  }

  async softDelete(id: string): Promise<boolean> {
    if (this.isMockMode) {
      const current = this.mockStore.get(id);
      if (!current || current.deletedAt) {
        return false;
      }

      current.deletedAt = new Date();
      current.updatedAt = new Date();
      return true;
    }

    const result = await this.prisma.template.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  async publish(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'published' });
  }

  async archive(id: string): Promise<TemplateEntity | null> {
    return this.update(id, { status: 'archived' });
  }

  async restore(id: string): Promise<TemplateEntity | null> {
    if (this.isMockMode) {
      const current = this.mockStore.get(id);
      if (!current || !current.deletedAt) {
        return null;
      }
      current.deletedAt = null;
      current.updatedAt = new Date();

      return TemplateMapper.toEntity({
        ...current,
        thumbnail: null,
        author: current.authorId
          ? {
              id: current.authorId,
              email: '',
              displayName: null,
            }
          : null,
        workspace: {
          id: current.workspaceId,
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

    const restored = await this.prisma.template.updateMany({
      where: {
        id,
        NOT: {
          deletedAt: null,
        },
      },
      data: {
        deletedAt: null,
      },
    });

    if (restored.count === 0) {
      return null;
    }

    return this.findById(id, true);
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

@Injectable()
export class UserDraftRepository {
  private readonly isMockMode: boolean;
  private readonly mockStore = new Map<string, UserDraftEntity>();
  private readonly mockFilePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // read config flag or fallback to environment variable MOCK_MODE
    const cfgFlag = this.configService.get<boolean>('app.mockMode', false)
    const envFlag = (process.env.MOCK_MODE === 'true') || (process.env.MOCK_MODE === '1')
    this.isMockMode = Boolean(cfgFlag || envFlag)
    // prefer writing into the source tree so devs can inspect the file
    // when running the compiled app (__dirname points into dist at runtime)
    const srcMockPath = join(process.cwd(), 'src', 'common', 'testing', 'mock-user-drafts.json')
    this.mockFilePath = srcMockPath
    if (this.isMockMode) {
      try {
        const dir = dirname(this.mockFilePath)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        if (!existsSync(this.mockFilePath)) writeFileSync(this.mockFilePath, JSON.stringify([]))
        const raw = readFileSync(this.mockFilePath, 'utf8') || '[]'
        const arr = JSON.parse(raw) as any[]
        arr.forEach((it) => {
          // convert date strings to Date objects
          const entity: UserDraftEntity = {
            ...it,
            createdAt: it.createdAt ? new Date(it.createdAt) : new Date(),
            updatedAt: it.updatedAt ? new Date(it.updatedAt) : new Date(),
            lastOpenedAt: it.lastOpenedAt ? new Date(it.lastOpenedAt) : new Date(),
          }
          this.mockStore.set(entity.id, entity)
        })
      } catch (err) {
        // ignore load errors and start with empty store
        this.mockStore.clear()
      }
    }
  }

  private persistMockStore() {
    try {
      const arr = [...this.mockStore.values()].map((e) => ({
        ...e,
        createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
        updatedAt: e.updatedAt?.toISOString?.() ?? e.updatedAt,
        lastOpenedAt: e.lastOpenedAt?.toISOString?.() ?? e.lastOpenedAt,
      }))
      writeFileSync(this.mockFilePath, JSON.stringify(arr, null, 2), 'utf8')
      // debug log for dev: confirm persistence
      // eslint-disable-next-line no-console
      console.log('[mock-user-drafts] persisted', this.mockFilePath, arr.length, 'items')
    } catch (err) {
      // log persistence errors to surface problems during development
      // eslint-disable-next-line no-console
      console.error('[mock-user-drafts] failed to persist', err)
    }
  }

  async create(payload: CreateUserDraftDto, userId: string): Promise<UserDraftEntity> {
    if (this.isMockMode) {
      const now = new Date();
      const entity: UserDraftEntity = {
        id: randomUUID(),
        userId,
        templateId: payload.templateId,
        name: payload.name,
        thumbnail: payload.thumbnail ?? null,
        content: payload.content as Prisma.JsonValue,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };

      this.mockStore.set(entity.id, entity);
      this.persistMockStore()
      return entity;
    }

    return this.prisma.userDraft.create({
      data: {
        userId,
        templateId: payload.templateId,
        name: payload.name,
        thumbnail: payload.thumbnail ?? null,
        content: payload.content,
        lastOpenedAt: new Date(),
      },
    });
  }

  async findById(id: string, userId: string): Promise<UserDraftEntity | null> {
    if (this.isMockMode) {
      const entity = this.mockStore.get(id);
      if (!entity || entity.userId !== userId) {
        return null;
      }

      return entity;
    }

    return this.prisma.userDraft.findFirst({
      where: { id, userId },
    });
  }

  async findMany(query: UserDraftListQueryDto, userId: string): Promise<UserDraftListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder ?? 'desc';

    if (this.isMockMode) {
      const filtered = [...this.mockStore.values()].filter((entity) => {
        if (entity.userId !== userId) {
          return false;
        }
        if (query.templateId && entity.templateId !== query.templateId) {
          return false;
        }
        return true;
      });

      filtered.sort((a, b) => {
        const aRaw = a[sortBy] as string | Date | null | undefined;
        const bRaw = b[sortBy] as string | Date | null | undefined;
        const aValue = aRaw instanceof Date ? aRaw.getTime() : aRaw ?? '';
        const bValue = bRaw instanceof Date ? bRaw.getTime() : bRaw ?? '';
        if (aValue < bValue) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });

      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      return {
        items,
        total: filtered.length,
        page,
        pageSize,
      };
    }

    const where: Prisma.UserDraftWhereInput = {
      userId,
      ...(query.templateId ? { templateId: query.templateId } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.userDraft.count({ where }),
      this.prisma.userDraft.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async update(id: string, payload: UpdateUserDraftDto, userId: string): Promise<UserDraftEntity | null> {
    if (this.isMockMode) {
      const current = this.mockStore.get(id);
      if (!current || current.userId !== userId) {
        return null;
      }

      current.templateId = payload.templateId ?? current.templateId;
      current.name = payload.name ?? current.name;
      current.thumbnail = payload.thumbnail ?? current.thumbnail;
      current.content = payload.content !== undefined ? (payload.content as Prisma.JsonValue) : current.content;
      current.updatedAt = new Date();

      this.mockStore.set(id, current);
      this.persistMockStore()
      return current;
    }

    const found = await this.prisma.userDraft.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    return this.prisma.userDraft.update({
      where: { id },
      data: {
        ...(payload.templateId !== undefined ? { templateId: payload.templateId } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
        ...(payload.content !== undefined ? { content: payload.content } : {}),
      },
    });
  }

  async touch(id: string, userId: string): Promise<UserDraftEntity | null> {
    if (this.isMockMode) {
      const current = this.mockStore.get(id);
      if (!current || current.userId !== userId) {
        return null;
      }

      current.lastOpenedAt = new Date();
      current.updatedAt = new Date();
      this.mockStore.set(id, current);
      this.persistMockStore()
      return current;
    }

    const found = await this.prisma.userDraft.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return null;
    }

    return this.prisma.userDraft.update({
      where: { id },
      data: {
        lastOpenedAt: new Date(),
      },
    });
  }

  async remove(id: string, userId: string): Promise<boolean> {
    if (this.isMockMode) {
      const current = this.mockStore.get(id);
      if (!current || current.userId !== userId) {
        return false;
      }

      const deleted = this.mockStore.delete(id);
      this.persistMockStore()
      return deleted;
    }

    const result = await this.prisma.userDraft.deleteMany({
      where: { id, userId },
    });

    return result.count > 0;
  }
}
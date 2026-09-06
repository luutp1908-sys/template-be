import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

@Injectable()
export class UserDraftRepository {
  private readonly mockStore = new Map<string, UserDraftEntity>();
  private readonly mockFilePath: string;

  constructor() {
    const srcMockPath = join(process.cwd(), 'src', 'common', 'testing', 'mock-user-drafts.json')
    this.mockFilePath = srcMockPath
    try {
      const dir = dirname(this.mockFilePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      if (!existsSync(this.mockFilePath)) writeFileSync(this.mockFilePath, JSON.stringify([]))
      const raw = readFileSync(this.mockFilePath, 'utf8') || '[]'
      const arr = JSON.parse(raw) as any[]
      arr.forEach((it) => {
        const entity: UserDraftEntity = {
          ...it,
          workspaceId: it.workspaceId ?? null,
          createdAt: it.createdAt ? new Date(it.createdAt) : new Date(),
          updatedAt: it.updatedAt ? new Date(it.updatedAt) : new Date(),
          lastOpenedAt: it.lastOpenedAt ? new Date(it.lastOpenedAt) : new Date(),
        }
        this.mockStore.set(entity.id, entity)
      })
    } catch (err) {
      this.mockStore.clear()
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

  async create(
    payload: CreateUserDraftDto,
    userId: string,
    workspaceId: string | null,
  ): Promise<UserDraftEntity> {
    const now = new Date();
    const entity: UserDraftEntity = {
      id: randomUUID(),
      userId,
      workspaceId,
      templateId: payload.templateId ?? null,
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

  private hasAccess(entity: UserDraftEntity, userId: string, workspaceIds: string[]): boolean {
    return entity.userId === userId || (entity.workspaceId ? workspaceIds.includes(entity.workspaceId) : false);
  }

  private normalizeWhere(where: Prisma.UserDraftWhereInput): {
    userId: string | null;
    workspaceIds: string[];
    id?: string;
    workspaceId?: string;
    templateId?: string;
  } {
    const clauses = Array.isArray(where.AND) ? where.AND : [where.AND].filter(Boolean);
    const normalized = {
      userId: null as string | null,
      workspaceIds: [] as string[],
      id: undefined as string | undefined,
      workspaceId: undefined as string | undefined,
      templateId: undefined as string | undefined,
    };

    for (const clause of clauses) {
      if (!clause || typeof clause !== 'object') {
        continue;
      }

      if ('id' in clause && clause.id && typeof clause.id === 'object' && 'in' in clause.id) {
        const inValues = (clause.id as { in?: string[] }).in;
        if (Array.isArray(inValues) && inValues.length === 0) {
          return normalized;
        }
      }

      if ('id' in clause && typeof clause.id === 'string') {
        normalized.id = clause.id;
      }

      if ('workspaceId' in clause && typeof clause.workspaceId === 'string') {
        normalized.workspaceId = clause.workspaceId;
      }

      if ('templateId' in clause && typeof clause.templateId === 'string') {
        normalized.templateId = clause.templateId;
      }

      if ('OR' in clause && Array.isArray(clause.OR)) {
        for (const orClause of clause.OR) {
          if (!orClause || typeof orClause !== 'object') {
            continue;
          }
          if ('userId' in orClause && typeof orClause.userId === 'string') {
            normalized.userId = orClause.userId;
          }
          if ('workspaceId' in orClause && orClause.workspaceId && typeof orClause.workspaceId === 'object' && 'in' in orClause.workspaceId) {
            const inValues = (orClause.workspaceId as { in?: string[] }).in;
            if (Array.isArray(inValues)) {
              normalized.workspaceIds = inValues;
            }
          }
        }
      }
    }

    return normalized;
  }

  async findById(where: Prisma.UserDraftWhereInput): Promise<UserDraftEntity | null> {
    const normalized = this.normalizeWhere(where);
    if (!normalized.id || !normalized.userId) {
      return null;
    }

    const entity = this.mockStore.get(normalized.id);
    if (!entity) {
      return null;
    }

    const hasAccess = this.hasAccess(entity, normalized.userId, normalized.workspaceIds);
    if (!hasAccess) return null;

    return entity;
  }

  async findMany(query: UserDraftListQueryDto, where: Prisma.UserDraftWhereInput): Promise<UserDraftListEntity> {
    const normalized = this.normalizeWhere(where);
    if (!normalized.userId) {
      return { items: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 10 };
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const filtered = [...this.mockStore.values()].filter((entity) => {
      const hasAccess = this.hasAccess(entity, normalized.userId as string, normalized.workspaceIds);
      if (!hasAccess) return false;
      if (normalized.workspaceId && entity.workspaceId !== normalized.workspaceId) return false;
      if (normalized.templateId && entity.templateId !== normalized.templateId) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const aRaw = a[sortBy] as string | Date | null | undefined;
      const bRaw = b[sortBy] as string | Date | null | undefined;
      const aValue = aRaw instanceof Date ? aRaw.getTime() : aRaw ?? '';
      const bValue = bRaw instanceof Date ? bRaw.getTime() : bRaw ?? '';
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
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

  async update(
    id: string,
    payload: UpdateUserDraftDto,
    where: Prisma.UserDraftWhereInput,
  ): Promise<UserDraftEntity | null> {
    const normalized = this.normalizeWhere(where);
    if (!normalized.userId) {
      return null;
    }

    const current = this.mockStore.get(id);
    if (!current) return null;
    const hasAccess = this.hasAccess(current, normalized.userId, normalized.workspaceIds);
    if (!hasAccess) return null;

    current.templateId = payload.templateId ?? current.templateId;
    current.workspaceId = payload.workspaceId ?? current.workspaceId;
    current.name = payload.name ?? current.name;
    current.thumbnail = payload.thumbnail ?? current.thumbnail;
    current.content = payload.content !== undefined ? (payload.content as Prisma.JsonValue) : current.content;
    current.updatedAt = new Date();

    this.mockStore.set(id, current);
    this.persistMockStore()
    return current;
  }

  async touch(id: string, where: Prisma.UserDraftWhereInput): Promise<UserDraftEntity | null> {
    const normalized = this.normalizeWhere(where);
    if (!normalized.userId) {
      return null;
    }

    const current = this.mockStore.get(id);
    if (!current) return null;
    const hasAccess = this.hasAccess(current, normalized.userId, normalized.workspaceIds);
    if (!hasAccess) return null;

    current.lastOpenedAt = new Date();
    current.updatedAt = new Date();
    this.mockStore.set(id, current);
    this.persistMockStore()
    return current;
  }

  async remove(where: Prisma.UserDraftWhereInput): Promise<boolean> {
    const normalized = this.normalizeWhere(where);
    if (!normalized.userId || !normalized.id) {
      return false;
    }

    const current = this.mockStore.get(normalized.id);
    if (!current) return false;
    const hasAccess = this.hasAccess(current, normalized.userId, normalized.workspaceIds);
    if (!hasAccess) return false;

    const deleted = this.mockStore.delete(normalized.id);
    this.persistMockStore()
    return deleted;
  }
}

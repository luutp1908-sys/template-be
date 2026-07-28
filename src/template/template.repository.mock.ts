import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { getEditorTypeById } from '../common/constants/editor-types.constant';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ITemplateRepository } from './interfaces/template.repository.interface';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateMapper } from './template.mapper';

interface MockTemplateRecord {
  id: string;
  title: string;
  slug: string;
  editorTypeId: number;
  categoryId: string;
  authorId: string | null;
  thumbnail: string | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TemplateRepository implements ITemplateRepository {
  private readonly mockStore = new Map<string, MockTemplateRecord>();
  private readonly mockFilePath: string;

  constructor(private readonly configService: ConfigService) {
    this.mockFilePath = join(process.cwd(), 'src', 'common', 'testing', 'mock-templates.json')
    try {
      const dir = dirname(this.mockFilePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      if (!existsSync(this.mockFilePath)) writeFileSync(this.mockFilePath, JSON.stringify([]))
      const raw = readFileSync(this.mockFilePath, 'utf8') || '[]'
      const arr = JSON.parse(raw) as any[]
      arr.forEach((it) => {
        const rec: MockTemplateRecord = {
          ...it,
          editorTypeId:
            typeof it.editorTypeId === 'number'
              ? it.editorTypeId
              : Number.isFinite(Number(it.editorTypeId))
                ? Number(it.editorTypeId)
                : 0,
          createdAt: it.createdAt ? new Date(it.createdAt) : new Date(),
          updatedAt: it.updatedAt ? new Date(it.updatedAt) : new Date(),
        }
        this.mockStore.set(rec.id, rec)
      })
    } catch {
      this.mockStore.clear()
    }
  }

  private persistMockStore() {
    try {
      const arr = [...this.mockStore.values()].map((e) => ({
        ...e,
        createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
        updatedAt: e.updatedAt?.toISOString?.() ?? e.updatedAt,
      }))
      writeFileSync(this.mockFilePath, JSON.stringify(arr, null, 2), 'utf8')
      // eslint-disable-next-line no-console
      console.log('[mock-templates] persisted', this.mockFilePath, arr.length, 'items')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mock-templates] failed to persist', err)
    }
  }

  async create(payload: CreateTemplateDto, authorId: string): Promise<TemplateEntity> {
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
    this.persistMockStore()
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
        id: getEditorTypeById(payload.editorTypeId)?.id ?? 0,
        type: getEditorTypeById(payload.editorTypeId)?.type ?? 'graphic',
      },
    });
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    const record = this.mockStore.get(id);
    if (!record) return null;

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
        id: getEditorTypeById(record.editorTypeId)?.id ?? 0,
        type: getEditorTypeById(record.editorTypeId)?.type ?? 'graphic',
      },
    });
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const filtered = [...this.mockStore.values()].filter((item) => {
      if (query.editorTypeId !== undefined && item.editorTypeId !== query.editorTypeId) {
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
            id: getEditorTypeById(item.editorTypeId)?.id ?? 0,
            type: getEditorTypeById(item.editorTypeId)?.type ?? 'graphic',
          },
        }),
      ),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async update(id: string, payload: UpdateTemplateDto): Promise<TemplateEntity | null> {
    const current = this.mockStore.get(id);
    if (!current) return null;

    current.title = payload.title ?? current.title;
    current.slug = payload.slug ?? current.slug;
    current.editorTypeId = payload.editorTypeId ?? current.editorTypeId;
    current.categoryId = payload.categoryId ?? current.categoryId;
    current.thumbnail = payload.thumbnail ?? current.thumbnail;
    current.status = payload.status ?? current.status;
    current.updatedAt = new Date();
    this.mockStore.set(id, current);
    this.persistMockStore()

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
        id: getEditorTypeById(current.editorTypeId)?.id ?? 0,
        type: getEditorTypeById(current.editorTypeId)?.type ?? 'graphic',
      },
    });
  }

  async remove(id: string): Promise<boolean> {
    const deleted = this.mockStore.delete(id);
    this.persistMockStore()
    return deleted;
  }

  async publish(id: string): Promise<TemplateEntity | null> {
    const current = this.mockStore.get(id);
    if (!current) return null;
    current.status = 'published';
    current.updatedAt = new Date();
    this.mockStore.set(id, current);
    this.persistMockStore();
    return TemplateMapper.toEntity({
      ...current,
      author: current.authorId ? { id: current.authorId, email: '', displayName: null } : null,
      category: { id: current.categoryId, name: '', slug: '' },
      editorType: {
        id: getEditorTypeById(current.editorTypeId)?.id ?? 0,
        type: getEditorTypeById(current.editorTypeId)?.type ?? 'graphic',
      },
    });
  }

  async archive(id: string): Promise<TemplateEntity | null> {
    const current = this.mockStore.get(id);
    if (!current) return null;
    current.status = 'archived';
    current.updatedAt = new Date();
    this.mockStore.set(id, current);
    this.persistMockStore();
    return TemplateMapper.toEntity({
      ...current,
      author: current.authorId ? { id: current.authorId, email: '', displayName: null } : null,
      category: { id: current.categoryId, name: '', slug: '' },
      editorType: {
        id: getEditorTypeById(current.editorTypeId)?.id ?? 0,
        type: getEditorTypeById(current.editorTypeId)?.type ?? 'graphic',
      },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './category.entity';
import { ICategoryRepository } from './interfaces/category.repository.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  private static readonly DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';
  private readonly store = new Map<string, CategoryEntity>();
  private readonly mockFilePath: string;

  constructor() {
    this.mockFilePath = join(process.cwd(), 'src', 'common', 'testing', 'mock-categories.json');
    this.bootstrapFromFile();
  }

  private bootstrapFromFile(): void {
    try {
      const dir = dirname(this.mockFilePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      if (!existsSync(this.mockFilePath)) writeFileSync(this.mockFilePath, JSON.stringify([], null, 2), 'utf8');

      const raw = readFileSync(this.mockFilePath, 'utf8') || '[]';
      const arr = JSON.parse(raw) as any[];
      this.store.clear();
      for (const it of arr) {
        const entity: CategoryEntity = {
          id: it.id,
          workspaceId: it.workspaceId ?? CategoryRepository.DEFAULT_WORKSPACE_ID,
          editorTypeId: typeof it.editorTypeId === 'number' ? it.editorTypeId : Number(it.editorTypeId ?? 0),
          parentId: it.parentId ?? null,
          name: it.name,
          slug: it.slug,
          deletedAt: it.deletedAt ? new Date(it.deletedAt) : null,
          createdAt: it.createdAt ? new Date(it.createdAt) : new Date(),
          updatedAt: it.updatedAt ? new Date(it.updatedAt) : new Date(),
        };
        this.store.set(entity.id, entity);
      }
    } catch {
      this.store.clear();
    }
  }

  private persistStore(): void {
    const arr = [...this.store.values()].map((e) => ({
      ...e,
      deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    writeFileSync(this.mockFilePath, JSON.stringify(arr, null, 2), 'utf8');
  }

  async findMany(query: CategoryListQueryDto): Promise<CategoryEntity[]> {
    const normalizedSearch = query.search?.trim().toLowerCase();
    return [...this.store.values()].filter((c) => {
      if (c.deletedAt) return false;
      if (query.editorTypeId && c.editorTypeId !== query.editorTypeId) return false;
      if (normalizedSearch && !c.name.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
  }

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    const now = new Date();
    const entity: CategoryEntity = {
      id: randomUUID(),
      workspaceId: payload.workspaceId ?? CategoryRepository.DEFAULT_WORKSPACE_ID,
      editorTypeId: payload.editorTypeId ?? 0,
      parentId: payload.parentId ?? null,
      name: payload.name,
      slug: payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, '-').slice(0, 180),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(entity.id, entity);
    this.persistStore();
    return entity;
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const v = this.store.get(id) ?? null;
    if (!v || v.deletedAt) return null;
    return v;
  }

  async findChildren(id: string): Promise<CategoryEntity[]> {
    return [...this.store.values()].filter((c) => c.parentId === id && !c.deletedAt);
  }

  async findDescendants(id: string): Promise<CategoryEntity[]> {
    const descendants: CategoryEntity[] = [];
    let queue = [id];
    const seen = new Set<string>();
    while (queue.length) {
      const next: string[] = [];
      for (const node of this.store.values()) {
        if (!node.parentId) continue;
        if (queue.includes(node.parentId) && !seen.has(node.id) && !node.deletedAt) {
          seen.add(node.id);
          descendants.push(node);
          next.push(node.id);
        }
      }
      queue = next;
    }
    return descendants;
  }

  async findAncestors(id: string): Promise<CategoryEntity[]> {
    const ancestors: CategoryEntity[] = [];
    let current = this.store.get(id);
    if (!current || current.deletedAt) throw new NotFoundException('Category not found');
    while (current && current.parentId) {
      const parent = this.store.get(current.parentId);
      if (!parent || parent.deletedAt) break;
      ancestors.push(parent);
      current = parent;
    }
    return ancestors.reverse();
  }

  async update(id: string, payload: UpdateCategoryDto): Promise<CategoryEntity> {
    const existing = this.store.get(id);
    if (!existing || existing.deletedAt) throw new NotFoundException('Category not found');
    const updated: CategoryEntity = {
      ...existing,
      name: payload.name ?? existing.name,
      slug: payload.slug ?? existing.slug,
      parentId: Object.prototype.hasOwnProperty.call(payload, 'parentId') ? (payload.parentId as string | null) : existing.parentId,
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    this.persistStore();
    return updated;
  }

  async move(id: string, newParentId: string | null): Promise<CategoryEntity> {
    if (newParentId === id) throw new BadRequestException('Cannot set parent to self');
    const descendants = await this.findDescendants(id);
    if (newParentId && descendants.some((d) => d.id === newParentId)) throw new BadRequestException('Cannot move into its own descendant');
    const existing = this.store.get(id);
    if (!existing || existing.deletedAt) throw new NotFoundException('Category not found');
    existing.parentId = newParentId;
    existing.updatedAt = new Date();
    this.store.set(id, existing);
    this.persistStore();
    return existing;
  }

  async softDeleteSafe(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing || existing.deletedAt) throw new NotFoundException('Category not found');
    const hasChildren = [...this.store.values()].some((c) => c.parentId === id && !c.deletedAt);
    if (hasChildren) throw new BadRequestException('Category has child categories; delete aborted');
    existing.deletedAt = new Date();
    existing.updatedAt = new Date();
    this.store.set(id, existing);
    this.persistStore();
  }

  async getTreeByWorkspace(workspaceId: string): Promise<CategoryEntity[]> {
    return [...this.store.values()].filter((c) => c.workspaceId === workspaceId && !c.deletedAt);
  }

  async getTemplatesRecursive(_id: string): Promise<any[]> {
    // mock has no templates store
    return [];
  }
}

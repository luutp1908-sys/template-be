import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './category.entity';
import { CategoryRepository } from './category.repository';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  private readonly categoryTreeCacheKey = 'category:tree';

  constructor(
    @Inject('CATEGORY_REPOSITORY') private readonly repository: any,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async findMany(query: CategoryListQueryDto): Promise<CategoryEntity[]> {
    return this.repository.findMany(query);
  }

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    const created = await this.repository.create(payload);
    await this.invalidateCategoryTreeCache();
    return created;
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.repository.findById(id);
  }

  async update(id: string, payload: UpdateCategoryDto): Promise<CategoryEntity> {
    const updated = await this.repository.update(id, payload);
    await this.invalidateCategoryTreeCache();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDeleteSafe(id);
    await this.invalidateCategoryTreeCache();
  }

  async getTree(): Promise<any> {
    const cachedTree = await this.cacheService.getJson<any[]>(this.categoryTreeCacheKey);
    if (cachedTree) {
      return cachedTree;
    }

    const rows = await this.repository.getTree();
    // build tree
    const map = new Map<string, any>();
    (rows as any[]).forEach((r: any) => map.set(r.id, { ...r, children: [] }));
    const roots: any[] = [];
    for (const node of map.values()) {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }

    const ttlMs = this.configService.get<number>('cache.ttlMs.categoryTree', 3600000);
    await this.cacheService.setJson(this.categoryTreeCacheKey, roots, ttlMs);

    return roots;
  }

  async move(id: string, newParentId: string | null): Promise<CategoryEntity> {
    const moved = await this.repository.move(id, newParentId);
    await this.invalidateCategoryTreeCache();
    return moved;
  }

  async getBreadcrumbs(id: string): Promise<CategoryEntity[]> {
    const ancestors = await this.repository.findAncestors(id);
    const self = await this.repository.findById(id);
    if (!self) throw new NotFoundException('Category not found');
    return [...ancestors, self];
  }

  async getDescendants(id: string): Promise<CategoryEntity[]> {
    return this.repository.findDescendants(id);
  }

  async getAncestors(id: string): Promise<CategoryEntity[]> {
    return this.repository.findAncestors(id);
  }

  async getTemplatesRecursive(id: string): Promise<any[]> {
    return this.repository.getTemplatesRecursive(id);
  }

  async getHierarchyStats(id: string): Promise<any> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.repository.getHierarchyStats(id);
  }

  async getOrphanedCategories(): Promise<any[]> {
    return this.repository.getOrphanedCategories();
  }

  private async invalidateCategoryTreeCache(): Promise<void> {
    try {
      await this.cacheService.delete(this.categoryTreeCacheKey);
    } catch (error) {
      this.logger.warn(
        `Category tree cache invalidation failed: ${(error as Error).message}`,
      );
    }
  }
}

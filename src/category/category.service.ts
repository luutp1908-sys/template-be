import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './category.entity';
import { CategoryRepository } from './category.repository';

@Injectable()
export class CategoryService {
  constructor(@Inject('CATEGORY_REPOSITORY') private readonly repository: any) {}

  async findMany(query: CategoryListQueryDto): Promise<CategoryEntity[]> {
    return this.repository.findMany(query);
  }

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.repository.findById(id);
  }

  async update(id: string, payload: UpdateCategoryDto): Promise<CategoryEntity> {
    return this.repository.update(id, payload);
  }

  async delete(id: string): Promise<void> {
    return this.repository.softDeleteSafe(id);
  }

  async getTree(): Promise<any> {
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
    return roots;
  }

  async move(id: string, newParentId: string | null): Promise<CategoryEntity> {
    return this.repository.move(id, newParentId);
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
}

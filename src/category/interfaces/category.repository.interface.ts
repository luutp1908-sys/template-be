import { CreateCategoryDto } from '../dto/create-category.dto';
import { CategoryListQueryDto } from '../dto/category-list-query.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryEntity } from '../category.entity';

export interface ICategoryRepository {
  findMany(_query: CategoryListQueryDto): Promise<CategoryEntity[]>;
  create(_payload: CreateCategoryDto): Promise<CategoryEntity>;
  findById(_id: string): Promise<CategoryEntity | null>;
  findChildren(_id: string): Promise<CategoryEntity[]>;
  findAncestors(_id: string): Promise<CategoryEntity[]>;
  findDescendants(_id: string): Promise<CategoryEntity[]>;
  update(_id: string, payload: UpdateCategoryDto): Promise<CategoryEntity>;
  move(_id: string, newParentId: string | null): Promise<CategoryEntity>;
  softDeleteSafe(_id: string): Promise<void>;
  getTree(): Promise<CategoryEntity[]>;
  getTemplatesRecursive(_id: string): Promise<any[]>;
  getHierarchyStats(_id: string): Promise<any>;
  getOrphanedCategories(): Promise<any[]>;
}

import { CategoryEntity } from '../category.entity';

export interface CategoryListQuery {
  editorTypeId?: number;
  search?: string;
}

export interface CreateCategoryRecord {
  editorTypeId?: number;
  parentId?: string | null;
  name: string;
  slug?: string;
}

export interface UpdateCategoryRecord {
  name?: string;
  slug?: string;
  parentId?: string | null;
}

export interface ICategoryRepository {
  findMany(_query: CategoryListQuery): Promise<CategoryEntity[]>;
  create(_payload: CreateCategoryRecord): Promise<CategoryEntity>;
  findById(_id: string): Promise<CategoryEntity | null>;
  findChildren(_id: string): Promise<CategoryEntity[]>;
  findAncestors(_id: string): Promise<CategoryEntity[]>;
  findDescendants(_id: string): Promise<CategoryEntity[]>;
  update(_id: string, payload: UpdateCategoryRecord): Promise<CategoryEntity>;
  move(_id: string, newParentId: string | null): Promise<CategoryEntity>;
  softDeleteSafe(_id: string): Promise<void>;
  getTree(): Promise<CategoryEntity[]>;
  getHierarchyStats(_id: string): Promise<any>;
  getOrphanedCategories(): Promise<any[]>;
}

import {
  CategoryPopularityStatsEntity,
  PopularityStatsEntity,
  TemplateEntity,
  TemplateListEntity,
} from '../template.entity';

export interface CreateTemplateRecord {
  title: string;
  slug: string;
  editorTypeId: number;
  categoryId: string;
  thumbnail?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdateTemplateRecord {
  title?: string;
  slug?: string;
  editorTypeId?: number;
  categoryId?: string;
  thumbnail?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface TemplateListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  editorTypeId?: number;
  categoryId?: string;
  authorId?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface TemplateStatsQuery {
  editorTypeId?: number;
  limit?: number;
  status?: 'draft' | 'published' | 'archived';
}

export interface ITemplateRepository {
  create(_payload: CreateTemplateRecord, _authorId: string): Promise<TemplateEntity>;
  findById(_id: string): Promise<TemplateEntity | null>;
  findMany(_query: TemplateListQuery): Promise<TemplateListEntity>;
  update(_id: string, _payload: UpdateTemplateRecord): Promise<TemplateEntity | null>;
  remove(_id: string): Promise<boolean>;
  publish(_id: string): Promise<TemplateEntity | null>;
  archive(_id: string): Promise<TemplateEntity | null>;
  getPopularityStats(_query: TemplateStatsQuery): Promise<PopularityStatsEntity[]>;
  getCategoryStats(_query: TemplateStatsQuery): Promise<CategoryPopularityStatsEntity[]>;
  existsByCategoryId(_categoryId: string): Promise<boolean>;
  findByCategoryIds(_categoryIds: string[]): Promise<any[]>;
}

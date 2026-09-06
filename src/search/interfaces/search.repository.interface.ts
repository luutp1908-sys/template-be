import { SearchEntity, SearchListEntity } from '../search.entity';

export interface SearchQuery {
  q?: string;
  scope?: 'template' | 'category' | 'all';
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'published' | 'archived';
  editorTypeId?: number;
  categoryId?: string;
}

export interface ISearchRepository {
  search(_query: SearchQuery): Promise<SearchListEntity>;
  create(_payload: { id?: string; title?: string; kind?: 'template' | 'category' }): Promise<SearchEntity>;
  findById(_id: string): Promise<SearchEntity | null>;
}

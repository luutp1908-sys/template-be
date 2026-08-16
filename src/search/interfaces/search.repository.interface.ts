import { SearchQueryDto } from '../dto/search-query.dto';
import { SearchEntity, SearchListEntity } from '../search.entity';

export interface ISearchRepository {
  search(_query: SearchQueryDto): Promise<SearchListEntity>;
  create(_payload: { id?: string; title?: string; kind?: 'template' | 'category' }): Promise<SearchEntity>;
  findById(_id: string): Promise<SearchEntity | null>;
}

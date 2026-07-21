import { CreateSearchDto } from '../dto/create-search.dto';
import { SearchEntity } from '../search.entity';

export interface ISearchRepository {
  create(_payload: CreateSearchDto): Promise<SearchEntity>;
  findById(_id: string): Promise<SearchEntity | null>;
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchEntity, SearchListEntity } from './search.entity';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async search(query: SearchQueryDto): Promise<SearchListEntity> {
    const q = query.q?.trim() ?? '';
    const normalized: SearchQueryDto = {
      q,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    };

    if (q.length > 240) {
      throw new BadRequestException('Search term must be 240 characters or fewer');
    }

    if (query.status) normalized.status = query.status;
    if (query.editorTypeId !== undefined) normalized.editorTypeId = query.editorTypeId;
    if (query.categoryId) normalized.categoryId = query.categoryId;
    if (query.scope) normalized.scope = query.scope;

    return this.repository.search(normalized);
  }

  async create(payload: { id?: string; title?: string; kind?: 'template' | 'category' }): Promise<SearchEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<SearchEntity | null> {
    return this.repository.findById(id);
  }
}

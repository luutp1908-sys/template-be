import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateSearchDto } from './dto/create-search.dto';
import { SearchEntity } from './search.entity';
import { ISearchRepository } from './interfaces/search.repository.interface';
import { SearchMapper } from './search.mapper';

@Injectable()
export class SearchRepository implements ISearchRepository {
  private readonly store = new InMemoryStore<SearchEntity>();

  async create(payload: CreateSearchDto): Promise<SearchEntity> {
    return this.store.create((base) =>
      SearchMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<SearchEntity | null> {
    return this.store.findById(id);
  }
}

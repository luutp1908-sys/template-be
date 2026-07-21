import { Injectable } from '@nestjs/common';
import { CreateSearchDto } from './dto/create-search.dto';
import { SearchEntity } from './search.entity';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async create(payload: CreateSearchDto): Promise<SearchEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<SearchEntity | null> {
    return this.repository.findById(id);
  }
}

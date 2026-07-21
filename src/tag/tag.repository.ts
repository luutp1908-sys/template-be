import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagEntity } from './tag.entity';
import { ITagRepository } from './interfaces/tag.repository.interface';
import { TagMapper } from './tag.mapper';

@Injectable()
export class TagRepository implements ITagRepository {
  private readonly store = new InMemoryStore<TagEntity>();

  async create(payload: CreateTagDto): Promise<TagEntity> {
    return this.store.create((base) =>
      TagMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<TagEntity | null> {
    return this.store.findById(id);
  }
}

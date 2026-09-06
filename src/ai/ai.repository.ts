import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { AiEntity } from './ai.entity';
import { CreateAiRecord, IAiRepository } from './interfaces/ai.repository.interface';
import { AiMapper } from './ai.mapper';

@Injectable()
export class AiRepository implements IAiRepository {
  private readonly store = new InMemoryStore<AiEntity>();

  async create(payload: CreateAiRecord): Promise<AiEntity> {
    return this.store.create((base) =>
      AiMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<AiEntity | null> {
    return this.store.findById(id);
  }
}

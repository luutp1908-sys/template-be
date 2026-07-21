import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateAiDto } from './dto/create-ai.dto';
import { AiEntity } from './ai.entity';
import { IAiRepository } from './interfaces/ai.repository.interface';
import { AiMapper } from './ai.mapper';

@Injectable()
export class AiRepository implements IAiRepository {
  private readonly store = new InMemoryStore<AiEntity>();

  async create(payload: CreateAiDto): Promise<AiEntity> {
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

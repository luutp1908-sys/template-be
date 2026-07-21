import { Injectable } from '@nestjs/common';
import { CreateAiDto } from './dto/create-ai.dto';
import { AiEntity } from './ai.entity';
import { AiRepository } from './ai.repository';

@Injectable()
export class AiService {
  constructor(private readonly repository: AiRepository) {}

  async create(payload: CreateAiDto): Promise<AiEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<AiEntity | null> {
    return this.repository.findById(id);
  }
}

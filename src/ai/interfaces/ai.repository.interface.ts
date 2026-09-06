import { AiEntity } from '../ai.entity';

export interface CreateAiRecord {
  name?: string;
}

export interface IAiRepository {
  create(_payload: CreateAiRecord): Promise<AiEntity>;
  findById(_id: string): Promise<AiEntity | null>;
}

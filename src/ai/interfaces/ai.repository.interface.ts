import { CreateAiDto } from '../dto/create-ai.dto';
import { AiEntity } from '../ai.entity';

export interface IAiRepository {
  create(_payload: CreateAiDto): Promise<AiEntity>;
  findById(_id: string): Promise<AiEntity | null>;
}

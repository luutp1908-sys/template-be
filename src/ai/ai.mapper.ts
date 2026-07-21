import { AiEntity } from './ai.entity';

export class AiMapper {
  static toEntity(partial: Partial<AiEntity>): AiEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

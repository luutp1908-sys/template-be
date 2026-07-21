import { TagEntity } from './tag.entity';

export class TagMapper {
  static toEntity(partial: Partial<TagEntity>): TagEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

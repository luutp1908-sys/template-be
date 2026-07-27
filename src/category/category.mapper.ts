import { CategoryEntity } from './category.entity';
import { randomUUID } from 'crypto';

export class CategoryMapper {
  static toEntity(partial: Partial<CategoryEntity>): CategoryEntity {
    return {
      // generate a UUID for new entities when id not provided
      id: partial.id ?? randomUUID(),
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    } as CategoryEntity;
  }
}

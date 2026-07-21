import { CategoryEntity } from './category.entity';

export class CategoryMapper {
  static toEntity(partial: Partial<CategoryEntity>): CategoryEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

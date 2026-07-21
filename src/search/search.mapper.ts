import { SearchEntity } from './search.entity';

export class SearchMapper {
  static toEntity(partial: Partial<SearchEntity>): SearchEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

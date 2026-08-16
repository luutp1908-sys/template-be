import { SearchEntity } from './search.entity';

export class SearchMapper {
  static toEntity(partial: Partial<SearchEntity>): SearchEntity {
    return {
      id: partial.id ?? '',
      title: partial.title || '',
      kind: partial.kind || 'template',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

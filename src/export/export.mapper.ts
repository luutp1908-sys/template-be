import { ExportEntity } from './export.entity';

export class ExportMapper {
  static toEntity(partial: Partial<ExportEntity>): ExportEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

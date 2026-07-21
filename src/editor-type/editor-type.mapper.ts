import { EditorTypeEntity } from './editor-type.entity';

export class EditorTypeMapper {
  static toEntity(partial: Partial<EditorTypeEntity>): EditorTypeEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

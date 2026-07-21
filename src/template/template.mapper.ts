import { TemplateEntity } from './template.entity';

export class TemplateMapper {
  static toEntity(partial: Partial<TemplateEntity>): TemplateEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

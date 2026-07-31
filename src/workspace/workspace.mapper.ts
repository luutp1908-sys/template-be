import { WorkspaceEntity } from './workspace.entity';

export class WorkspaceMapper {
  static toEntity(partial: Partial<WorkspaceEntity>): WorkspaceEntity {
    return {
      id: partial.id ?? '',
      name: partial.name ?? '',
      slug: partial.slug ?? '',
      type: partial.type ?? 'PERSONAL',
      description: partial.description ?? null,
      avatarUrl: partial.avatarUrl ?? null,
      isArchived: partial.isArchived ?? false,
      deletedAt: partial.deletedAt ?? null,
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

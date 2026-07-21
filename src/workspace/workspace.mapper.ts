import { WorkspaceEntity } from './workspace.entity';

export class WorkspaceMapper {
  static toEntity(partial: Partial<WorkspaceEntity>): WorkspaceEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}

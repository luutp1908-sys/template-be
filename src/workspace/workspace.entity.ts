export class WorkspaceEntity {
  id!: string;
  name!: string;
  slug!: string;
  type!: 'PERSONAL' | 'TEAM';
  description!: string | null;
  avatarUrl!: string | null;
  isArchived!: boolean;
  deletedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

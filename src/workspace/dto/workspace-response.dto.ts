export class WorkspaceResponseDto {
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

export class WorkspaceMemberResponseDto {
  id!: string;
  userId!: string;
  role!: string;
  workspaceId!: string;
  invitedBy!: string | null;
  joinedAt!: Date | null;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

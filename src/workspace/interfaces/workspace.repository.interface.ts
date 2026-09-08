import { WorkspaceEntity } from '../workspace.entity';

export type WorkspaceMembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type WorkspaceType = 'PERSONAL' | 'TEAM';

export interface CreateWorkspaceRecord {
  name?: string;
  type?: WorkspaceType;
  description?: string;
  avatarUrl?: string;
  isArchived?: boolean;
}

export interface UpdateWorkspaceRecord {
  name?: string;
  type?: WorkspaceType;
  description?: string;
  avatarUrl?: string;
  isArchived?: boolean;
}

export interface IWorkspaceRepository {
  create(_payload: CreateWorkspaceRecord, _createdByUserId?: string): Promise<WorkspaceEntity>;
  findMany(_userId: string): Promise<WorkspaceEntity[]>;
  findById(_id: string): Promise<WorkspaceEntity | null>;
  findMemberWorkspaceId(_userId: string, _workspaceId: string): Promise<string | null>;
  findFirstWorkspaceIdByUserId(_userId: string): Promise<string | null>;
  findWorkspaceIdsByUserId(_userId: string): Promise<string[]>;
  findMemberRole(_workspaceId: string, _userId: string): Promise<string | null>;
  findMembershipById(_workspaceId: string, _memberId: string): Promise<{ id: string; role: string; userId: string; workspaceId: string } | null>;
  createMember(_workspaceId: string, _userId: string, _role: WorkspaceMembershipRole, _invitedByUserId: string): Promise<unknown>;
  updateMemberRoleById(_memberId: string, _role: WorkspaceMembershipRole): Promise<unknown>;
  removeMemberById(_memberId: string): Promise<boolean>;
  findMembers(_workspaceId: string): Promise<unknown[]>;
  update(_id: string, _payload: UpdateWorkspaceRecord): Promise<WorkspaceEntity>;
  remove(_id: string): Promise<WorkspaceEntity>;
}

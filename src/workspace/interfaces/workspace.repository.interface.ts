import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from '../dto/invite-workspace-member.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspaceEntity } from '../workspace.entity';

export interface IWorkspaceRepository {
  create(_payload: CreateWorkspaceDto, _createdByUserId?: string): Promise<WorkspaceEntity>;
  findMany(_userId: string): Promise<WorkspaceEntity[]>;
  findById(_id: string): Promise<WorkspaceEntity | null>;
  update(_id: string, _payload: UpdateWorkspaceDto): Promise<WorkspaceEntity | null>;
  remove(_id: string): Promise<WorkspaceEntity | null>;
  inviteMember(_workspaceId: string, _payload: InviteWorkspaceMemberDto, _invitedByUserId: string): Promise<unknown>;
  updateMemberRole(_workspaceId: string, _memberId: string, _role: string, _actingUserId: string): Promise<unknown>;
  removeMember(_workspaceId: string, _memberId: string, _actingUserId: string): Promise<boolean>;
}

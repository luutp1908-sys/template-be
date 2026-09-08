import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/types/auth-user.type';
import { UserService } from '../user/user.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly userService: UserService,
  ) {}

  async create(payload: CreateWorkspaceDto, createdByUserId?: string): Promise<WorkspaceEntity> {
    return this.repository.create(payload, createdByUserId);
  }

  async findMany(user: AuthUser): Promise<WorkspaceEntity[]> {
    return this.repository.findMany(user.id);
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    return this.repository.findById(id);
  }

  async findMemberWorkspaceId(userId: string, workspaceId: string): Promise<string | null> {
    return this.repository.findMemberWorkspaceId(userId, workspaceId);
  }

  async findFirstWorkspaceIdByUserId(userId: string): Promise<string | null> {
    return this.repository.findFirstWorkspaceIdByUserId(userId);
  }

  async findWorkspaceIdsByUserId(userId: string): Promise<string[]> {
    return this.repository.findWorkspaceIdsByUserId(userId);
  }

  async findMembers(workspaceId: string): Promise<unknown[]> {
    const workspace = await this.repository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.repository.findMembers(workspaceId);
  }

  async update(id: string, payload: UpdateWorkspaceDto): Promise<WorkspaceEntity> {
    return this.repository.update(id, payload);
  }

  async remove(id: string): Promise<WorkspaceEntity> {
    return this.repository.remove(id);
  }

  async inviteMember(workspaceId: string, payload: InviteWorkspaceMemberDto, user: AuthUser): Promise<unknown> {
    const workspace = await this.repository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.type !== 'TEAM') {
      throw new ForbiddenException('Invitations are only supported for team workspaces');
    }

    const inviterRole = await this.repository.findMemberRole(workspaceId, user.id);
    if (!inviterRole || !['OWNER', 'ADMIN'].includes(inviterRole)) {
      throw new ForbiddenException('Only workspace owners and admins can invite members');
    }

    const invitedUser = await this.userService.findByEmail(payload.email);
    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    if (invitedUser.id === user.id) {
      throw new ConflictException('You cannot invite yourself');
    }

    const existingMembershipWorkspaceId = await this.repository.findMemberWorkspaceId(
      invitedUser.id,
      workspaceId,
    );
    if (existingMembershipWorkspaceId) {
      throw new ConflictException('User is already a member of this workspace');
    }

    return this.repository.createMember(workspaceId, invitedUser.id, 'MEMBER', user.id);
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: string, userId: string): Promise<unknown> {
    const actorRole = await this.repository.findMemberRole(workspaceId, userId);
    if (!actorRole || !['OWNER', 'ADMIN'].includes(actorRole)) {
      throw new ForbiddenException('Only workspace owners and admins can change member roles');
    }

    const targetMembership = await this.repository.findMembershipById(workspaceId, memberId);
    if (!targetMembership) {
      throw new NotFoundException('Workspace member not found');
    }

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('The workspace owner role cannot be changed');
    }

    const normalizedRole = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

    return this.repository.updateMemberRoleById(memberId, normalizedRole);
  }

  async removeMember(workspaceId: string, memberId: string, userId: string): Promise<boolean> {
    const actorRole = await this.repository.findMemberRole(workspaceId, userId);
    if (!actorRole || !['OWNER', 'ADMIN'].includes(actorRole)) {
      throw new ForbiddenException('Only workspace owners and admins can remove members');
    }

    const targetMembership = await this.repository.findMembershipById(workspaceId, memberId);
    if (!targetMembership) {
      throw new NotFoundException('Workspace member not found');
    }

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('The workspace owner cannot be removed');
    }

    return this.repository.removeMemberById(memberId);
  }
}
